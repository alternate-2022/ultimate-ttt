import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { CellValue } from '../../types/game';

interface CellProps {
  value: CellValue;
  onClick: () => void;
  disabled: boolean;
  animationsEnabled: boolean;
  highlight?: boolean;
}

export function Cell({ value, onClick, disabled, animationsEnabled, highlight }: CellProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || value !== null}
      aria-label={value ? `Cell occupied by ${value}` : 'Empty cell, tap to play'}
      className={clsx(
        'relative flex aspect-square min-h-[36px] items-center justify-center rounded-md text-lg font-bold transition-colors sm:text-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
        value === null && !disabled && 'bg-white/60 hover:bg-white active:scale-95 dark:bg-slate-700/50 dark:hover:bg-slate-700',
        value === null && disabled && 'bg-white/20 dark:bg-slate-800/30',
        value !== null && 'bg-transparent',
        highlight && 'ring-2 ring-amber-400'
      )}
    >
      {value && (
        <motion.span
          initial={animationsEnabled ? { scale: 0, rotate: -20 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={clsx(
            value === 'X' ? 'text-indigo-500 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'
          )}
        >
          {value}
        </motion.span>
      )}
    </button>
  );
}
