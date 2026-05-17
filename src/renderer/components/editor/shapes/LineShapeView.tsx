import { Line, Arrow } from 'react-konva';
import type { LineShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { resolveStroke } from './paint';

interface LineShapeViewProps {
  shape: LineShape;
  slideId: string;
}

// Линия (или стрелка) рисуется в локальных координатах группы.
// shape.points = [x1, y1, x2, y2] относительно top-left bbox фигуры.
export function LineShapeView({ shape, slideId }: LineShapeViewProps) {
  const stroke = resolveStroke(shape.stroke);
  const isArrow = shape.arrowStart || shape.arrowEnd;
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
      {isArrow ? (
        <Arrow
          points={shape.points as unknown as number[]}
          pointerAtBeginning={!!shape.arrowStart}
          pointerAtEnding={!!shape.arrowEnd}
          fill={stroke.stroke}
          listening={false}
          {...stroke}
        />
      ) : (
        <Line
          points={shape.points as unknown as number[]}
          hitStrokeWidth={16}
          listening={false}
          {...stroke}
        />
      )}
    </ShapeNode>
  );
}
