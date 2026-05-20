import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { chartOps } from '@renderer/lib/chart';
import type { ChartType } from '@renderer/lib/model/schema';

const TYPES: { key: ChartType; label: string }[] = [
  { key: 'column', label: 'Столбцы' },
  { key: 'bar', label: 'Полосы' },
  { key: 'line', label: 'Линия' },
  { key: 'area', label: 'Область' },
  { key: 'pie', label: 'Круговая' },
  { key: 'doughnut', label: 'Кольцевая' },
  { key: 'scatter', label: 'Точки' },
  { key: 'scatterLine', label: 'Точки + линия' },
  { key: 'bubble', label: 'Пузырьковая' },
  { key: 'radar', label: 'Радар' },
  { key: 'stackedColumn', label: 'Столбцы с накоплением' },
  { key: 'stackedBar', label: 'Полосы с накоплением' },
  { key: 'stackedArea', label: 'Область с накоплением' },
  { key: 'combo', label: 'Комбо' },
];

// Контекстный тулбар графика (Phase 3.14f): появляется СВЕРХУ при выделенной
// диаграмме — быстрые действия (тип, легенда, сетка, подписи, «Данные…»), как
// контекстная вкладка в PowerPoint. Полное редактирование — в панели «Данные».
export function ChartContextToolbar() {
  const selected = useSelectionStore((s) => s.selectedShapeIds);
  const slideId = useUiStore((s) => s.activeSlideId);
  const openData = useUiStore((s) => s.setChartEditor);
  const chart = useDeckStore((s) => {
    if (selected.length !== 1 || !slideId) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === selected[0]);
    return sh?.type === 'chart' ? sh : null;
  });

  if (!chart || !slideId) return null;
  const id = chart.id;

  return (
    <div className="chart-toolbar">
      <span className="chart-toolbar__label">Диаграмма</span>
      <select
        className="inspector-select chart-toolbar__type"
        value={chart.chartType}
        onChange={(e) => chartOps.setType(slideId, id, e.target.value as ChartType)}
      >
        {TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      <span className="toolbar-sep" />
      <label className="chart-toolbar__check">
        <input type="checkbox" checked={chart.showLegend ?? false} onChange={() => chartOps.toggleLegend(slideId, id)} />
        Легенда
      </label>
      <label className="chart-toolbar__check">
        <input type="checkbox" checked={chart.showGridlines ?? false} onChange={() => chartOps.toggleGridlines(slideId, id)} />
        Сетка
      </label>
      <label className="chart-toolbar__check">
        <input type="checkbox" checked={chart.dataLabels ?? false} onChange={() => chartOps.toggleDataLabels(slideId, id)} />
        Подписи
      </label>
      <span className="toolbar-sep" />
      <button type="button" className="inspector-btn" onClick={() => openData(id)}>
        Данные…
      </button>
    </div>
  );
}
