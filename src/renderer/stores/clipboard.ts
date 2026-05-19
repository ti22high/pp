import { create } from 'zustand';
import type { Shape } from '@renderer/lib/model/schema';

// Внутренний буфер обмена приложения. Хранит deep-copy фигур, готовых к
// вставке (с уже обнулёнными id — финальные UUID присваиваются при paste).
// OS-clipboard (Pasteboard / Windows clipboard) подключим позже — для
// интеропа с PowerPoint/Keynote (Phase 5+).

interface ClipboardState {
  shapes: Shape[];
  set: (shapes: Shape[]) => void;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  shapes: [],
  set: (shapes) => set({ shapes }),
  clear: () => set({ shapes: [] }),
}));
