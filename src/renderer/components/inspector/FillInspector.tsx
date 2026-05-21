import { useDeckStore } from '@renderer/stores/deck';
import type { Fill } from '@renderer/lib/model/schema';
import type { ShapeId, SlideId } from '@shared/types';
import { openFillImageDialog } from '@renderer/lib/insertImage';
import { ColorField } from './ColorField';
import { NumberField } from './NumberField';

interface FillInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
  fill: Fill | undefined;
}

// Секция «Fill». Поддерживает none / solid / gradient / image (Phase 3.19).
//
// При смене режима подставляем разумный дефолт, чтобы фигура не пропала
// (например, переход на gradient берёт текущий solid-цвет как первый stop).
// Для image открываем файловый диалог: fill ставится только после выбора.
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

  const setMode = (m: 'none' | 'solid' | 'gradient' | 'image') => {
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
    if (m === 'image') {
      // Уже картинка — не трогаем; иначе открываем диалог. fill запишется
      // только после выбора файла (в openFillImageDialog), отмена — без эффекта.
      if (fill?.kind !== 'image') openFillImageDialog(slideId, shapeId);
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
      <p className="panel-title">Заливка</p>
      <label className="inspector-row">
        <span className="inspector-label">Режим</span>
        <select
          className="inspector-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'none' | 'solid' | 'gradient' | 'image')}
        >
          <option value="none">Без заливки</option>
          <option value="solid">Сплошная</option>
          <option value="gradient">Градиент</option>
          <option value="image">Картинка</option>
        </select>
      </label>

      {fill?.kind === 'image' && (
        <>
          {/* Превью выбранной картинки (растягивается под фигуру при рендере). */}
          <div
            className="fill-image-preview"
            style={{ backgroundImage: `url(${fill.src})` }}
          />
          <div className="inspector-row inspector-row--buttons">
            <button
              type="button"
              className="inspector-btn"
              onClick={() => openFillImageDialog(slideId, shapeId)}
            >
              Заменить изображение…
            </button>
          </div>
        </>
      )}

      {fill?.kind === 'solid' && (
        <ColorField
          label="Цвет"
          value={fill.color}
          onCommit={(v) => write({ kind: 'solid', color: v })}
        />
      )}

      {fill?.kind === 'gradient' && (
        <>
          <label className="inspector-row">
            <span className="inspector-label">Тип</span>
            <select
              className="inspector-select"
              value={fill.type}
              onChange={(e) =>
                write({ ...fill, type: e.target.value as 'linear' | 'radial' })
              }
            >
              <option value="linear">Линейный</option>
              <option value="radial">Радиальный</option>
            </select>
          </label>
          {fill.type === 'linear' && (
            <NumberField
              label="Угол"
              value={fill.angle ?? 0}
              suffix="°"
              onCommit={(v) => write({ ...fill, angle: v })}
            />
          )}
          {/* Превью градиента. */}
          <div
            className="gradient-preview"
            style={{
              background: `linear-gradient(90deg, ${[...fill.stops]
                .sort((a, b) => a.pos - b.pos)
                .map((s) => `${s.color} ${Math.round(s.pos * 100)}%`)
                .join(', ')})`,
            }}
          />
          {/* Список стопов: цвет + позиция % + удаление (если стопов > 2). */}
          {fill.stops.map((stop, i) => (
            <div key={i} className="inspector-row gradient-stop">
              <input
                type="color"
                value={stop.color}
                onChange={(e) => {
                  const stops = fill.stops.map((s, j) => (j === i ? { ...s, color: e.target.value } : s));
                  write({ ...fill, stops });
                }}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(stop.pos * 100)}
                className="gradient-stop__pos"
                onChange={(e) => {
                  const pos = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100;
                  const stops = fill.stops.map((s, j) => (j === i ? { ...s, pos } : s));
                  write({ ...fill, stops });
                }}
              />
              <span className="inspector-suffix">%</span>
              <button
                type="button"
                className="gradient-stop__del"
                disabled={fill.stops.length <= 2}
                title="Удалить стоп"
                onClick={() => write({ ...fill, stops: fill.stops.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </div>
          ))}
          <div className="inspector-row inspector-row--buttons">
            <button
              type="button"
              className="inspector-btn"
              onClick={() => {
                // Новый стоп посередине между крайними.
                const sorted = [...fill.stops].sort((a, b) => a.pos - b.pos);
                const a = sorted[0];
                const b = sorted[sorted.length - 1];
                const mid = { pos: (a.pos + b.pos) / 2, color: a.color };
                write({ ...fill, stops: [...fill.stops, mid] });
              }}
            >
              + Стоп
            </button>
          </div>
        </>
      )}
    </section>
  );
}
