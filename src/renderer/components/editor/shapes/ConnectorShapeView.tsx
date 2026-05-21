import { memo } from 'react';
import { Group, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { ConnectorShape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { resolveEndpoint, connectorPoints } from '@renderer/lib/connector';

interface ConnectorShapeViewProps {
  shape: ConnectorShape;
  slideId: string;
}

// Рендер коннектора (Phase 3.15): стрелка между двумя точками (свободными или
// привязанными к фигурам). Тип маршрута: прямой / угловой / кривой. Вся линия
// перетаскивается как целое (Group draggable); концы сдвигаются на дельту.
// Привязка концов к точкам фигур и их перетаскивание — отдельный оверлей
// (ConnectorOverlay, Phase 3.15a).
export const ConnectorShapeView = memo(function ConnectorShapeViewBase({ shape, slideId }: ConnectorShapeViewProps) {
  // Подписываемся на весь слайд, чтобы линия следовала за привязанными
  // фигурами при их перемещении.
  const shapes = useDeckStore((s) => s.deck?.slides[slideId]?.shapes ?? []);
  const spaceHeld = useUiStore((s) => s.spaceHeld);

  const a = resolveEndpoint(shape.start, shapes);
  const b = resolveEndpoint(shape.end, shapes);
  const pts = connectorPoints(shape.connectorType, a, b, { x: shape.midX, y: shape.midY });
  const bezier = shape.connectorType === 'curved';

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const dx = node.x();
    const dy = node.y();
    node.position({ x: 0, y: 0 });
    if (dx === 0 && dy === 0) return;
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      const sh = slide?.shapes.find((s) => s.id === shape.id);
      if (!sh || sh.type !== 'connector') return;
      // Сдвигаем только свободные концы; привязанные остаются на фигуре.
      if (!sh.start.shapeId) {
        sh.start.x += dx;
        sh.start.y += dy;
      }
      if (!sh.end.shapeId) {
        sh.end.x += dx;
        sh.end.y += dy;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <Group id={shape.id} name="shape-root" draggable={!shape.locked && !spaceHeld} onDragEnd={handleDragEnd}>
      <Arrow
        points={pts}
        bezier={bezier}
        stroke={shape.stroke?.color ?? '#202124'}
        strokeWidth={shape.stroke?.width ?? 2}
        fill={shape.stroke?.color ?? '#202124'}
        dash={shape.stroke?.dash}
        pointerAtBeginning={shape.arrowStart ?? false}
        pointerAtEnding={shape.arrowEnd ?? false}
        pointerLength={10}
        pointerWidth={10}
        hitStrokeWidth={12}
        opacity={shape.opacity ?? 1}
        lineJoin="round"
        lineCap="round"
      />
    </Group>
  );
});
