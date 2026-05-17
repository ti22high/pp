import { Rect } from 'react-konva';
import type Konva from 'konva';
import type { RectShape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import { resolveFill, resolveStroke } from './paint';

interface RectShapeViewProps {
  shape: RectShape;
  slideId: string;
}

// Konva-рендер прямоугольной фигуры. Поддерживает:
// - заливку и обводку из shape.fill/stroke (через resolveFill/resolveStroke),
// - drag через встроенный Konva dragstart/dragend (запись в deckStore при drop),
// - выделение по клику (single-select; multi-select появится в 2.15).
export function RectShapeView({ shape, slideId }: RectShapeViewProps) {
  const fillProps = resolveFill(shape.fill);
  const strokeProps = resolveStroke(shape.stroke);
  const select = useSelectionStore((s) => s.select);
  const updateShape = useDeckStore.getState; // используем напрямую через get
  const snapToGrid = useUiStore((s) => s.snapToGrid);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let nextX = node.x();
    let nextY = node.y();
    if (snapToGrid) {
      // Snap to grid появится в 2.17; здесь — простое округление к шагу 10 px.
      nextX = Math.round(nextX / 10) * 10;
      nextY = Math.round(nextY / 10) * 10;
      node.x(nextX);
      node.y(nextY);
    }
    // Записываем новую позицию в deckStore (мутация через immer).
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shape.id);
      if (sh && sh.type === 'rect') {
        sh.x = nextX;
        sh.y = nextY;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
    // Заглушаем lint про неиспользованную переменную: updateShape оставлен
    // как hook для 2.7/2.12 (resize/inspector).
    void updateShape;
  };

  return (
    <Rect
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      rotation={shape.rotation ?? 0}
      opacity={shape.opacity ?? 1}
      cornerRadius={shape.cornerRadius ?? 0}
      draggable={!shape.locked}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.cancelBubble = true;
        select([shape.id]);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        select([shape.id]);
      }}
      {...fillProps}
      {...strokeProps}
    />
  );
}
