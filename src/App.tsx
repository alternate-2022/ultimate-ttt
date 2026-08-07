import { useApplyTheme } from './hooks/useApplyTheme';
import { useUiStore } from './hooks/useUiStore';
import { HomeScreen } from './screens/HomeScreen';
import { HostScreen } from './screens/HostScreen';
import { JoinScreen } from './screens/JoinScreen';
import { GameScreen } from './screens/GameScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HowToPlayScreen } from './screens/HowToPlayScreen';

export default function App() {
  useApplyTheme();
  const screen = useUiStore((s) => s.screen);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 transition-colors dark:from-slate-950 dark:to-slate-900 dark:text-slate-50">
      {screen === 'home' && <HomeScreen />}
      {screen === 'host' && <HostScreen />}
      {screen === 'join' && <JoinScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'how-to-play' && <HowToPlayScreen />}
    </div>
  );
}
