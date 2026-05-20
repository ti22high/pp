import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';

interface AltHoverOverlayProps {
  slideId: string;
  panX: number;
  panY: number;
  zoom: number;
}

// DOM-оверлей подсказки с alt-текстом (Phase 3.7). При наведении на фигуру с
// заданным alt-текстом (когда включён showAltOnHover) аккуратно подсвечивает её
// bbox и показывает подпись над фигурой. Позиционируется поверх Stage в
// экранных координатах: screen = slideCoord * zoom + pan. Поворот игнорируем
// (подсветка по axis-aligned bbox — этого достаточно для подсказки).
export function AltHoverOverlay({ slideId, panX, panY, zoom }: AltHoverOverlayProps) {
  const hoveredId = useUiStore((s) => s.hoveredAltShapeId);
  const show = useUiStore((s) => s.showAltOnHover);
  const shape = useDeckStore((s) => {
    if (!hoveredId) return null;
    return s.deck?.slides[slideId]?.shapes.find((x) => x.id === hoveredId) ?? null;
  });

  if (!show || !shape || !shape.altText) return null;

  const left = shape.x * zoom + panX;
  const top = shape.y * zoom + panY;
  const width = shape.w * zoom;
  const height = shape.h * zoom;

  return (
    <div className="alt-hover" style={{ left, top, width, height }}>
      <span className="alt-hover__label">{shape.altText}</span>
    </div>
  );
}
