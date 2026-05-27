import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { EquationShape } from '@renderer/lib/model/schema';
import { renderEquationHtml } from '@renderer/lib/equation';

interface EquationOverlayProps {
  shape: EquationShape;
  panX: number;
  panY: number;
  zoom: number;
}

// DOM-визуал формулы (Phase 3.24, SPEC §6.6): KaTeX-HTML поверх Konva в
// screen-координатах. pointer-events:none — клики проходят на прокси-rect
// (EquationShapeView), поэтому выделение/перетаскивание/масштаб работают через
// Konva. Натуральный размер KaTeX измеряем и масштабируем под bbox*zoom.
export function EquationOverlay({ shape, panX, panY, zoom }: EquationOverlayProps) {
  const html = useMemo(() => renderEquationHtml(shape.latex), [shape.latex]);
  const innerRef = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState({ w: 1, h: 1 });

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    setNat({ w: Math.max(1, el.offsetWidth), h: Math.max(1, el.offsetHeight) });
  }, [html]);

  const outer: CSSProperties = {
    position: 'absolute',
    left: panX + shape.x * zoom,
    top: panY + shape.y * zoom,
    width: shape.w * zoom,
    height: shape.h * zoom,
    transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
    transformOrigin: 'top left',
    pointerEvents: 'none',
    opacity: shape.opacity ?? 1,
  };

  if (shape.latex.trim() === '') {
    return (
      <div className="equation-overlay equation-overlay--empty" style={outer}>
        формула…
      </div>
    );
  }

  const inner: CSSProperties = {
    display: 'inline-block',
    transformOrigin: '0 0',
    transform: `scale(${(shape.w * zoom) / nat.w}, ${(shape.h * zoom) / nat.h})`,
  };

  return (
    <div className="equation-overlay" style={outer}>
      <div ref={innerRef} style={inner} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
