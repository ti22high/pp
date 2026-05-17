import { Group, Rect } from 'react-konva';
import type { Slide as SlideModel } from '@renderer/lib/model/schema';
import { RectShapeView } from './shapes/RectShapeView';

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
        if (shape.type === 'rect') {
          return <RectShapeView key={shape.id} shape={shape} slideId={slide.id} />;
        }
        // Остальные типы — в 2.8/2.10.
        return null;
      })}
    </Group>
  );
}
