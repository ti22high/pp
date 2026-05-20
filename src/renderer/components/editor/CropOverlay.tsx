import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Shape, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useCropBridge } from '@renderer/stores/cropBridge';
import { applyImageCrop } from '@renderer/lib/slides';
import { maskClipFunc } from '@renderer/lib/imageMasks';
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

// Оверлей обрезки изображения (Phase 3.2/3.3). Рендерится в Stage (slide-coords).
// Прямоугольная рамка задаёт окно кропа. Если у изображения есть маска-форма,
// форма «приклеена» к полному кадру: кроп режет саму форму (например, верх
// сердца), а не сжимает её под новый бокс.
export function CropOverlay({ slideId }: CropOverlayProps) {
  const croppingId = useUiStore((s) => s.croppingShapeId);
  const setCroppingShape = useUiStore((s) => s.setCroppingShape);
  const shape = useDeckStore((s) => {
    const slide = s.deck?.slides[slideId];
    const sh = slide?.shapes.find((x) => x.id === croppingId);
    return sh && sh.type === 'image' ? sh : null;
  });
  const img = useImageElement(shape?.src ?? null);
  const mask = shape?.maskShape ?? null;

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

  const [rect, setRect] = useState<Box | null>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (shape) setRect({ x: shape.x, y: shape.y, w: shape.w, h: shape.h });
    else setRect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppingId]);

  const rectReady = rect !== null;
  useEffect(() => {
    const tr = trRef.current;
    const node = rectRef.current;
    if (tr && node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [rectReady, img]);

  const confirm = () => {
    if (!shape || !rect || !full) {
      setCroppingShape(null);
      return;
    }
    const cropFrac = {
      x: (rect.x - full.x) / full.w,
      y: (rect.y - full.y) / full.h,
      w: rect.w / full.w,
      h: rect.h / full.h,
    };
    applyImageCrop(slideId, shape.id, cropFrac, rect);
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
    useCropBridge.getState().setHandlers(confirm, cancel);
    return () => {
      window.removeEventListener('keydown', onKey);
      useCropBridge.getState().setHandlers(null, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppingId, rect, shape]);

  if (!croppingId || !shape || !img || !rect || !full) return null;

  // Рамка кропа не выходит за полный кадр.
  const clampRect = (b: Box): Box => {
    const w = Math.min(b.w, full.w);
    const h = Math.min(b.h, full.h);
    const x = Math.max(full.x, Math.min(b.x, full.x + full.w - w));
    const y = Math.max(full.y, Math.min(b.y, full.y + full.h - h));
    return { x, y, w, h };
  };

  return (
    <>
      {/* Полный кадр затемнён. Если есть маска — затемнённую часть тоже
          показываем по форме (приклеена к полному кадру). */}
      {mask ? (
        <Group
          clipFunc={(ctx) => maskClipFunc(mask, full.x, full.y, full.w, full.h)(ctx)}
          listening={false}
        >
          <KonvaImage x={full.x} y={full.y} width={full.w} height={full.h} image={img} opacity={0.35} listening={false} />
        </Group>
      ) : (
        <KonvaImage x={full.x} y={full.y} width={full.w} height={full.h} image={img} opacity={0.35} listening={false} />
      )}

      {/* Яркая область = внутри рамки И внутри формы (если есть маска). */}
      <Group clipX={rect.x} clipY={rect.y} clipWidth={rect.w} clipHeight={rect.h} listening={false}>
        {mask ? (
          <Group clipFunc={(ctx) => maskClipFunc(mask, full.x, full.y, full.w, full.h)(ctx)} listening={false}>
            <KonvaImage x={full.x} y={full.y} width={full.w} height={full.h} image={img} listening={false} />
          </Group>
        ) : (
          <KonvaImage x={full.x} y={full.y} width={full.w} height={full.h} image={img} listening={false} />
        )}
      </Group>

      {/* Контур формы (приклеен к полному кадру) — видно, что режем форму. */}
      {mask && (
        <Shape
          x={0}
          y={0}
          listening={false}
          stroke="#1a73e8"
          strokeWidth={1}
          opacity={0.5}
          strokeScaleEnabled={false}
          sceneFunc={(ctx, s) => {
            maskClipFunc(mask, full.x, full.y, full.w, full.h)(ctx);
            ctx.strokeShape(s);
          }}
        />
      )}

      {/* Прямоугольная рамка кропа. */}
      <Rect
        ref={rectRef}
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        stroke="#1a73e8"
        strokeWidth={2}
        strokeScaleEnabled={false}
        draggable
        onDragMove={(e) => {
          const next = clampRect({ x: e.target.x(), y: e.target.y(), w: rect.w, h: rect.h });
          e.target.position({ x: next.x, y: next.y });
          setRect(next);
        }}
        onTransform={(e) => {
          const node = e.target as Konva.Rect;
          const w = Math.max(10, node.width() * node.scaleX());
          const h = Math.max(10, node.height() * node.scaleY());
          node.scaleX(1);
          node.scaleY(1);
          const next = clampRect({ x: node.x(), y: node.y(), w, h });
          node.position({ x: next.x, y: next.y });
          node.width(next.w);
          node.height(next.h);
          setRect(next);
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
