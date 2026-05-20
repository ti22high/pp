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

  // clipFunc маски-по-форме (если задана) — рисует контур в координатах
  // 0..w, 0..h вокруг картинки.
  const mask = shape.maskShape;
  const clipFunc = useCallback(
    (ctx: Konva.Context) => {
      if (mask) maskClipFunc(mask, shape.w, shape.h)(ctx);
    },
    [mask, shape.w, shape.h],
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
