import { useDeckStore } from '@renderer/stores/deck';
import type { ShapeId, SlideId } from '@shared/types';

interface OpacityInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
  // undefined у модели интерпретируется рендерером как 1 (полностью непрозрачно).
  opacity: number | undefined;
}

// Секция «Opacity». Слайдер 0–100% + численный показ. В модель пишем 0..1.
// При значении 1 — стираем поле в undefined, чтобы не засорять JSON
// (рендерер всё равно читает `shape.opacity ?? 1`).
export function OpacityInspector({ slideId, shapeId, opacity }: OpacityInspectorProps) {
  const value = opacity ?? 1;
  const pct = Math.round(value * 100);

  const write = (next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shapeId);
      if (!sh) return;
      sh.opacity = clamped >= 1 ? undefined : clamped;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <section className="inspector-section">
      <p className="panel-title">Opacity</p>
      <label className="inspector-row">
        <span className="inspector-label">%</span>
        <span className="inspector-input-wrap">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            className="inspector-range"
            onChange={(e) => write(parseInt(e.target.value, 10) / 100)}
          />
          <span className="inspector-range-value">{pct}</span>
        </span>
      </label>
    </section>
  );
}
