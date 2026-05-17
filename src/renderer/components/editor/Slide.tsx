import { Group, Rect } from 'react-konva';
import type { Slide as SlideModel } from '@renderer/lib/model/schema';

// Рендер одного слайда внутри Stage. На пункте 2.4 это только белый фон
// слайда + рамка с тенью. Фигуры (RectShape, EllipseShape и т.д.) появятся
// начиная с 2.6, и будут отрисованы внутри этой же группы.

interface SlideProps {
  slide: SlideModel;
  width: number;
  height: number;
}

export function Slide({ slide, width, height }: SlideProps) {
  // Цвет фона: при background.type === 'color' берём заданный; иначе белый
  // (theme и image заработают в 2.28 Background editor).
  const bgColor =
    slide.background?.type === 'color' && slide.background.color
      ? slide.background.color
      : '#ffffff';

  return (
    <Group>
      {/* Фон слайда с лёгкой тенью, чтобы визуально отделить от canvas-зоны. */}
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
      />
      {/* Здесь в 2.6+ будут отрисовываться slide.shapes. */}
    </Group>
  );
}
