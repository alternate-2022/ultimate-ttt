/**
 * Central Zustand store. Wires the pure game engine to the WebRTC layer.
 *
 * HOST AUTHORITY: the host is the only party whose local `applyMove` calls
 * are trusted. The guest sends MOVE_REQUEST and waits for the host to
 * broadcast NEW_STATE — it never mutates board state on its own.
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { GameState, Player } from '../types/game';
import { createInitialGameState } from '../types/game';
import { applyMove, isLegalMove } from '../game/engine';
import { WebRTCPeer, type PeerRole } from '../network/WebRTCPeer';
import { protocol } from '../network/protocol';
import type { ConnectionState, NetworkMessage } from '../types/network';

export interface ChatEntry {
  id: string;
  from: Player;
  text: string;
  ts: number;
}

interface GameStore {
  // --- identity / role ---
  role: PeerRole | null;
  localPlayer: Player | null;
  reconnectToken: string;
  opponentConnected: boolean;

  // --- networking ---
  peer: WebRTCPeer | null;
  connectionState: ConnectionState;
  latencyMs: number | null;
  reconnectMsRemaining: number | null;

  // --- game ---
  state: GameState;

  // --- chat ---
  chat: ChatEntry[];
  unreadChat: number;
  opponentTyping: boolean;

  // --- actions ---
  initHost: () => WebRTCPeer;
  initGuest: () => WebRTCPeer;
  attachMessageHandling: () => void;
  requestMove: (boardIndex: number, cellIndex: number) => void;
  sendChat: (text: string) => void;
  setTyping: (isTyping: boolean) => void;
  markChatRead: () => void;
  requestRematch: () => void;
  reset: () => void;
  measureLatency: () => void;
}

let pingInterval: ReturnType<typeof setInterval> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  role: null,
  localPlayer: null,
  reconnectToken: uuid(),
  opponentConnected: false,

  peer: null,
  connectionState: 'idle',
  latencyMs: null,
  reconnectMsRemaining: null,

  state: createInitialGameState(),

  chat: [],
  unreadChat: 0,
  opponentTyping: false,

  initHost: () => {
    const peer = new WebRTCPeer('host');
    set({
      role: 'host',
      localPlayer: 'X',
      peer,
      state: createInitialGameState(),
      connectionState: 'idle',
    });
    get().attachMessageHandling();
    return peer;
  },

  initGuest: () => {
    const peer = new WebRTCPeer('guest');
    set({ role: 'guest', localPlayer: 'O', peer, connectionState: 'idle' });
    get().attachMessageHandling();
    return peer;
  },

  attachMessageHandling: () => {
    const peer = get().peer;
    if (!peer) return;

    peer.on((event) => {
      switch (event.type) {
        case 'connecting':
          set({ connectionState: 'connecting' });
          break;
        case 'connected':
          set({ connectionState: 'connected', opponentConnected: true, reconnectMsRemaining: null });
          get().measureLatency();
          break;
        case 'disconnected':
          set({ opponentConnected: false });
          break;
        case 'reconnecting':
          set({ connectionState: 'reconnecting' });
          break;
        case 'failed':
          set({ connectionState: 'failed', opponentConnected: false });
          break;
        case 'message':
          handleMessage(event.message, set, get);
          break;
      }
    });

    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => get().measureLatency(), 5000);
  },

  measureLatency: () => {
    const { peer, connectionState } = get();
    if (!peer || connectionState !== 'connected') return;
    peer.send(protocol.ping(Date.now()));
  },

  requestMove: (boardIndex, cellIndex) => {
    const { role, localPlayer, state, peer } = get();
    if (!localPlayer || !peer) return;

    if (role === 'host') {
      // Host applies moves immediately and authoritatively.
      const legality = isLegalMove(state, boardIndex, cellIndex, localPlayer);
      if (!legality.legal) return;
      const newState = applyMove(state, boardIndex, cellIndex, localPlayer);
      set({ state: newState });
      peer.send(protocol.newState(newState, newState.moveHistory.at(-1) ?? null));
      if (newState.winner) {
        peer.send(protocol.gameOver(newState.winner));
      }
    } else {
      // Guest only ever *requests* — never mutates local state optimistically.
      peer.send(protocol.moveRequest(boardIndex, cellIndex, uuid()));
    }
  },

  sendChat: (text) => {
    const { localPlayer, peer, chat } = get();
    if (!localPlayer || !peer || !text.trim()) return;
    const entry: ChatEntry = { id: uuid(), from: localPlayer, text: text.trim(), ts: Date.now() };
    set({ chat: [...chat, entry] });
    peer.send(protocol.chat(entry.id, localPlayer, entry.text));
  },

  setTyping: (isTyping) => {
    const { localPlayer, peer } = get();
    if (!localPlayer || !peer) return;
    peer.send(protocol.typing(localPlayer, isTyping));
  },

  markChatRead: () => set({ unreadChat: 0 }),

  requestRematch: () => {
    const { role, peer, localPlayer } = get();
    if (!peer) return;
    if (role === 'host') {
      const fresh = createInitialGameState();
      set({ state: fresh });
      peer.send(protocol.rematchAccept(fresh));
    } else {
      peer.send(protocol.rematchRequest());
    }
    void localPlayer;
  },

  reset: () => {
    get().peer?.close();
    if (pingInterval) clearInterval(pingInterval);
    set({
      role: null,
      localPlayer: null,
      peer: null,
      connectionState: 'idle',
      state: createInitialGameState(),
      chat: [],
      unreadChat: 0,
      opponentConnected: false,
      latencyMs: null,
      reconnectMsRemaining: null,
    });
  },
}));

function handleMessage(
  message: NetworkMessage,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
) {
  const { role, state, chat, peer, localPlayer } = get();

  switch (message.type) {
    case 'MOVE_REQUEST': {
      // Only the host acts on move requests.
      if (role !== 'host' || !peer) return;
      const player: Player = 'O'; // guest is always O in this simple 1v1 model
      const legality = isLegalMove(state, message.boardIndex, message.cellIndex, player);
      if (!legality.legal) return;
      const newState = applyMove(state, message.boardIndex, message.cellIndex, player);
      set({ state: newState });
      peer.send(protocol.newState(newState, newState.moveHistory.at(-1) ?? null, message.requestId));
      if (newState.winner) {
        peer.send(protocol.gameOver(newState.winner));
      }
      break;
    }
    case 'NEW_STATE':
      set({ state: message.state });
      break;
    case 'STATE_SYNC':
      set({ state: message.state });
      break;
    case 'PING':
      peer?.send(protocol.pong(message.nonce));
      break;
    case 'PONG':
      set({ latencyMs: Date.now() - message.nonce });
      break;
    case 'REMATCH_REQUEST':
      if (role === 'host' && peer) {
        const fresh = createInitialGameState();
        set({ state: fresh });
        peer.send(protocol.rematchAccept(fresh));
      }
      break;
    case 'REMATCH_ACCEPT':
      set({ state: message.state });
      break;
    case 'CHAT': {
      const entry: ChatEntry = { id: message.id, from: message.from, text: message.text, ts: message.ts };
      set({ chat: [...chat, entry], unreadChat: get().unreadChat + 1 });
      break;
    }
    case 'TYPING':
      set({ opponentTyping: message.isTyping });
      break;
    case 'DISCONNECT':
      set({ opponentConnected: false });
      break;
    default:
      break;
  }
  void localPlayer;
}
