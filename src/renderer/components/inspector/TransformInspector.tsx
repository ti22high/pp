import { useDeckStore } from '@renderer/stores/deck';
import type { ShapeId, SlideId } from '@shared/types';
import { NumberField } from './NumberField';

interface TransformInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
}

// Секция «Transform»: позиция (X, Y), размер (W, H), угол поворота.
// Read-side: подписываемся на конкретную фигуру в deck-стор; при drag/resize
// на канвасе модель обновляется, и поля автоматически перерисовываются.
// Write-side: на commit поля (Enter/blur) — immer-мутация по тому же
// паттерну, что в SelectionTransformer и ShapeNode.
export function TransformInspector({ slideId, shapeId }: TransformInspectorProps) {
  const shape = useDeckStore((s) => {
    const slide = s.deck?.slides[slideId];
    return slide?.shapes.find((sh) => sh.id === shapeId) ?? null;
  });

  if (!shape) return null;

  const update = (patch: { x?: number; y?: number; w?: number; h?: number; rotation?: number }) => {
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shapeId);
      if (!sh) return;
      if (patch.x !== undefined) sh.x = patch.x;
      if (patch.y !== undefined) sh.y = patch.y;
      if (patch.w !== undefined) sh.w = patch.w;
      if (patch.h !== undefined) sh.h = patch.h;
      if (patch.rotation !== undefined) sh.rotation = patch.rotation;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <section className="inspector-section">
      <p className="panel-title">Transform</p>
      <div className="inspector-grid-2">
        <NumberField label="X" value={shape.x} onCommit={(v) => update({ x: v })} />
        <NumberField label="Y" value={shape.y} onCommit={(v) => update({ y: v })} />
        <NumberField label="W" value={shape.w} min={2} onCommit={(v) => update({ w: v })} />
        <NumberField label="H" value={shape.h} min={2} onCommit={(v) => update({ h: v })} />
      </div>
      <NumberField
        label="Rotation"
        value={shape.rotation ?? 0}
        suffix="°"
        onCommit={(v) => update({ rotation: v })}
      />
    </section>
  );
}
