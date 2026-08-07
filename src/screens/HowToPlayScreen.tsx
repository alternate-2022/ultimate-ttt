import { ArrowLeft } from 'lucide-react';
import { useUiStore } from '../hooks/useUiStore';

const STEPS = [
  {
    title: 'The big picture',
    body: 'The board is a 3x3 grid of small tic-tac-toe boards. Win small boards to claim squares on the big board — win three in a row on the big board to win the game.',
  },
  {
    title: 'Where you must play',
    body: 'Your move determines which small board your opponent must play in next. If you play in the top-right cell of any board, your opponent must play in the top-right board.',
  },
  {
    title: 'Free choice',
    body: 'If the board you are sent to is already won or drawn, you may play in any open board instead.',
  },
  {
    title: 'Winning a small board',
    body: 'Three in a row — horizontally, vertically, or diagonally — claims that board for you, just like regular tic-tac-toe.',
  },
  {
    title: 'Winning the game',
    body: 'Claim three small boards in a row on the big board to win. If all boards are decided with no winner, the game is a draw.',
  },
];

export function HowToPlayScreen() {
  const goTo = useUiStore((s) => s.goTo);

  return (
    <div className="min-h-[100dvh] px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => goTo('home')} aria-label="Back" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">How to Play</h1>
      </div>

      <div className="space-y-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{s.title}</h2>
            </div>
            <p className="pl-8 text-sm text-slate-500 dark:text-slate-400">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
