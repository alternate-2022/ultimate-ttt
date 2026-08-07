import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsStore {
  theme: ThemeMode;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  highContrast: boolean;
  setTheme: (t: ThemeMode) => void;
  toggleAnimations: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleHighContrast: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'system',
      animationsEnabled: true,
      soundEnabled: true,
      hapticsEnabled: true,
      highContrast: false,
      setTheme: (theme) => set({ theme }),
      toggleAnimations: () => set((s) => ({ animationsEnabled: !s.animationsEnabled })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
    }),
    { name: 'uttt-settings' }
  )
);
