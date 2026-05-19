import { useDeckStore } from '@renderer/stores/deck';
import type { Shadow } from '@renderer/lib/model/schema';
import type { ShapeId, SlideId } from '@shared/types';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';

interface ShadowInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
  shadow: Shadow | undefined;
}

const DEFAULT_SHADOW: Shadow = {
  offsetX: 4,
  offsetY: 4,
  blur: 8,
  color: '#000000',
  opacity: 0.35,
};

export function ShadowInspector({ slideId, shapeId, shadow }: ShadowInspectorProps) {
  const enabled = !!shadow;
  const value = shadow ?? DEFAULT_SHADOW;

  const write = (next: Shadow | undefined) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shapeId);
      if (!sh) return;
      sh.shadow = next;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <section className="inspector-section">
      <p className="panel-title">Тень</p>
      <label className="inspector-row">
        <span className="inspector-label" />
        <span className="inspector-input-wrap inspector-input-wrap--checkbox">
          <input
            type="checkbox"
            className="inspector-checkbox"
            checked={enabled}
            onChange={(e) => write(e.target.checked ? DEFAULT_SHADOW : undefined)}
          />
          <span className="inspector-checkbox-label">Включена</span>
        </span>
      </label>

      {shadow && (
        <>
          <ColorField
            label="Цвет"
            value={value.color}
            onCommit={(v) => write({ ...value, color: v })}
          />
          <NumberField
            label="X"
            value={value.offsetX}
            onCommit={(v) => write({ ...value, offsetX: v })}
          />
          <NumberField
            label="Y"
            value={value.offsetY}
            onCommit={(v) => write({ ...value, offsetY: v })}
          />
          <NumberField
            label="Размытие"
            value={value.blur}
            min={0}
            onCommit={(v) => write({ ...value, blur: v })}
          />
          <label className="inspector-row">
            <span className="inspector-label">Альфа</span>
            <span className="inspector-input-wrap">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round((value.opacity ?? 1) * 100)}
                className="inspector-range"
                onChange={(e) =>
                  write({ ...value, opacity: parseInt(e.target.value, 10) / 100 })
                }
              />
              <span className="inspector-range-value">
                {Math.round((value.opacity ?? 1) * 100)}
              </span>
            </span>
          </label>
        </>
      )}
    </section>
  );
}
