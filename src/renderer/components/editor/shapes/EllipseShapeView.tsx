import { Ellipse } from 'react-konva';
import type Konva from 'konva';
import type { EllipseShape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { resolveFill, resolveStroke } from './paint';

interface EllipseShapeViewProps {
  shape: EllipseShape;
  slideId: string;
}

// Konva.Ellipse рисует относительно центра — конвертируем bbox в (cx, cy, rx, ry).
export function EllipseShapeView({ shape, slideId }: EllipseShapeViewProps) {
  const fill = resolveFill(shape.fill);
  const stroke = resolveStroke(shape.stroke);
  const select = useSelectionStore((s) => s.select);

  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shape.id);
      if (sh && sh.type === 'ellipse') {
        // Возвращаем bbox: top-left = center - radius.
        sh.x = node.x() - shape.w / 2;
        sh.y = node.y() - shape.h / 2;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <Ellipse
      id={shape.id}
      x={cx}
      y={cy}
      radiusX={shape.w / 2}
      radiusY={shape.h / 2}
      rotation={shape.rotation ?? 0}
      opacity={shape.opacity ?? 1}
      draggable={!shape.locked}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.cancelBubble = true;
        select([shape.id]);
      }}
      {...fill}
      {...stroke}
    />
  );
}
