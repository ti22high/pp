import { Path } from 'react-konva';
import type { PathShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { resolveFill, resolveStroke } from './paint';

interface PathShapeViewProps {
  shape: PathShape;
  slideId: string;
}

export function PathShapeView({ shape, slideId }: PathShapeViewProps) {
  const fill = resolveFill(shape.fill);
  const stroke = resolveStroke(shape.stroke);
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
      <Path x={0} y={0} data={shape.pathData} {...fill} {...stroke} />
    </ShapeNode>
  );
}
