import { useUiStore } from '@renderer/stores/ui';
import { useDeckStore } from '@renderer/stores/deck';
import { useCropBridge } from '@renderer/stores/cropBridge';
import { setImageRecolor, setImageAdjust, resetImageAdjust } from '@renderer/lib/slides';
import { openReplaceImageDialog } from '@renderer/lib/insertImage';
import { maskImageBaked } from '@renderer/lib/imageBake';
import { MASK_OPTIONS, type MaskKey } from '@renderer/lib/imageMasks';
import { RECOLOR_OPTIONS, type RecolorKey } from '@renderer/lib/imageFilters';
import { RangeNumberField } from './RangeNumberField';
import type { ShapeId, SlideId } from '@shared/types';

interface ImageInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
}

// Секция инспектора для изображения: обрезка, применение формы (маски),
// перекраска. Обрезка и форма деструктивны («запекаются» в новый src,
// см. lib/imageBake.ts), поэтому форма — это действие, а не переключатель.
export function ImageInspector({ slideId, shapeId }: ImageInspectorProps) {
  const setCroppingShape = useUiStore((s) => s.setCroppingShape);
  const cropping = useUiStore((s) => s.croppingShapeId === shapeId);
  const recolor = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'image' ? sh.recolor ?? 'none' : 'none';
  });
  const brightness = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'image' ? sh.brightness ?? 0 : 0;
  });
  const contrast = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'image' ? sh.contrast ?? 0 : 0;
  });

  return (
    <section className="inspector-section">
      <p className="panel-title">Изображение</p>
      <div className="inspector-row inspector-row--buttons">
        {cropping ? (
          <>
            <button
              type="button"
              className="inspector-btn inspector-btn--primary"
              onClick={() => useCropBridge.getState().commit?.()}
            >
              Готово (Enter)
            </button>
            <button
              type="button"
              className="inspector-btn"
              onClick={() => useCropBridge.getState().cancel?.()}
            >
              Отмена (Esc)
            </button>
          </>
        ) : (
          <button
            type="button"
            className="inspector-btn"
            onClick={() => setCroppingShape(shapeId)}
          >
            Обрезать
          </button>
        )}
      </div>
      {cropping && (
        <p className="meta">
          Перетащите рамку и ручки. Enter — применить, Esc — отмена.
        </p>
      )}
      {!cropping && (
        <label className="inspector-row">
          <span className="inspector-label">Форма</span>
          <select
            className="inspector-select"
            value=""
            onChange={(e) => {
              const k = e.target.value;
              if (k) void maskImageBaked(slideId, shapeId, k as MaskKey);
              e.target.value = '';
            }}
          >
            <option value="">Применить форму…</option>
            {MASK_OPTIONS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {!cropping && (
        <label className="inspector-row">
          <span className="inspector-label">Перекраска</span>
          <select
            className="inspector-select"
            value={recolor}
            onChange={(e) => setImageRecolor(slideId, shapeId, e.target.value as RecolorKey)}
          >
            {RECOLOR_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {!cropping && (
        <RangeNumberField
          label="Яркость"
          min={-100}
          max={100}
          value={brightness * 100}
          format={Math.round}
          onChange={(v) => setImageAdjust(slideId, shapeId, { brightness: v / 100 })}
        />
      )}
      {!cropping && (
        <RangeNumberField
          label="Контраст"
          min={-100}
          max={100}
          value={contrast}
          format={Math.round}
          onChange={(v) => setImageAdjust(slideId, shapeId, { contrast: v })}
        />
      )}
      {!cropping && (
        <div className="inspector-row inspector-row--buttons">
          <button
            type="button"
            className="inspector-btn"
            onClick={() => openReplaceImageDialog(slideId, shapeId)}
          >
            Заменить
          </button>
          <button
            type="button"
            className="inspector-btn"
            onClick={() => resetImageAdjust(slideId, shapeId)}
          >
            Сбросить
          </button>
        </div>
      )}
    </section>
  );
}
