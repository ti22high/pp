import { useEffect } from 'react';
import { insertImageFromFile } from '@renderer/lib/insertImage';
import { isCsvFile, isXlsxFile, openCsvImport, openXlsxImport } from '@renderer/lib/csvImport';

// Drag-n-drop файлов в окно (Phase 3.1/3.11):
// - картинка → вставка на активный слайд;
// - .csv → диалог «Вставить как таблицу»;
// - .xlsx → диалог выбора листа/диапазона + графики.
// Вставка из буфера (Cmd/Ctrl+V) обрабатывается в useShapeClipboard через
// Electron clipboard (надёжнее DOM paste-события).
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

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}
