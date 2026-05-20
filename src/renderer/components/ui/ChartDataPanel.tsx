import { useEffect } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { chartOps } from '@renderer/lib/chart';
import type { ChartType } from '@renderer/lib/model/schema';

const TYPES: { key: ChartType; label: string }[] = [
  { key: 'column', label: 'Столбцы' },
  { key: 'bar', label: 'Полосы' },
  { key: 'line', label: 'Линия' },
  { key: 'area', label: 'Область' },
  { key: 'pie', label: 'Круговая' },
  { key: 'scatter', label: 'Точки' },
];

// Плавающая панель редактирования диаграммы (Phase 3.12–3.14): тип, мини-таблица
// данных (категории × серии), цвета серий, легенда/сетка, заголовки осей.
// Открывается двойным кликом по диаграмме; не перекрывает слайд (live-правки).
export function ChartDataPanel() {
  const id = useUiStore((s) => s.chartEditorId);
  const close = useUiStore((s) => s.setChartEditor);
  const slideId = useUiStore((s) => s.activeSlideId);
  const chart = useDeckStore((s) => {
    if (!slideId || !id) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === id);
    return sh?.type === 'chart' ? sh : null;
  });

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, close]);

  if (!id || !slideId || !chart) return null;
  const sid = slideId;

  return (
    <div className="float-panel float-panel--right chart-panel">
      <header className="modal__header">
        <h2>Диаграмма</h2>
        <button className="modal__close" onClick={() => close(null)} aria-label="Закрыть">
          ×
        </button>
      </header>

      <div className="slide-size__body">
        <label className="slide-size__field">
          <span>Тип</span>
          <select
            value={chart.chartType}
            onChange={(e) => chartOps.setType(sid, id, e.target.value as ChartType)}
          >
            {TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inspector-row inspector-row--checkbox">
          <input type="checkbox" className="inspector-checkbox" checked={chart.showLegend ?? false} onChange={() => chartOps.toggleLegend(sid, id)} />
          <span className="inspector-checkbox-label">Легенда</span>
        </label>
        <label className="inspector-row inspector-row--checkbox">
          <input type="checkbox" className="inspector-checkbox" checked={chart.showGridlines ?? false} onChange={() => chartOps.toggleGridlines(sid, id)} />
          <span className="inspector-checkbox-label">Сетка</span>
        </label>

        <label className="slide-size__field">
          <span>Ось X</span>
          <input type="text" value={chart.axisXTitle ?? ''} onChange={(e) => chartOps.setAxisTitle(sid, id, 'x', e.target.value)} />
        </label>
        <label className="slide-size__field">
          <span>Ось Y</span>
          <input type="text" value={chart.axisYTitle ?? ''} onChange={(e) => chartOps.setAxisTitle(sid, id, 'y', e.target.value)} />
        </label>

        <p className="panel-title">Данные</p>
        <div className="chart-data">
          <table>
            <thead>
              <tr>
                <th></th>
                {chart.series.map((s, si) => (
                  <th key={si}>
                    <input
                      type="color"
                      value={s.color ?? '#4285f4'}
                      onChange={(e) => chartOps.setSeriesColor(sid, id, si, e.target.value)}
                    />
                    <input
                      className="chart-data__name"
                      value={s.name}
                      onChange={(e) => chartOps.setSeriesName(sid, id, si, e.target.value)}
                    />
                    <button type="button" className="chart-data__del" title="Удалить серию" onClick={() => chartOps.removeSeries(sid, id, si)}>×</button>
                  </th>
                ))}
                <th>
                  <button type="button" className="chart-data__add" title="Добавить серию" onClick={() => chartOps.addSeries(sid, id)}>+</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {chart.categories.map((cat, ci) => (
                <tr key={ci}>
                  <th>
                    <input
                      className="chart-data__name"
                      value={cat}
                      onChange={(e) => chartOps.setCategoryName(sid, id, ci, e.target.value)}
                    />
                    <button type="button" className="chart-data__del" title="Удалить строку" onClick={() => chartOps.removeCategory(sid, id, ci)}>×</button>
                  </th>
                  {chart.series.map((s, si) => (
                    <td key={si}>
                      <input
                        type="number"
                        className="chart-data__num"
                        value={s.data[ci] ?? 0}
                        onChange={(e) => chartOps.setValue(sid, id, si, ci, Number(e.target.value) || 0)}
                      />
                    </td>
                  ))}
                  <td></td>
                </tr>
              ))}
              <tr>
                <th>
                  <button type="button" className="chart-data__add" title="Добавить строку" onClick={() => chartOps.addCategory(sid, id)}>+</button>
                </th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer className="slide-size__footer">
        <button type="button" className="slide-size__btn slide-size__btn--primary" onClick={() => close(null)}>
          Готово
        </button>
      </footer>
    </div>
  );
}
