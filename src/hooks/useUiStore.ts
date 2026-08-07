import { create } from 'zustand';

export type Screen = 'home' | 'host' | 'join' | 'game' | 'settings' | 'how-to-play';

interface UiStore {
  screen: Screen;
  goTo: (screen: Screen) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  screen: 'home',
  goTo: (screen) => set({ screen }),
}));
