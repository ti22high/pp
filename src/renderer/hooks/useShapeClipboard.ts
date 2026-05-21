import { useEffect } from 'react';
import { useSelectionStore } from '@renderer/stores/selection';
import { useClipboardStore } from '@renderer/stores/clipboard';
import { copy, cut, paste, duplicate, deleteSelected, selectAll } from '@renderer/lib/clipboard';
import { insertImageFromDataUrl } from '@renderer/lib/insertImage';
import { tableRowsFromHtmlText, insertTableFromRows } from '@renderer/lib/csvImport';

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
      } else if (key === 'v') {
        // Вставка через keydown (срабатывает надёжно, в отличие от DOM
        // paste-события на холсте в Electron). Читаем системный буфер через
        // Electron clipboard: таблица (Excel/Sheets) → картинка → внутренние
        // фигуры. preventDefault ставим только если что-то вставили — иначе
        // даём шанс сработать DOM paste-событию (useImageDropPaste).
        const cb = window.api?.clipboard;
        if (cb) {
          const tbl = tableRowsFromHtmlText(cb.readHTML(), cb.readText());
          if (tbl && (tbl.text.length > 1 || (tbl.text[0]?.length ?? 0) > 1)) {
            e.preventDefault();
            insertTableFromRows(tbl.text, tbl.fmt);
            return;
          }
          const img = cb.readImage();
          if (img) {
            e.preventDefault();
            void insertImageFromDataUrl(img);
            return;
          }
        }
        if (useClipboardStore.getState().shapes.length > 0) {
          e.preventDefault();
          paste();
        }
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
