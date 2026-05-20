import { useEffect, useState } from 'react';
import { useUiStore } from '@renderer/stores/ui';
import { applyA1Range, insertTableFromRows, insertChartFromImport } from '@renderer/lib/csvImport';
import type { ChartType } from '@renderer/lib/model/schema';

const PREVIEW_ROWS = 6;
const PREVIEW_COLS = 8;

// Диалог импорта .xlsx (Phase 3.11b): выбор листа + опциональный диапазон A1,
// превью, вставка как таблицы. Стили (цвета/шрифты) free-SheetJS не читает —
// переносятся только значения.
export function XlsxImportDialog() {
  const data = useUiStore((s) => s.xlsxImport);
  const setData = useUiStore((s) => s.setXlsxImport);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [range, setRange] = useState('');

  // Сбрасываем выбор при открытии новой книги.
  useEffect(() => {
    if (data) {
      setSheetIdx(0);
      setRange('');
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setData(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, setData]);

  if (!data) return null;

  const sheet = data.sheets[Math.min(sheetIdx, data.sheets.length - 1)];
  const rows = range.trim() ? applyA1Range(sheet.rows, range) : sheet.rows;
  const nRows = rows.length;
  const nCols = Math.max(1, ...rows.map((r) => r.length));
  const previewRows = rows.slice(0, PREVIEW_ROWS);

  const insert = () => {
    insertTableFromRows(rows);
    setData(null);
  };

  return (
    <div className="modal-backdrop" onClick={() => setData(null)}>
      <div className="modal modal--hyperlink" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Импорт Excel</h2>
          <button className="modal__close" onClick={() => setData(null)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <p className="meta">{data.fileName}</p>

          <label className="slide-size__field">
            <span>Лист</span>
            <select value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))}>
              {data.sheets.map((s, i) => (
                <option key={s.name} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="slide-size__field">
            <span>Диапазон (необязательно)</span>
            <input
              type="text"
              placeholder="напр. A1:D10 — пусто = весь лист"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </label>

          <p className="meta">
            Будет вставлено: {nRows} строк × {nCols} столбцов
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
          </div>

          {data.charts && data.charts.length > 0 && (
            <>
              <p className="panel-title">Диаграммы в файле</p>
              {data.charts.map((ch, i) => (
                <div key={i} className="inspector-row inspector-row--buttons">
                  <button
                    type="button"
                    className="inspector-btn"
                    onClick={() => {
                      insertChartFromImport({
                        chartType: ch.chartType as ChartType,
                        categories: ch.categories,
                        series: ch.series,
                      });
                      setData(null);
                    }}
                  >
                    Вставить график #{i + 1} ({ch.chartType}, {ch.series.length} серий)
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <footer className="slide-size__footer">
          <button
            type="button"
            className="slide-size__btn slide-size__btn--ghost"
            onClick={() => setData(null)}
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
