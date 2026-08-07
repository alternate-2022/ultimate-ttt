/**
 * Core type definitions for Ultimate Tic-Tac-Toe.
 * Pure data shapes — no logic lives here.
 */

export type Player = 'X' | 'O';

/** Contents of a single cell within a small board. */
export type CellValue = Player | null;

/** Outcome of a small board: who claimed it, drawn, or still in play. */
export type BoardResult = Player | 'DRAW' | null;

/** A small 3x3 board is nine cells, indexed 0-8 (row-major). */
export type SmallBoard = CellValue[];

/** Index of a cell or board, 0-8. */
export type Index0to8 = number;

/** A move targets a specific board and cell within it. */
export interface Move {
  boardIndex: Index0to8;
  cellIndex: Index0to8;
  player: Player;
  /** Monotonically increasing sequence number assigned by the host. */
  seq: number;
  timestamp: number;
}

/** The full authoritative game state. */
export interface GameState {
  /** Nine small boards, each nine cells. */
  boards: SmallBoard[];
  /** Result of each small board. */
  boardResults: BoardResult[];
  /** Whose turn it is. */
  currentTurn: Player;
  /** Which board the current player must play in, or null if free choice. */
  activeBoard: Index0to8 | null;
  /** Overall winner, draw, or null if still in progress. */
  winner: BoardResult;
  /** Full ordered move history. */
  moveHistory: Move[];
  /** Winning line of board indices, if the game has been won. */
  winningLine: Index0to8[] | null;
  /** Sequence counter — every applied move increments this. */
  seq: number;
}

/** Which symbol each connected peer plays as. */
export interface PlayerAssignment {
  host: Player;
  guest: Player;
}

export function createEmptyBoards(): SmallBoard[] {
  return Array.from({ length: 9 }, () => Array<CellValue>(9).fill(null));
}

export function createInitialGameState(): GameState {
  return {
    boards: createEmptyBoards(),
    boardResults: Array<BoardResult>(9).fill(null),
    currentTurn: 'X',
    activeBoard: null,
    winner: null,
    moveHistory: [],
    winningLine: null,
    seq: 0,
  };
}
