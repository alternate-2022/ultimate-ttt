import { ArrowLeft, Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { useUiStore } from '../hooks/useUiStore';
import { useSettingsStore, type ThemeMode } from '../hooks/useSettingsStore';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        'relative h-8 w-14 rounded-full transition-colors',
        checked ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'
      )}
    >
      <span
        className={clsx(
          'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-7' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  const goTo = useUiStore((s) => s.goTo);
  const settings = useSettingsStore();

  const themes: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { mode: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { mode: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ];

  return (
    <div className="min-h-[100dvh] px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => goTo('home')} aria-label="Back" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Appearance</p>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.mode}
              onClick={() => settings.setTheme(t.mode)}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 py-3 text-xs font-medium',
                settings.theme === t.mode
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40'
                  : 'border-slate-100 text-slate-500 dark:border-slate-800'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Row label="Animations">
          <Toggle checked={settings.animationsEnabled} onChange={settings.toggleAnimations} label="Animations" />
        </Row>
        <Row label="Sound">
          <Toggle checked={settings.soundEnabled} onChange={settings.toggleSound} label="Sound" />
        </Row>
        <Row label="Haptics">
          <Toggle checked={settings.hapticsEnabled} onChange={settings.toggleHaptics} label="Haptics" />
        </Row>
        <Row label="High contrast">
          <Toggle checked={settings.highContrast} onChange={settings.toggleHighContrast} label="High contrast" />
        </Row>
      </div>
    </div>
  );
}
