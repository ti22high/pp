import { useEffect } from 'react';
import { useSelectionStore } from '@renderer/stores/selection';
import { copy, cut, duplicate, deleteSelected, selectAll } from '@renderer/lib/clipboard';

// Cmd/Ctrl+C / X / D / A для фигур + Del / Backspace. Вставку (Cmd+V) НЕ
// трогаем — её обрабатывает событие `paste` (useImageDropPaste), чтобы внешний
// буфер (картинка/таблица из Excel/Sheets) имел приоритет.
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

export function useShapeClipboard() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInTextField(e.target)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const sel = useSelectionStore.getState().selectedShapeIds;
        if (sel.length === 0) return;
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        copy();
      } else if (key === 'x') {
        e.preventDefault();
        cut();
      } else if (key === 'd') {
        e.preventDefault();
        duplicate();
      } else if (key === 'a' && !e.shiftKey) {
        e.preventDefault();
        selectAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
