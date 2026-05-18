import { useDeckStore } from '@renderer/stores/deck';
import type { Fill } from '@renderer/lib/model/schema';
import type { ShapeId, SlideId } from '@shared/types';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';

interface FillInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
  fill: Fill | undefined;
}

// Секция «Fill». Поддерживает none / solid / gradient.
// Image — Phase 3 (media), в селект не добавляем.
//
// При смене режима подставляем разумный дефолт, чтобы фигура не пропала
// (например, переход на gradient берёт текущий solid-цвет как первый stop).
export function FillInspector({ slideId, shapeId, fill }: FillInspectorProps) {
  const mode = fill?.kind ?? 'none';

  const write = (next: Fill | undefined) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shapeId);
      if (!sh) return;
      sh.fill = next;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const setMode = (m: 'none' | 'solid' | 'gradient') => {
    if (m === 'none') {
      write({ kind: 'none' });
      return;
    }
    if (m === 'solid') {
      const fallback =
        fill?.kind === 'solid'
          ? fill.color
          : fill?.kind === 'gradient'
            ? fill.stops[0]?.color
            : '#1a73e8';
      write({ kind: 'solid', color: fallback ?? '#1a73e8' });
      return;
    }
    // gradient
    const c1 = fill?.kind === 'solid' ? fill.color : '#1a73e8';
    const c2 = fill?.kind === 'gradient' ? (fill.stops[1]?.color ?? '#ffffff') : '#ffffff';
    write({
      kind: 'gradient',
      type: fill?.kind === 'gradient' ? fill.type : 'linear',
      angle: fill?.kind === 'gradient' ? fill.angle : 0,
      stops: [
        { pos: 0, color: c1 },
        { pos: 1, color: c2 },
      ],
    });
  };

  return (
    <section className="inspector-section">
      <p className="panel-title">Fill</p>
      <label className="inspector-row">
        <span className="inspector-label">Mode</span>
        <select
          className="inspector-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'none' | 'solid' | 'gradient')}
        >
          <option value="none">None</option>
          <option value="solid">Solid</option>
          <option value="gradient">Gradient</option>
        </select>
      </label>

      {fill?.kind === 'solid' && (
        <ColorField
          label="Color"
          value={fill.color}
          onCommit={(v) => write({ kind: 'solid', color: v })}
        />
      )}

      {fill?.kind === 'gradient' && (
        <>
          <label className="inspector-row">
            <span className="inspector-label">Type</span>
            <select
              className="inspector-select"
              value={fill.type}
              onChange={(e) =>
                write({ ...fill, type: e.target.value as 'linear' | 'radial' })
              }
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </label>
          {fill.type === 'linear' && (
            <NumberField
              label="Angle"
              value={fill.angle ?? 0}
              suffix="°"
              onCommit={(v) => write({ ...fill, angle: v })}
            />
          )}
          <ColorField
            label="From"
            value={fill.stops[0]?.color}
            onCommit={(v) =>
              write({
                ...fill,
                stops: [
                  { pos: 0, color: v },
                  fill.stops[1] ?? { pos: 1, color: '#ffffff' },
                ],
              })
            }
          />
          <ColorField
            label="To"
            value={fill.stops[1]?.color}
            onCommit={(v) =>
              write({
                ...fill,
                stops: [
                  fill.stops[0] ?? { pos: 0, color: '#1a73e8' },
                  { pos: 1, color: v },
                ],
              })
            }
          />
        </>
      )}
    </section>
  );
}
