import { memo } from 'react';
import { Image as KonvaImage, Rect } from 'react-konva';
import type { ImageShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { resolveStroke, resolveShadow } from './paint';
import { useImageElement } from './useImageElement';

interface ImageShapeViewProps {
  shape: ImageShape;
  slideId: string;
}

export const ImageShapeView = memo(function ImageShapeViewBase({
  shape,
  slideId,
}: ImageShapeViewProps) {
  const img = useImageElement(shape.src);
  const strokeProps = resolveStroke(shape.stroke);
  const shadowProps = resolveShadow(shape.shadow);

  // crop в долях [0..1] → пиксели исходника для Konva.Image.crop.
  const cropProps =
    shape.crop && img
      ? {
          crop: {
            x: shape.crop.x * img.naturalWidth,
            y: shape.crop.y * img.naturalHeight,
            width: shape.crop.w * img.naturalWidth,
            height: shape.crop.h * img.naturalHeight,
          },
        }
      : {};

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
          x={0}
          y={0}
          width={shape.w}
          height={shape.h}
          image={img}
          {...cropProps}
          {...strokeProps}
          {...shadowProps}
        />
      ) : (
        // Плейсхолдер, пока картинка грузится (или если src битый).
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
    </ShapeNode>
  );
});
