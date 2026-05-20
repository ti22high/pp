import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useCropBridge } from '@renderer/stores/cropBridge';
import { resetImageCrop } from '@renderer/lib/slides';
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
    </section>
  );
}
