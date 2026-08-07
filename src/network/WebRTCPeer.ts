/**
 * Reusable WebRTC networking layer.
 *
 * Encapsulates peer creation, offer/answer generation, ICE handling,
 * the DataChannel, and low-level reconnect/retry plumbing. This class
 * knows nothing about Ultimate Tic-Tac-Toe — it just moves JSON messages
 * reliably between two browsers with no server in between.
 *
 * Connection flow (see also QR screens):
 *   Host:  createOffer()  -> QR encode  -> (scan answer) -> acceptAnswer()
 *   Guest: (scan offer)   -> createAnswer() -> QR encode -> waits for open
 */

import type { NetworkMessage, OfferPayload, AnswerPayload } from '../types/network';
import {
  STUN_SERVERS,
  collectIceCandidates,
  waitForIceGatheringComplete,
} from './iceUtils';

export type PeerRole = 'host' | 'guest';

export type PeerConnectionEvent =
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'reconnecting' }
  | { type: 'failed'; reason: string }
  | { type: 'message'; message: NetworkMessage };

type Listener = (event: PeerConnectionEvent) => void;

const DATA_CHANNEL_LABEL = 'uttt';
const RECONNECT_GRACE_MS = 2 * 60 * 1000; // 2 minutes, per spec.
const RECONNECT_RETRY_INTERVAL_MS = 2000;

export class WebRTCPeer {
  readonly role: PeerRole;
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private listeners = new Set<Listener>();
  private reconnectDeadline: number | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private outgoingQueue: NetworkMessage[] = [];

  constructor(role: PeerRole) {
    this.role = role;
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: PeerConnectionEvent) {
    this.listeners.forEach((l) => l(event));
  }

  private newPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: STUN_SERVERS,
      // Gather local (host/mDNS) candidates first; STUN srflx candidates
      // are still collected as a fallback for cross-network connections.
      iceCandidatePoolSize: 4,
    });
    pc.addEventListener('connectionstatechange', () => this.handleConnectionStateChange());
    return pc;
  }

  private handleConnectionStateChange() {
    if (!this.pc) return;
    const state = this.pc.connectionState;
    if (state === 'connected') {
      this.clearReconnectTimer();
      this.emit({ type: 'connected' });
      this.flushQueue();
    } else if (state === 'disconnected') {
      this.emit({ type: 'disconnected' });
      this.beginReconnectWindow();
    } else if (state === 'failed' || state === 'closed') {
      this.emit({ type: 'disconnected' });
      this.beginReconnectWindow();
    }
  }

  private beginReconnectWindow() {
    if (this.reconnectDeadline !== null) return; // already counting down
    this.reconnectDeadline = Date.now() + RECONNECT_GRACE_MS;
    this.emit({ type: 'reconnecting' });
    this.reconnectTimer = setInterval(() => {
      if (!this.reconnectDeadline) return;
      if (Date.now() >= this.reconnectDeadline) {
        this.clearReconnectTimer();
        this.emit({ type: 'failed', reason: 'Reconnection window expired.' });
        this.close();
        return;
      }
      // ICE restart attempt if the underlying connection still exists.
      if (this.pc && this.pc.connectionState !== 'connected') {
        this.pc.restartIce?.();
      }
    }, RECONNECT_RETRY_INTERVAL_MS);
  }

  private clearReconnectTimer() {
    this.reconnectDeadline = null;
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Milliseconds remaining in the reconnect grace window, or null if not reconnecting. */
  getReconnectMsRemaining(): number | null {
    if (this.reconnectDeadline === null) return null;
    return Math.max(0, this.reconnectDeadline - Date.now());
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.channel = channel;
    channel.addEventListener('open', () => {
      this.clearReconnectTimer();
      this.emit({ type: 'connected' });
      this.flushQueue();
    });
    channel.addEventListener('close', () => {
      this.emit({ type: 'disconnected' });
      this.beginReconnectWindow();
    });
    channel.addEventListener('message', (e) => {
      try {
        const message = JSON.parse(e.data) as NetworkMessage;
        this.emit({ type: 'message', message });
      } catch {
        // Ignore malformed frames rather than crashing the game.
      }
    });
  }

  /** HOST: creates an offer, waits for ICE gathering, returns a QR-ready payload. */
  async createOffer(roomId: string): Promise<OfferPayload> {
    this.pc = this.newPeerConnection();
    const channel = this.pc.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: true,
    });
    this.setupDataChannel(channel);

    const { candidates } = collectIceCandidates(this.pc);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(this.pc);

    return {
      v: 1,
      sdp: this.pc.localDescription!.sdp,
      candidates,
      roomId,
      createdAt: Date.now(),
    };
  }

  /** HOST: applies the guest's scanned answer to complete the handshake. */
  async acceptAnswer(answer: AnswerPayload): Promise<void> {
    if (!this.pc) throw new Error('No offer has been created yet.');
    this.emit({ type: 'connecting' });
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
    for (const c of answer.candidates) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {
        // Non-fatal: some candidates may be redundant or unusable.
      }
    }
  }

  /** GUEST: consumes the host's scanned offer, returns a QR-ready answer payload. */
  async createAnswer(offer: OfferPayload): Promise<AnswerPayload> {
    this.pc = this.newPeerConnection();
    this.pc.addEventListener('datachannel', (e) => this.setupDataChannel(e.channel));
    this.emit({ type: 'connecting' });

    const { candidates } = collectIceCandidates(this.pc);
    await this.pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    for (const c of offer.candidates) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {
        // Non-fatal.
      }
    }
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIceGatheringComplete(this.pc);

    return {
      v: 1,
      sdp: this.pc.localDescription!.sdp,
      candidates,
      roomId: offer.roomId,
      createdAt: Date.now(),
    };
  }

  /** Sends a message if the channel is open, otherwise queues it for delivery on reconnect. */
  send(message: NetworkMessage): void {
    if (this.channel && this.channel.readyState === 'open') {
      this.channel.send(JSON.stringify(message));
    } else {
      this.outgoingQueue.push(message);
    }
  }

  private flushQueue() {
    if (!this.channel || this.channel.readyState !== 'open') return;
    while (this.outgoingQueue.length > 0) {
      const msg = this.outgoingQueue.shift()!;
      this.channel.send(JSON.stringify(msg));
    }
  }

  get isConnected(): boolean {
    return this.channel?.readyState === 'open';
  }

  close(): void {
    this.clearReconnectTimer();
    this.channel?.close();
    this.pc?.close();
    this.channel = null;
    this.pc = null;
  }
}
