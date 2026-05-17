import { Path } from 'react-konva';
import type Konva from 'konva';
import type { PathShape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { resolveFill, resolveStroke } from './paint';

interface PathShapeViewProps {
  shape: PathShape;
  slideId: string;
}

// Произвольная фигура через SVG-path data. Используется и для freeform/scribble
// (Phase 3.16), и для preset shapes из ECMA-376 (Phase 3.20).
export function PathShapeView({ shape, slideId }: PathShapeViewProps) {
  const fill = resolveFill(shape.fill);
  const stroke = resolveStroke(shape.stroke);
  const select = useSelectionStore((s) => s.select);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shape.id);
      if (sh && sh.type === 'path') {
        sh.x = node.x();
        sh.y = node.y();
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <Path
      id={shape.id}
      x={shape.x}
      y={shape.y}
      data={shape.pathData}
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
