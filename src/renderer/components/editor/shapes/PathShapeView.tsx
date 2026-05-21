import { memo, useMemo } from 'react';
import { Path } from 'react-konva';
import Konva from 'konva';
import type { PathShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { ShapeTextLabel } from './ShapeTextLabel';
import { resolveFill, resolveStroke, resolveShadow } from './paint';
import { useImageElement } from './useImageElement';

interface PathShapeViewProps {
  shape: PathShape;
  slideId: string;
}

// Path рендерится в локальном bbox (0,0)→(w,h):
// - натуральный bbox SVG-данных вычисляем через временный Konva.Path.getSelfRect(),
// - смещаем -bbox.x/-bbox.y и масштабируем (w/bbox.w, h/bbox.h),
//   чтобы фигура заполняла рамку Transformer-а без зазоров.
// strokeScaleEnabled=false — толщина штриха не растёт при scale.
// memo: см. RectShapeView — мемоизация для group-drag.
export const PathShapeView = memo(function PathShapeViewBase({ shape, slideId }: PathShapeViewProps) {
  const stroke = resolveStroke(shape.stroke);
  const shadow = resolveShadow(shape.shadow);
  const natural = useMemo(() => {
    const tmp = new Konva.Path({ data: shape.pathData });
    const rect = tmp.getSelfRect();
    return {
      x: rect.x,
      y: rect.y,
      w: Math.max(1, rect.width),
      h: Math.max(1, rect.height),
    };
  }, [shape.pathData]);
  // Градиент/image-заливка в координатах pathData (локальные для Path-ноды) —
  // центр natural-bbox. Картинку (Phase 3.19) грузим и масштабируем по natural,
  // node-scale (sx/sy) дотягивает её до отображаемого размера фигуры.
  const fillImage = useImageElement(shape.fill?.kind === 'image' ? shape.fill.src : null);
  const fill = resolveFill(
    shape.fill,
    natural.w,
    natural.h,
    natural.x + natural.w / 2,
    natural.y + natural.h / 2,
    fillImage,
  );
  const sx = shape.w / natural.w;
  const sy = shape.h / natural.h;
  return (
    <ShapeNode
      id={shape.id}
      slideId={slideId}
      x={shape.x}
      y={shape.y}
      w={Math.max(2, shape.w)}
      h={Math.max(2, shape.h)}
      rotation={shape.rotation}
      opacity={shape.opacity}
      locked={shape.locked}
    >
      <Path
        x={-natural.x * sx}
        y={-natural.y * sy}
        scaleX={sx}
        scaleY={sy}
        data={shape.pathData}
        strokeScaleEnabled={false}
        {...fill}
        {...stroke}
        {...shadow}
      />
      {shape.text != null && (
        <ShapeTextLabel shapeId={shape.id} tiptapDoc={shape.text} w={shape.w} h={shape.h} />
      )}
    </ShapeNode>
  );
});
