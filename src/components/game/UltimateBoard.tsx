import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Player } from '../../types/game';
import { getLegalBoards } from '../../game/engine';
import { SmallBoardView } from './SmallBoardView';

interface UltimateBoardProps {
  state: GameState;
  localPlayer: Player | null;
  role: 'host' | 'guest' | null;
  onMove: (boardIndex: number, cellIndex: number) => void;
  animationsEnabled: boolean;
}

const WIN_LINE_COORDS: Record<number, [number, number]> = {
  0: [0, 0],
  1: [0, 1],
  2: [0, 2],
  3: [1, 0],
  4: [1, 1],
  5: [1, 2],
  6: [2, 0],
  7: [2, 1],
  8: [2, 2],
};

export function UltimateBoard({
  state,
  localPlayer,
  onMove,
  animationsEnabled,
}: UltimateBoardProps) {
  const legalBoards = getLegalBoards(state);

  const isMyTurn =
    localPlayer !== null &&
    state.currentTurn === localPlayer &&
    !state.winner;

  let lineGeometry: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null = null;

  if (state.winningLine?.length === 3) {
    const [start, , end] = state.winningLine;

    const [r1, c1] = WIN_LINE_COORDS[start];
    const [r2, c2] = WIN_LINE_COORDS[end];

    lineGeometry = {
      x1: (c1 + 0.5) * (100 / 3),
      y1: (r1 + 0.5) * (100 / 3),
      x2: (c2 + 0.5) * (100 / 3),
      y2: (r2 + 0.5) * (100 / 3),
    };
  }

  return (
    <div className="relative mx-auto w-full max-w-md aspect-square">
      <div
        className="
          grid
          h-full
          w-full
          grid-cols-3
          grid-rows-3
          gap-1.5
          rounded-3xl
          bg-gradient-to-br
          from-slate-200/80
          to-slate-300/50
          p-1.5
          shadow-inner
          dark:from-slate-800/80
          dark:to-slate-900/50
          sm:gap-2
          sm:p-2
        "
      >
        {state.boards.map((board, boardIndex) => (
          <SmallBoardView
            key={boardIndex}
            board={board}
            result={state.boardResults[boardIndex]}
            isActive={legalBoards.includes(boardIndex)}
            isPlayable={
              isMyTurn && legalBoards.includes(boardIndex)
            }
            onCellClick={(cellIndex) =>
              onMove(boardIndex, cellIndex)
            }
            animationsEnabled={animationsEnabled}
          />
        ))}
      </div>

      <AnimatePresence>
        {lineGeometry && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient
                id="winGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>

            <motion.line
              initial={
                animationsEnabled
                  ? { pathLength: 0 }
                  : false
              }
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.5,
                ease: 'easeOut',
              }}
              x1={lineGeometry.x1}
              y1={lineGeometry.y1}
              x2={lineGeometry.x2}
              y2={lineGeometry.y2}
              stroke="url(#winGradient)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </svg>
        )}
      </AnimatePresence>
    </div>
