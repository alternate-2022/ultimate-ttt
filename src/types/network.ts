/**
 * Wire protocol shared between host and guest over the WebRTC DataChannel.
 * Every message is a small, flat, JSON-serializable object to minimize bandwidth.
 */

import type { GameState, Move, Player } from './game';

export type MessageType =
  | 'JOIN'
  | 'JOIN_ACK'
  | 'MOVE_REQUEST'
  | 'NEW_STATE'
  | 'STATE_SYNC'
  | 'PING'
  | 'PONG'
  | 'GAME_OVER'
  | 'REMATCH_REQUEST'
  | 'REMATCH_ACCEPT'
  | 'CHAT'
  | 'TYPING'
  | 'DISCONNECT'
  | 'RECONNECT'
  | 'RECONNECT_ACK'
  | 'ERROR';

export interface BaseMessage {
  type: MessageType;
  /** Local send timestamp, used for latency measurement. */
  ts: number;
}

export interface JoinMessage extends BaseMessage {
  type: 'JOIN';
  name: string;
  reconnectToken: string;
}

export interface JoinAckMessage extends BaseMessage {
  type: 'JOIN_ACK';
  assignedPlayer: Player;
  state: GameState;
  hostName: string;
  reconnectToken: string;
}

export interface MoveRequestMessage extends BaseMessage {
  type: 'MOVE_REQUEST';
  boardIndex: number;
  cellIndex: number;
  /** Client-side optimistic id so the guest can reconcile its own request. */
  requestId: string;
}

export interface NewStateMessage extends BaseMessage {
  type: 'NEW_STATE';
  state: GameState;
  lastMove: Move | null;
  requestId?: string;
}

export interface StateSyncMessage extends BaseMessage {
  type: 'STATE_SYNC';
  state: GameState;
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
  nonce: number;
}

export interface PongMessage extends BaseMessage {
  type: 'PONG';
  nonce: number;
}

export interface GameOverMessage extends BaseMessage {
  type: 'GAME_OVER';
  winner: Player | 'DRAW';
}

export interface RematchRequestMessage extends BaseMessage {
  type: 'REMATCH_REQUEST';
}

export interface RematchAcceptMessage extends BaseMessage {
  type: 'REMATCH_ACCEPT';
  state: GameState;
}

export interface ChatMessage extends BaseMessage {
  type: 'CHAT';
  id: string;
  from: Player;
  text: string;
}

export interface TypingMessage extends BaseMessage {
  type: 'TYPING';
  from: Player;
  isTyping: boolean;
}

export interface DisconnectMessage extends BaseMessage {
  type: 'DISCONNECT';
  reason: string;
}

export interface ReconnectMessage extends BaseMessage {
  type: 'RECONNECT';
  reconnectToken: string;
}

export interface ReconnectAckMessage extends BaseMessage {
  type: 'RECONNECT_ACK';
  accepted: boolean;
  state?: GameState;
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export type NetworkMessage =
  | JoinMessage
  | JoinAckMessage
  | MoveRequestMessage
  | NewStateMessage
  | StateSyncMessage
  | PingMessage
  | PongMessage
  | GameOverMessage
  | RematchRequestMessage
  | RematchAcceptMessage
  | ChatMessage
  | TypingMessage
  | DisconnectMessage
  | ReconnectMessage
  | ReconnectAckMessage
  | ErrorMessage;

export type ConnectionState =
  | 'idle'
  | 'creating-offer'
  | 'awaiting-answer'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

/** Payload encoded into the host's QR code (the SDP offer + candidates). */
export interface OfferPayload {
  v: 1;
  sdp: string;
  candidates: RTCIceCandidateInit[];
  roomId: string;
  createdAt: number;
}

/** Payload encoded into the guest's QR code (the SDP answer + candidates). */
export interface AnswerPayload {
  v: 1;
  sdp: string;
  candidates: RTCIceCandidateInit[];
  roomId: string;
  createdAt: number;
}
