import { useEffect } from 'react';
import { useUiStore } from '@renderer/stores/ui';
import { insertTableFromRows } from '@renderer/lib/csvImport';

const PREVIEW_ROWS = 6;
const PREVIEW_COLS = 8;

// Диалог «Вставить как таблицу» (Phase 3.11): подтверждение импорта CSV.
// Показывает размер и превью первых ячеек; по «Вставить» создаёт таблицу.
export function CsvImportDialog() {
  const rows = useUiStore((s) => s.csvImportRows);
  const setRows = useUiStore((s) => s.setCsvImportRows);

  useEffect(() => {
    if (!rows) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRows(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, setRows]);

  if (!rows) return null;

  const nRows = rows.length;
  const nCols = Math.max(1, ...rows.map((r) => r.length));
  const previewRows = rows.slice(0, PREVIEW_ROWS);

  const insert = () => {
    insertTableFromRows(rows);
    setRows(null);
  };

  return (
    <div className="modal-backdrop" onClick={() => setRows(null)}>
      <div className="modal modal--hyperlink" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Вставить как таблицу</h2>
          <button className="modal__close" onClick={() => setRows(null)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <p className="meta">
            Обнаружено: {nRows} строк × {nCols} столбцов
          </p>
          <div className="csv-preview">
            <table>
              <tbody>
                {previewRows.map((r, ri) => (
                  <tr key={ri}>
                    {Array.from({ length: Math.min(nCols, PREVIEW_COLS) }, (_, ci) => (
                      <td key={ci}>{r[ci] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(nRows > PREVIEW_ROWS || nCols > PREVIEW_COLS) && (
              <p className="meta">…показаны первые ячейки</p>
            )}
          </div>
        </div>

        <footer className="slide-size__footer">
          <button
            type="button"
            className="slide-size__btn slide-size__btn--ghost"
            onClick={() => setRows(null)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="slide-size__btn slide-size__btn--primary"
            onClick={insert}
          >
            Вставить
          </button>
        </footer>
      </div>
    </div>
  );
}
