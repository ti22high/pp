import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { applyImageCrop } from '@renderer/lib/slides';
import { useImageElement } from './shapes/useImageElement';

interface CropOverlayProps {
  slideId: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Оверлей обрезки изображения (Phase 3.2). Рендерится в Stage (slide-coords),
// поэтому pan/zoom учитываются автоматически. Показывает полный кадр затемнённым,
// яркой остаётся только область внутри рамки-кропа. Рамку можно двигать и
// тянуть за ручки в пределах картинки. Enter — применить, Esc — отмена.
export function CropOverlay({ slideId }: CropOverlayProps) {
  const croppingId = useUiStore((s) => s.croppingShapeId);
  const setCroppingShape = useUiStore((s) => s.setCroppingShape);
  const shape = useDeckStore((s) => {
    const slide = s.deck?.slides[slideId];
    const sh = slide?.shapes.find((x) => x.id === croppingId);
    return sh && sh.type === 'image' ? sh : null;
  });
  const img = useImageElement(shape?.src ?? null);

  const frameRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [frame, setFrame] = useState<Box | null>(null);

  // Полный кадр в slide-coords (исходя из текущего кропа фигуры).
  const crop = shape?.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const full: Box | null = shape
    ? {
        x: shape.x - (crop.x / crop.w) * shape.w,
        y: shape.y - (crop.y / crop.h) * shape.h,
        w: shape.w / crop.w,
        h: shape.h / crop.h,
      }
    : null;

  // Инициализация рамки текущим display-боксом при входе в режим.
  useEffect(() => {
    if (shape) setFrame({ x: shape.x, y: shape.y, w: shape.w, h: shape.h });
    else setFrame(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppingId]);

  // Привязка Transformer к рамке.
  const frameReady = frame !== null;
  useEffect(() => {
    const tr = trRef.current;
    const node = frameRef.current;
    if (tr && node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [frameReady, img]);

  const confirm = () => {
    if (!shape || !frame || !full) {
      setCroppingShape(null);
      return;
    }
    const cropFrac = {
      x: (frame.x - full.x) / full.w,
      y: (frame.y - full.y) / full.h,
      w: frame.w / full.w,
      h: frame.h / full.h,
    };
    applyImageCrop(slideId, shape.id, cropFrac, frame);
    setCroppingShape(null);
  };
  const cancel = () => setCroppingShape(null);

  useEffect(() => {
    if (!croppingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppingId, frame, shape]);

  if (!croppingId || !shape || !img || !frame || !full) return null;

  // Клемпинг рамки в пределах полного кадра.
  const clamp = (b: Box): Box => {
    const w = Math.min(b.w, full.w);
    const h = Math.min(b.h, full.h);
    const x = Math.max(full.x, Math.min(b.x, full.x + full.w - w));
    const y = Math.max(full.y, Math.min(b.y, full.y + full.h - h));
    return { x, y, w, h };
  };

  return (
    <>
      {/* Полный кадр затемнён. */}
      <KonvaImage
        x={full.x}
        y={full.y}
        width={full.w}
        height={full.h}
        image={img}
        opacity={0.35}
        listening={false}
      />
      {/* Яркая область внутри рамки (полный кадр, обрезанный clip-ом). */}
      <Group
        clipX={frame.x}
        clipY={frame.y}
        clipWidth={frame.w}
        clipHeight={frame.h}
        listening={false}
      >
        <KonvaImage
          x={full.x}
          y={full.y}
          width={full.w}
          height={full.h}
          image={img}
          listening={false}
        />
      </Group>
      {/* Рамка-кроп: перетаскивание + ручки. */}
      <Rect
        ref={frameRef}
        x={frame.x}
        y={frame.y}
        width={frame.w}
        height={frame.h}
        stroke="#1a73e8"
        strokeWidth={2}
        strokeScaleEnabled={false}
        draggable
        onDragMove={(e) => {
          const next = clamp({ x: e.target.x(), y: e.target.y(), w: frame.w, h: frame.h });
          e.target.position({ x: next.x, y: next.y });
          setFrame(next);
        }}
        onTransform={(e) => {
          const node = e.target as Konva.Rect;
          const w = Math.max(10, node.width() * node.scaleX());
          const h = Math.max(10, node.height() * node.scaleY());
          node.scaleX(1);
          node.scaleY(1);
          node.width(w);
          node.height(h);
          const next = clamp({ x: node.x(), y: node.y(), w, h });
          node.position({ x: next.x, y: next.y });
          node.width(next.w);
          node.height(next.h);
          setFrame(next);
        }}
      />
      <Transformer
        ref={trRef}
        rotateEnabled={false}
        anchorSize={9}
        anchorCornerRadius={2}
        borderStroke="#1a73e8"
        anchorStroke="#1a73e8"
        anchorFill="#ffffff"
        padding={0}
        boundBoxFunc={(oldB, newB) => (newB.width < 10 || newB.height < 10 ? oldB : newB)}
      />
    </>
  );
}
