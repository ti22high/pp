import { Ellipse } from 'react-konva';
import type { EllipseShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { resolveFill, resolveStroke, resolveShadow } from './paint';

interface EllipseShapeViewProps {
  shape: EllipseShape;
  slideId: string;
}

// Эллипс рисуем внутри Group в локальных координатах:
// центр — (w/2, h/2), радиусы — w/2 и h/2. ShapeNode отвечает за position/rotation.
export function EllipseShapeView({ shape, slideId }: EllipseShapeViewProps) {
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
      <Ellipse
        x={shape.w / 2}
        y={shape.h / 2}
        radiusX={shape.w / 2}
        radiusY={shape.h / 2}
        {...fillProps}
        {...strokeProps}
        {...shadowProps}
      />
    </ShapeNode>
  );
}
