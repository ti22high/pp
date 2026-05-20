import { memo, useEffect, useRef } from 'react';
import { Image as KonvaImage, Rect } from 'react-konva';
import type Konva from 'konva';
import type { ImageShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { ShapeTextLabel } from './ShapeTextLabel';
import { resolveStroke, resolveShadow } from './paint';
import { useImageElement } from './useImageElement';
import { applyImageAdjust } from '@renderer/lib/imageFilters';

interface ImageShapeViewProps {
  shape: ImageShape;
  slideId: string;
}

// Рендер изображения. Обрезка и маска-форма «запекаются» в сам src
// (см. lib/imageBake.ts), поэтому здесь рисуем картинку как есть —
// без clip/crop-композиции. Перекраска (recolor) остаётся живым фильтром.
export const ImageShapeView = memo(function ImageShapeViewBase({
  shape,
  slideId,
}: ImageShapeViewProps) {
  const img = useImageElement(shape.src);
  const strokeProps = resolveStroke(shape.stroke);
  const shadowProps = resolveShadow(shape.shadow);

  const imgNodeRef = useRef<Konva.Image>(null);
  const recolor = shape.recolor;
  const brightness = shape.brightness;
  const contrast = shape.contrast;
  useEffect(() => {
    const node = imgNodeRef.current;
    if (!node || !img) return;
    applyImageAdjust(node, { recolor, brightness, contrast });
    node.getLayer()?.batchDraw();
  }, [img, recolor, brightness, contrast, shape.w, shape.h]);

  return (
    <ShapeNode
      id={shape.id}
      slideId={slideId}
      x={shape.x}
      y={shape.y}
      w={shape.w}
      h={shape.h}
      rotation={shape.rotation}
      opacity={shape.opacity}
      locked={shape.locked}
    >
      {img ? (
        <KonvaImage
          ref={imgNodeRef}
          x={0}
          y={0}
          width={shape.w}
          height={shape.h}
          image={img}
          {...strokeProps}
          {...shadowProps}
        />
      ) : (
        <Rect
          x={0}
          y={0}
          width={shape.w}
          height={shape.h}
          fill="#f1f3f4"
          stroke="#dadce0"
          strokeWidth={1}
        />
      )}
      {shape.text != null && (
        <ShapeTextLabel shapeId={shape.id} tiptapDoc={shape.text} w={shape.w} h={shape.h} />
      )}
    </ShapeNode>
  );
});
