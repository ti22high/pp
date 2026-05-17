import { Group, Rect } from 'react-konva';
import type { Slide as SlideModel } from '@renderer/lib/model/schema';
import { RectShapeView } from './shapes/RectShapeView';
import { EllipseShapeView } from './shapes/EllipseShapeView';
import { LineShapeView } from './shapes/LineShapeView';
import { PathShapeView } from './shapes/PathShapeView';

// Рендер одного слайда внутри Stage: фон + все фигуры в z-order.
// Каждый ShapeView сам подписан на свой кусок deckStore через id.

interface SlideProps {
  slide: SlideModel;
  width: number;
  height: number;
}

export function Slide({ slide, width, height }: SlideProps) {
  const bgColor =
    slide.background?.type === 'color' && slide.background.color
      ? slide.background.color
      : '#ffffff';

  return (
    <Group>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={bgColor}
        shadowColor="#000"
        shadowBlur={12}
        shadowOpacity={0.18}
        shadowOffset={{ x: 0, y: 2 }}
        listening={false}
      />
      {slide.shapes.map((shape) => {
        switch (shape.type) {
          case 'rect':
            return <RectShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'ellipse':
            return <EllipseShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'line':
            return <LineShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'path':
            return <PathShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          default:
            // TextShape — пункт 2.10; image/table/chart/equation/video — Phase 3.
            return null;
        }
      })}
    </Group>
  );
}
