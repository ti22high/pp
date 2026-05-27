import { memo } from 'react';
import type { EquationShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';

interface EquationShapeViewProps {
  shape: EquationShape;
  slideId: string;
}

// Konva-сторона формулы (Phase 3.24): прозрачный прокси через ShapeNode —
// невидимый hit-rect ловит клики, Transformer обтягивает bbox. Сам KaTeX
// рисует DOM-оверлей (EquationOverlay) поверх с pointer-events:none, поэтому
// клики проходят сюда (выделение/перетаскивание/масштаб). memo: см. RectShapeView.
export const EquationShapeView = memo(function EquationShapeViewBase({
  shape,
  slideId,
}: EquationShapeViewProps) {
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
      {null}
    </ShapeNode>
  );
});
