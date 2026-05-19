import { memo } from 'react';
import { Rect } from 'react-konva';
import type { RectShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { ShapeTextLabel } from './ShapeTextLabel';
import { resolveFill, resolveStroke, resolveShadow } from './paint';

interface RectShapeViewProps {
  shape: RectShape;
  slideId: string;
}

// Мемоизация: Slide перерисовывается при любой мутации deck, но immer
// сохраняет ссылку на shape-объект, который не изменился. Memo сравнивает
// `shape` по ссылке → если эта фигура не менялась, ShapeNode и Konva-ноды
// не трогаются (важно для group-drag, где мы двигаем остальные ноды
// императивно и не хотим, чтобы React откатил их).
export const RectShapeView = memo(function RectShapeViewBase({ shape, slideId }: RectShapeViewProps) {
  const fillProps = resolveFill(shape.fill);
  const strokeProps = resolveStroke(shape.stroke);
  const shadowProps = resolveShadow(shape.shadow);
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
      <Rect
        x={0}
        y={0}
        width={shape.w}
        height={shape.h}
        cornerRadius={shape.cornerRadius ?? 0}
        {...fillProps}
        {...strokeProps}
        {...shadowProps}
      />
      {shape.text != null && (
        <ShapeTextLabel shapeId={shape.id} tiptapDoc={shape.text} w={shape.w} h={shape.h} />
      )}
    </ShapeNode>
  );
});
