import { Line, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { LineShape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { resolveStroke } from './paint';

interface LineShapeViewProps {
  shape: LineShape;
  slideId: string;
}

// Линия / стрелка. shape.points = [x1, y1, x2, y2] в локальных координатах от shape.x/y.
// При наличии arrowStart/arrowEnd рисуем Konva.Arrow, иначе Konva.Line.
export function LineShapeView({ shape, slideId }: LineShapeViewProps) {
  const stroke = resolveStroke(shape.stroke);
  const select = useSelectionStore((s) => s.select);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shape.id);
      if (sh && sh.type === 'line') {
        sh.x = node.x();
        sh.y = node.y();
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const common = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    points: shape.points as unknown as number[],
    rotation: shape.rotation ?? 0,
    opacity: shape.opacity ?? 1,
    draggable: !shape.locked,
    onDragEnd: handleDragEnd,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      select([shape.id]);
    },
    hitStrokeWidth: 12, // делаем тонкую линию удобной для клика
    ...stroke,
  };

  if (shape.arrowStart || shape.arrowEnd) {
    return (
      <Arrow
        {...common}
        pointerAtBeginning={!!shape.arrowStart}
        pointerAtEnding={!!shape.arrowEnd}
        fill={stroke.stroke}
      />
    );
  }
  return <Line {...common} />;
}
