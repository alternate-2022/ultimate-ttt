import { motion } from 'framer-motion';
import { Users, ScanLine, Settings as SettingsIcon, HelpCircle, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useUiStore } from '../hooks/useUiStore';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function HomeScreen() {
  const goTo = useUiStore((s) => s.goTo);
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between px-6 py-10">
      <div />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="grid grid-cols-3 gap-1.5 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 shadow-xl shadow-indigo-500/30">
          {['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'].map((v, i) => (
            <div
              key={i}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-sm font-bold text-white sm:h-9 sm:w-9"
            >
              {v}
            </div>
          ))}
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Ultimate
          </h1>
          <h1 className="text-3xl font-black tracking-tight text-indigo-500 sm:text-4xl">Tic-Tac-Toe</h1>
        </div>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          Local peer-to-peer multiplayer. No internet required after connecting. No accounts, ever.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <Button variant="primary" fullWidth icon={<Users className="h-5 w-5" />} onClick={() => goTo('host')}>
          Host Game
        </Button>
        <Button variant="secondary" fullWidth icon={<ScanLine className="h-5 w-5" />} onClick={() => goTo('join')}>
          Join Game
        </Button>
        <div className="mt-2 flex justify-center gap-2">
          <Button variant="ghost" icon={<HelpCircle className="h-4 w-4" />} onClick={() => goTo('how-to-play')}>
            How to Play
          </Button>
          <Button variant="ghost" icon={<SettingsIcon className="h-4 w-4" />} onClick={() => goTo('settings')}>
            Settings
          </Button>
        </div>
        {canInstall && (
          <Button variant="ghost" fullWidth icon={<Download className="h-4 w-4" />} onClick={promptInstall}>
            Install App
          </Button>
        )}
      </motion.div>
    </div>
  );
}
