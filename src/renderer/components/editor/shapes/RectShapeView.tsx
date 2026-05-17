import { Rect } from 'react-konva';
import type { RectShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { resolveFill, resolveStroke } from './paint';

interface RectShapeViewProps {
  shape: RectShape;
  slideId: string;
}

export function RectShapeView({ shape, slideId }: RectShapeViewProps) {
  const fillProps = resolveFill(shape.fill);
  const strokeProps = resolveStroke(shape.stroke);
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
        listening={false}
        {...fillProps}
        {...strokeProps}
      />
    </ShapeNode>
  );
}
