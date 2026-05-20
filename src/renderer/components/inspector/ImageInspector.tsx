import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useCropBridge } from '@renderer/stores/cropBridge';
import { resetImageCrop, setImageMask, setImageRecolor } from '@renderer/lib/slides';
import { MASK_OPTIONS, type MaskKey } from '@renderer/lib/imageMasks';
import { RECOLOR_OPTIONS, type RecolorKey } from '@renderer/lib/imageFilters';
import type { ShapeId, SlideId } from '@shared/types';

interface ImageInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
}

// Секция инспектора для изображения: вход в режим обрезки + сброс обрезки.
export function ImageInspector({ slideId, shapeId }: ImageInspectorProps) {
  const setCroppingShape = useUiStore((s) => s.setCroppingShape);
  const cropping = useUiStore((s) => s.croppingShapeId === shapeId);
  const hasCrop = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'image' && sh.crop != null;
  });
  const mask = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'image' ? sh.maskShape ?? '' : '';
  });
  const recolor = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'image' ? sh.recolor ?? 'none' : 'none';
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
        {hasCrop && !cropping && (
          <button
            type="button"
            className="inspector-btn"
            onClick={() => resetImageCrop(slideId, shapeId)}
          >
            Сбросить обрезку
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
          <span className="inspector-label">Маска</span>
          <select
            className="inspector-select"
            value={mask}
            onChange={(e) =>
              setImageMask(
                slideId,
                shapeId,
                e.target.value === '' ? undefined : (e.target.value as MaskKey),
              )
            }
          >
            <option value="">Прямоугольник</option>
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
    </section>
  );
}
