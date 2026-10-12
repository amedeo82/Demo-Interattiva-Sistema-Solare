/**
 * Store globale minimo (zustand) per i flag che i componenti R3F dentro
 * <Canvas> devono leggere ad altissima frequenza senza causare re-render.
 */
import { create } from 'zustand';

interface UiStore {
  postFxEnabled: boolean;
  setPostFxEnabled: (v: boolean) => void;
  /** S14 · F7 — true mentre la narrazione TTS sta leggendo: AmbientAudio
   *  abbassa il volume (ducking −12dB) per lasciare spazio alla voce. */
  narrationActive: boolean;
  setNarrationActive: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  postFxEnabled: true,
  setPostFxEnabled: (v) => set({ postFxEnabled: v }),
  narrationActive: false,
  setNarrationActive: (v) => set({ narrationActive: v }),
}));
