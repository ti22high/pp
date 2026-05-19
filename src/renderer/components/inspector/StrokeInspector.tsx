import { useDeckStore } from '@renderer/stores/deck';
import type { Stroke } from '@renderer/lib/model/schema';
import type { ShapeId, SlideId } from '@shared/types';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';

interface StrokeInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
  stroke: Stroke | undefined;
}

// Дашевые пресеты: ключ → массив для Konva-prop `dash`.
const DASH_PRESETS: Record<string, number[] | undefined> = {
  solid: undefined,
  dashed: [8, 4],
  dotted: [2, 4],
};

function detectDashKey(dash: number[] | undefined): string {
  if (!dash || dash.length === 0) return 'solid';
  if (dash[0] === 8 && dash[1] === 4) return 'dashed';
  if (dash[0] === 2 && dash[1] === 4) return 'dotted';
  return 'custom';
}

export function StrokeInspector({ slideId, shapeId, stroke }: StrokeInspectorProps) {
  const enabled = !!stroke;

  const write = (next: Stroke | undefined) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shapeId);
      if (!sh) return;
      sh.stroke = next;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const dashKey = detectDashKey(stroke?.dash);

  return (
    <section className="inspector-section">
      <p className="panel-title">Обводка</p>
      <label className="inspector-row">
        <span className="inspector-label" />
        <span className="inspector-input-wrap inspector-input-wrap--checkbox">
          <input
            type="checkbox"
            className="inspector-checkbox"
            checked={enabled}
            onChange={(e) =>
              write(e.target.checked ? { color: '#202124', width: 1 } : undefined)
            }
          />
          <span className="inspector-checkbox-label">Включена</span>
        </span>
      </label>

      {stroke && (
        <>
          <ColorField
            label="Цвет"
            value={stroke.color}
            onCommit={(v) => write({ ...stroke, color: v })}
          />
          <NumberField
            label="Толщина"
            value={stroke.width}
            min={0}
            step={0.5}
            onCommit={(v) => write({ ...stroke, width: Math.min(24, v) })}
          />
          <label className="inspector-row">
            <span className="inspector-label">Стиль</span>
            <select
              className="inspector-select"
              value={dashKey === 'custom' ? 'solid' : dashKey}
              onChange={(e) => write({ ...stroke, dash: DASH_PRESETS[e.target.value] })}
            >
              <option value="solid">Сплошная</option>
              <option value="dashed">Штрих</option>
              <option value="dotted">Пунктир</option>
            </select>
          </label>
        </>
      )}
    </section>
  );
}
