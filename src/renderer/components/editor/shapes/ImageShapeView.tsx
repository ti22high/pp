import { memo, useCallback } from 'react';
import { Image as KonvaImage, Rect, Group } from 'react-konva';
import type Konva from 'konva';
import type { ImageShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { ShapeTextLabel } from './ShapeTextLabel';
import { resolveStroke, resolveShadow } from './paint';
import { useImageElement } from './useImageElement';
import { maskClipFunc } from '@renderer/lib/imageMasks';

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

  // clipFunc маски-по-форме. Маска «приклеена» к ПОЛНОМУ (необрезанному)
  // контенту, а не к display-боксу: при кропе бокс показывает лишь окно в
  // фигуру, поэтому форма реально режется (а не сжимается под новый бокс).
  const mask = shape.maskShape;
  const c = shape.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  // Геометрия маски в локальных координатах фигуры (0..w соответствует кропу).
  const maskX = -(c.x / c.w) * shape.w;
  const maskY = -(c.y / c.h) * shape.h;
  const maskW = shape.w / c.w;
  const maskH = shape.h / c.h;
  const clipFunc = useCallback(
    (ctx: Konva.Context) => {
      if (mask) maskClipFunc(mask, maskX, maskY, maskW, maskH)(ctx);
    },
    [mask, maskX, maskY, maskW, maskH],
  );

  const imageNode = img ? (
    <KonvaImage
      x={0}
      y={0}
      width={shape.w}
      height={shape.h}
      image={img}
      {...cropProps}
      {...(mask ? {} : strokeProps)}
      {...shadowProps}
    />
  ) : null;

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
        mask ? (
          <Group clipFunc={clipFunc}>{imageNode}</Group>
        ) : (
          imageNode
        )
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
      {shape.text != null && (
        <ShapeTextLabel shapeId={shape.id} tiptapDoc={shape.text} w={shape.w} h={shape.h} />
      )}
    </ShapeNode>
  );
});
