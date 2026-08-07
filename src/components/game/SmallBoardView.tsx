import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import type { BoardResult, SmallBoard } from '../../types/game';
import { Cell } from './Cell';

interface SmallBoardViewProps {
  board: SmallBoard;
  result: BoardResult;
  isActive: boolean;
  isPlayable: boolean;
  onCellClick: (cellIndex: number) => void;
  animationsEnabled: boolean;
}

export function SmallBoardView({
  board,
  result,
  isActive,
  isPlayable,
  onCellClick,
  animationsEnabled,
}: SmallBoardViewProps) {
  const decided = result !== null;

  return (
    <div
      className={clsx(
        'relative rounded-2xl p-1.5 transition-all duration-300 sm:p-2',
        isActive && !decided && 'bg-indigo-100/80 ring-2 ring-indigo-400 dark:bg-indigo-950/50 dark:ring-indigo-500',
        !isActive && !decided && 'bg-slate-100/60 opacity-70 dark:bg-slate-800/40',
        decided && 'bg-slate-100/30 dark:bg-slate-800/20'
      )}
    >
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {board.map((value, i) => (
          <Cell
            key={i}
            value={value}
            onClick={() => onCellClick(i)}
            disabled={!isPlayable || decided}
            animationsEnabled={animationsEnabled}
          />
        ))}
      </div>

      <AnimatePresence>
        {decided && (
          <motion.div
            initial={animationsEnabled ? { opacity: 0, scale: 0.5 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={clsx(
              'absolute inset-0 flex items-center justify-center rounded-2xl text-4xl font-black backdrop-blur-[2px] sm:text-6xl',
              result === 'X' && 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400',
              result === 'O' && 'bg-rose-500/15 text-rose-500 dark:text-rose-400',
              result === 'DRAW' && 'bg-slate-400/15 text-slate-400'
            )}
            aria-label={result === 'DRAW' ? 'Board drawn' : `Board won by ${result}`}
          >
            {result === 'DRAW' ? '–' : result}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
