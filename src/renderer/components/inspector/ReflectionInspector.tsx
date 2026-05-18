import { useDeckStore } from '@renderer/stores/deck';
import type { Reflection } from '@renderer/lib/model/schema';
import type { ShapeId, SlideId } from '@shared/types';
import { NumberField } from './NumberField';

interface ReflectionInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
  reflection: Reflection | undefined;
}

const DEFAULT_REFLECTION: Reflection = {
  alpha: 0.5,
  distance: 4,
  size: 0.5,
};

// UI-секция для отражения. ВНИМАНИЕ: визуальный рендер reflection на Konva
// требует клонирования ноды + masked gradient — это Phase 3. Сейчас поле
// сохраняется в модели, но на канвасе ничего не меняется. Пользователь
// видит контролы как «зарезервированные».
export function ReflectionInspector({ slideId, shapeId, reflection }: ReflectionInspectorProps) {
  const enabled = !!reflection;
  const value = reflection ?? DEFAULT_REFLECTION;

  const write = (next: Reflection | undefined) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shapeId);
      if (!sh) return;
      sh.reflection = next;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <section className="inspector-section">
      <p className="panel-title">Reflection</p>
      <label className="inspector-row">
        <span className="inspector-label" />
        <span className="inspector-input-wrap inspector-input-wrap--checkbox">
          <input
            type="checkbox"
            className="inspector-checkbox"
            checked={enabled}
            onChange={(e) => write(e.target.checked ? DEFAULT_REFLECTION : undefined)}
          />
          <span className="inspector-checkbox-label">
            Enabled <span className="inspector-meta">(рендер — Phase 3)</span>
          </span>
        </span>
      </label>

      {reflection && (
        <>
          <label className="inspector-row">
            <span className="inspector-label">Alpha</span>
            <span className="inspector-input-wrap">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(value.alpha * 100)}
                className="inspector-range"
                onChange={(e) =>
                  write({ ...value, alpha: parseInt(e.target.value, 10) / 100 })
                }
              />
              <span className="inspector-range-value">
                {Math.round(value.alpha * 100)}
              </span>
            </span>
          </label>
          <NumberField
            label="Dist"
            value={value.distance}
            min={0}
            onCommit={(v) => write({ ...value, distance: v })}
          />
          <label className="inspector-row">
            <span className="inspector-label">Size</span>
            <span className="inspector-input-wrap">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(value.size * 100)}
                className="inspector-range"
                onChange={(e) =>
                  write({ ...value, size: parseInt(e.target.value, 10) / 100 })
                }
              />
              <span className="inspector-range-value">
                {Math.round(value.size * 100)}
              </span>
            </span>
          </label>
        </>
      )}
    </section>
  );
}
