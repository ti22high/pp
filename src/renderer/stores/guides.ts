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

// Сравнение содержимого двух массивов guide-ов — нужно, чтобы во время
// drag-а не пушить идентичный массив в стор: каждый new-объект триггерит
// re-render GuideLayer + Layer.batchDraw, и при 60Hz drag-е это лишний draw.
function equalGuides(a: Guide[], b: Guide[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.kind !== y.kind || x.pos !== y.pos) return false;
  }
  return true;
}

export const useGuidesStore = create<GuideState>((set, get) => ({
  guides: [],
  setGuides: (guides) => {
    if (equalGuides(get().guides, guides)) return;
    set({ guides });
  },
  clear: () => {
    if (get().guides.length === 0) return;
    set({ guides: [] });
  },
}));

