import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { FONT_FAMILIES } from '@renderer/lib/fonts';
import { setWordArtStyle, setWordArtFill, setWordArtStroke } from '@renderer/lib/slides';

// Контекстный тулбар WordArt (Phase 3.21): появляется СВЕРХУ при выделенной
// WordArt-фигуре — стиль (шрифт/размер/жирный-курсив/заливка/контур), как
// контекстная вкладка в PowerPoint. Текст правится инлайн (двойной клик).
// data-keep-editing — клики по тулбару не закрывают инлайн-редактор.
export function WordArtContextToolbar() {
  const selected = useSelectionStore((s) => s.selectedShapeIds);
  const slideId = useUiStore((s) => s.activeSlideId);
  const wa = useDeckStore((s) => {
    if (selected.length !== 1 || !slideId) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === selected[0]);
    return sh?.type === 'wordart' ? sh : null;
  });

  if (!wa || !slideId) return null;
  const id = wa.id;
  const fillColor = wa.fill?.kind === 'solid' ? wa.fill.color : '#1a73e8';
  const strokeColor = wa.stroke?.color ?? '#0a2a66';
  const strokeWidth = wa.stroke?.width ?? 0;

  return (
    <div className="chart-toolbar" data-keep-editing>
      <span className="chart-toolbar__label">WordArt</span>
      <select
        className="inspector-select"
        value={wa.fontFamily}
        onChange={(e) => setWordArtStyle(slideId, id, { fontFamily: e.target.value })}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <input
        type="number"
        className="inspector-input wordart-toolbar__size"
        min={4}
        max={800}
        value={wa.fontSize}
        title="Размер"
        onChange={(e) => setWordArtStyle(slideId, id, { fontSize: Math.max(4, Number(e.target.value) || 4) })}
      />
      <button
        type="button"
        className={`toolbar-btn${wa.bold ? ' toolbar-btn--active' : ''}`}
        title="Жирный"
        onClick={() => setWordArtStyle(slideId, id, { bold: !wa.bold })}
      >
        Ж
      </button>
      <button
        type="button"
        className={`toolbar-btn${wa.italic ? ' toolbar-btn--active' : ''}`}
        title="Курсив"
        onClick={() => setWordArtStyle(slideId, id, { italic: !wa.italic })}
      >
        К
      </button>
      <span className="toolbar-sep" />
      <label className="chart-toolbar__check">
        Заливка
        <input type="color" value={fillColor} onChange={(e) => setWordArtFill(slideId, id, e.target.value)} />
      </label>
      <label className="chart-toolbar__check">
        Контур
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => setWordArtStroke(slideId, id, { color: e.target.value })}
        />
      </label>
      <input
        type="number"
        className="inspector-input wordart-toolbar__size"
        min={0}
        max={24}
        value={strokeWidth}
        title="Толщина контура"
        onChange={(e) => setWordArtStroke(slideId, id, { width: Math.max(0, Number(e.target.value) || 0) })}
      />
    </div>
  );
}
