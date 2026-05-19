import { create } from 'zustand';
import type { Guide } from '@renderer/lib/snap';

// Активные направляющие, отображаемые во время drag/resize.
// Очищаются на mouseup. Отдельный стор, чтобы изменения guide-ов
// не дергали рендер дека/UI — только GuideLayer на Canvas.

interface GuideState {
  guides: Guide[];
  setGuides: (guides: Guide[]) => void;
  clear: () => void;
}

export const useGuidesStore = create<GuideState>((set) => ({
  guides: [],
  setGuides: (guides) => set({ guides }),
  clear: () => set({ guides: [] }),
}));
