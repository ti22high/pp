import { useEffect } from 'react';
import { useSelectionStore } from '@renderer/stores/selection';
import { useClipboardStore } from '@renderer/stores/clipboard';
import { copy, cut, paste, duplicate, deleteSelected, selectAll } from '@renderer/lib/clipboard';
import { insertImageFromDataUrl } from '@renderer/lib/insertImage';
import { tableRowsFromHtmlText, insertTableFromRows } from '@renderer/lib/csvImport';

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
        // Вставка читает СИСТЕМНЫЙ буфер через Electron clipboard (надёжнее
        // DOM paste-события, которое перехватывает пункт меню role:'paste').
        // Приоритет: таблица (Excel/Sheets) → картинка → внутренние фигуры.
        e.preventDefault();
        const cb = window.api?.clipboard;
        if (cb) {
          const tbl = tableRowsFromHtmlText(cb.readHTML(), cb.readText());
          if (tbl && (tbl.text.length > 1 || (tbl.text[0]?.length ?? 0) > 1)) {
            insertTableFromRows(tbl.text, tbl.fmt);
            return;
          }
          const img = cb.readImage();
          if (img) {
            void insertImageFromDataUrl(img);
            return;
          }
        }
        if (useClipboardStore.getState().shapes.length > 0) paste();
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
