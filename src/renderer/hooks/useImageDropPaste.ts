import { useEffect } from 'react';
import { insertImageFromFile, insertImageFromDataUrl } from '@renderer/lib/insertImage';
import {
  isCsvFile,
  isXlsxFile,
  openCsvImport,
  openXlsxImport,
  insertTableFromRows,
  tableRowsFromClipboard,
  tableRowsFromHtmlText,
} from '@renderer/lib/csvImport';
import { paste as pasteShapes } from '@renderer/lib/clipboard';
import { useClipboardStore } from '@renderer/stores/clipboard';

// Drag-n-drop файлов + вставка из буфера (Cmd/Ctrl+V) на холст.
// Приоритет вставки: таблица (Excel/Sheets) → картинка → внутренние фигуры.
// Картинку/HTML читаем сначала из события (clipboardData), а если оно пустое —
// из системного буфера через Electron clipboard (надёжный фолбэк).
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

export function useImageDropPaste(): void {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      const image = list.find((f) => f.type.startsWith('image/'));
      if (image) {
        e.preventDefault();
        void insertImageFromFile(image);
        return;
      }
      const csv = list.find(isCsvFile);
      if (csv) {
        e.preventDefault();
        openCsvImport(csv);
        return;
      }
      const xlsx = list.find(isXlsxFile);
      if (xlsx) {
        e.preventDefault();
        openXlsxImport(xlsx);
      }
    };

    // Пытается вставить из системного буфера через Electron clipboard.
    // Возвращает true, если что-то вставлено.
    const pasteFromSystemClipboard = (): boolean => {
      const cb = window.api?.clipboard;
      if (!cb) return false;
      const tbl = tableRowsFromHtmlText(cb.readHTML(), cb.readText());
      if (tbl && (tbl.text.length > 1 || (tbl.text[0]?.length ?? 0) > 1)) {
        insertTableFromRows(tbl.text, tbl.fmt);
        return true;
      }
      const img = cb.readImage();
      if (img) {
        void insertImageFromDataUrl(img);
        return true;
      }
      return false;
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isInTextField(e.target)) return;
      const cd = e.clipboardData;
      // 1) Картинка прямо из события.
      if (cd) {
        for (const item of cd.items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') void insertImageFromDataUrl(reader.result);
              };
              reader.readAsDataURL(file);
            }
            return;
          }
        }
        // 2) Таблица из события (HTML/TSV).
        const tbl = tableRowsFromClipboard(cd);
        if (tbl && (tbl.text.length > 1 || (tbl.text[0]?.length ?? 0) > 1)) {
          e.preventDefault();
          insertTableFromRows(tbl.text, tbl.fmt);
          return;
        }
      }
      // 3) Событие пустое (бывает в Electron) — читаем системный буфер.
      if (pasteFromSystemClipboard()) {
        e.preventDefault();
        return;
      }
      // 4) Внешнего контента нет — внутренний буфер фигур.
      if (useClipboardStore.getState().shapes.length > 0) {
        e.preventDefault();
        pasteShapes();
      }
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, []);
}
