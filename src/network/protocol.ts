/**
 * Typed factory functions for every message on the wire. Centralizing
 * construction here keeps the `ts` timestamp and shape consistent and
 * makes the protocol easy to extend without hunting through call sites.
 */
import type {
  ChatMessage,
  DisconnectMessage,
  GameOverMessage,
  JoinAckMessage,
  JoinMessage,
  MoveRequestMessage,
  NewStateMessage,
  PingMessage,
  PongMessage,
  ReconnectAckMessage,
  ReconnectMessage,
  RematchAcceptMessage,
  RematchRequestMessage,
  StateSyncMessage,
  TypingMessage,
} from '../types/network';
import type { GameState, Move, Player } from '../types/game';

const now = () => Date.now();

export const protocol = {
  join(name: string, reconnectToken: string): JoinMessage {
    return { type: 'JOIN', ts: now(), name, reconnectToken };
  },
  joinAck(
    assignedPlayer: Player,
    state: GameState,
    hostName: string,
    reconnectToken: string
  ): JoinAckMessage {
    return { type: 'JOIN_ACK', ts: now(), assignedPlayer, state, hostName, reconnectToken };
  },
  moveRequest(boardIndex: number, cellIndex: number, requestId: string): MoveRequestMessage {
    return { type: 'MOVE_REQUEST', ts: now(), boardIndex, cellIndex, requestId };
  },
  newState(state: GameState, lastMove: Move | null, requestId?: string): NewStateMessage {
    return { type: 'NEW_STATE', ts: now(), state, lastMove, requestId };
  },
  stateSync(state: GameState): StateSyncMessage {
    return { type: 'STATE_SYNC', ts: now(), state };
  },
  ping(nonce: number): PingMessage {
    return { type: 'PING', ts: now(), nonce };
  },
  pong(nonce: number): PongMessage {
    return { type: 'PONG', ts: now(), nonce };
  },
  gameOver(winner: Player | 'DRAW'): GameOverMessage {
    return { type: 'GAME_OVER', ts: now(), winner };
  },
  rematchRequest(): RematchRequestMessage {
    return { type: 'REMATCH_REQUEST', ts: now() };
  },
  rematchAccept(state: GameState): RematchAcceptMessage {
    return { type: 'REMATCH_ACCEPT', ts: now(), state };
  },
  chat(id: string, from: Player, text: string): ChatMessage {
    return { type: 'CHAT', ts: now(), id, from, text };
  },
  typing(from: Player, isTyping: boolean): TypingMessage {
    return { type: 'TYPING', ts: now(), from, isTyping };
  },
  disconnect(reason: string): DisconnectMessage {
    return { type: 'DISCONNECT', ts: now(), reason };
  },
  reconnect(reconnectToken: string): ReconnectMessage {
    return { type: 'RECONNECT', ts: now(), reconnectToken };
  },
  reconnectAck(accepted: boolean, state?: GameState): ReconnectAckMessage {
    return { type: 'RECONNECT_ACK', ts: now(), accepted, state };
  },
};
