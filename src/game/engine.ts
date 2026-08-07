/**
 * Ultimate Tic-Tac-Toe game engine.
 *
 * Pure TypeScript, zero React/network dependencies, fully unit-testable.
 * The host is the only party that should call `applyMove`; the guest only
 * calls `isLegalMove` for local UI hinting (e.g. dimming illegal boards)
 * and otherwise trusts state broadcast by the host.
 */

import type {
  BoardResult,
  CellValue,
  GameState,
  Index0to8,
  Move,
  Player,
  SmallBoard,
} from '../types/game';
import { createInitialGameState } from '../types/game';

/** All 8 winning lines on a 3x3 grid, expressed as cell/board index triples. */
export const WIN_LINES: readonly [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Returns the winning player of a 3x3 grid of values, or null. */
function checkGridWinner(cells: readonly CellValue[]): Player | null {
  for (const [a, b, c] of WIN_LINES) {
    const v = cells[a];
    if (v && v === cells[b] && v === cells[c]) {
      return v;
    }
  }
  return null;
}

/** Returns the winning line indices for a 3x3 grid of values, or null. */
function findWinningLine(cells: readonly CellValue[]): Index0to8[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const v = cells[a];
    if (v && v === cells[b] && v === cells[c]) {
      return [...line];
    }
  }
  return null;
}

/** Determines whether a small board is fully occupied (used for draw detection). */
function isBoardFull(cells: readonly CellValue[]): boolean {
  return cells.every((c) => c !== null);
}

/** Computes the result of a single small board from its cells. */
export function computeBoardResult(cells: readonly CellValue[]): BoardResult {
  const winner = checkGridWinner(cells);
  if (winner) return winner;
  if (isBoardFull(cells)) return 'DRAW';
  return null;
}

/**
 * Computes the overall winner given the nine small-board results.
 * Treats DRAW boards as neutral (neither player's mark) for the purpose
 * of the meta-board win check.
 */
export function computeMetaResult(boardResults: readonly BoardResult[]): {
  winner: BoardResult;
  winningLine: Index0to8[] | null;
} {
  const metaCells: CellValue[] = boardResults.map((r) => (r === 'DRAW' ? null : r));
  const winner = checkGridWinner(metaCells);
  if (winner) {
    return { winner, winningLine: findWinningLine(metaCells) };
  }
  if (boardResults.every((r) => r !== null)) {
    return { winner: 'DRAW', winningLine: null };
  }
  return { winner: null, winningLine: null };
}

/**
 * Determines whether a given move is legal against the current state.
 * This is the single source of truth for legality and is used both by
 * the host (authoritative) and by the client (for UI hints only).
 */
export function isLegalMove(
  state: GameState,
  boardIndex: Index0to8,
  cellIndex: Index0to8,
  player: Player
): { legal: true } | { legal: false; reason: string } {
  if (state.winner) {
    return { legal: false, reason: 'Game already finished.' };
  }
  if (boardIndex < 0 || boardIndex > 8 || cellIndex < 0 || cellIndex > 8) {
    return { legal: false, reason: 'Index out of range.' };
  }
  if (player !== state.currentTurn) {
    return { legal: false, reason: 'Not your turn.' };
  }
  if (state.activeBoard !== null && state.activeBoard !== boardIndex) {
    return { legal: false, reason: 'Must play in the active board.' };
  }
  if (state.boardResults[boardIndex] !== null) {
    return { legal: false, reason: 'That board is already decided.' };
  }
  if (state.boards[boardIndex][cellIndex] !== null) {
    return { legal: false, reason: 'That cell is already occupied.' };
  }
  return { legal: true };
}

/** Returns which boards a player may legally place their next mark into. */
export function getLegalBoards(state: GameState): Index0to8[] {
  if (state.winner) return [];
  if (state.activeBoard !== null && state.boardResults[state.activeBoard] === null) {
    return [state.activeBoard];
  }
  const legal: Index0to8[] = [];
  for (let i = 0; i < 9; i++) {
    if (state.boardResults[i] === null) legal.push(i);
  }
  return legal;
}

/**
 * Applies a move to the given state, returning a brand-new GameState.
 * Does NOT mutate the input. Caller must have already validated legality
 * via `isLegalMove` — this function will throw if the move is illegal,
 * so the host should always check first and never call this speculatively.
 */
export function applyMove(
  state: GameState,
  boardIndex: Index0to8,
  cellIndex: Index0to8,
  player: Player
): GameState {
  const legality = isLegalMove(state, boardIndex, cellIndex, player);
  if (!legality.legal) {
    throw new Error(`Illegal move: ${legality.reason}`);
  }

  // Deep-clone only what changes.
  const boards: SmallBoard[] = state.boards.map((b, i) =>
    i === boardIndex ? b.map((c, j) => (j === cellIndex ? player : c)) : b
  );

  const newBoardResult = computeBoardResult(boards[boardIndex]);
  const boardResults: BoardResult[] = state.boardResults.map((r, i) =>
    i === boardIndex ? newBoardResult : r
  );

  const { winner, winningLine } = computeMetaResult(boardResults);

  // Determine next active board: the cell index of the move maps to the
  // next board. If that board is already decided, the next player may
  // play anywhere (activeBoard = null).
  const nextBoardCandidate = cellIndex;
  const nextActiveBoard =
    boardResults[nextBoardCandidate] === null ? nextBoardCandidate : null;

  const move: Move = {
    boardIndex,
    cellIndex,
    player,
    seq: state.seq + 1,
    timestamp: Date.now(),
  };

  return {
    boards,
    boardResults,
    currentTurn: player === 'X' ? 'O' : 'X',
    activeBoard: winner ? state.activeBoard : nextActiveBoard,
    winner,
    moveHistory: [...state.moveHistory, move],
    winningLine,
    seq: state.seq + 1,
  };
}

/** Convenience factory re-exported for callers that only need the engine. */
export { createInitialGameState };

/** Deterministically replays a move history onto a fresh state — useful for verifying sync. */
export function replayHistory(history: readonly Move[]): GameState {
  let state = createInitialGameState();
  for (const m of history) {
    state = applyMove(state, m.boardIndex, m.cellIndex, m.player);
  }
  return state;
}
