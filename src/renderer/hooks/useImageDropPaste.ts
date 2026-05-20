import { useEffect } from 'react';
import {
  insertImageFromFile,
  insertImageFromDataUrl,
} from '@renderer/lib/insertImage';
import { isCsvFile, openCsvImport } from '@renderer/lib/csvImport';

// Глобальные обработчики вставки изображений (Phase 3.1):
// - drag-n-drop файла-картинки в окно → вставка на активный слайд;
// - paste из буфера (Ctrl/Cmd+V), когда в буфере есть image/* — вставка
//   картинки. Текстовый paste и paste фигур (внутренний буфер) не трогаем:
//   если в clipboard есть картинка, считаем намерением вставить её.
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

export function useImageDropPaste(): void {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      // Разрешаем drop, только если тащат файлы.
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
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
      // CSV → диалог «Вставить как таблицу» (Phase 3.11).
      const csv = list.find(isCsvFile);
      if (csv) {
        e.preventDefault();
        openCsvImport(csv);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      // В текстовом поле / редакторе текста — нативный paste.
      if (isInTextField(e.target)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                void insertImageFromDataUrl(reader.result);
              }
            };
            reader.readAsDataURL(file);
          }
          return;
        }
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
