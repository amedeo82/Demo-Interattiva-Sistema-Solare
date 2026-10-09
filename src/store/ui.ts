/**
 * Store globale minimo (zustand) per i flag che i componenti R3F dentro
 * <Canvas> devono leggere ad altissima frequenza senza causare re-render.
 */
import { create } from 'zustand';

interface UiStore {
  postFxEnabled: boolean;
  setPostFxEnabled: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  postFxEnabled: true,
  setPostFxEnabled: (v) => set({ postFxEnabled: v }),
}));
