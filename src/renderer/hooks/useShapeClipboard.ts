import { useEffect } from 'react';
import { useSelectionStore } from '@renderer/stores/selection';
import { copy, cut, duplicate, deleteSelected, selectAll } from '@renderer/lib/clipboard';

// Cmd/Ctrl+C / X / V / D / A для фигур на канвасе + Del / Backspace.
// Игнорирует события из text-input / contenteditable, чтобы не конфликтовать
// с нативным копированием/вставкой текста в Inspector-полях и TipTap-оверлее.

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
      // Delete / Backspace — удаление выделенного (без модификаторов).
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
      } else if (key === 'v') {
        // Вставку (Cmd+V) НЕ перехватываем здесь — её целиком обрабатывает
        // событие `paste` (useImageDropPaste): сначала внешний буфер
        // (картинка/таблица из Excel/Sheets), а если его нет — внутренние
        // фигуры. Так внешний контент имеет приоритет над «застрявшим»
        // внутренним буфером.
        return;
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
