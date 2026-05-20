import { create } from 'zustand';

// Мост между CropOverlay (где живёт логика применения кропа и состояние
// рамки) и кнопками вне Stage (ImageInspector). CropOverlay регистрирует
// здесь свои commit/cancel; кнопки их вызывают.
interface CropBridgeState {
  commit: (() => void) | null;
  cancel: (() => void) | null;
  setHandlers: (commit: (() => void) | null, cancel: (() => void) | null) => void;
}

export const useCropBridge = create<CropBridgeState>((set) => ({
  commit: null,
  cancel: null,
  setHandlers: (commit, cancel) => set({ commit, cancel }),
}));
