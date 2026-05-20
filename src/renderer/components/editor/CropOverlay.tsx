import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useCropBridge } from '@renderer/stores/cropBridge';
import { cropImageBaked } from '@renderer/lib/imageBake';
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

// Оверлей обрезки изображения (Phase 3.2). Прямоугольная рамка задаёт окно
// кропа; на подтверждении результат «запекается» в новый src (lib/imageBake).
// Если картинка уже имеет форму (маска впечатана), кроп режет именно её.
export function CropOverlay({ slideId }: CropOverlayProps) {
  const croppingId = useUiStore((s) => s.croppingShapeId);
  const setCroppingShape = useUiStore((s) => s.setCroppingShape);
  const shape = useDeckStore((s) => {
    const slide = s.deck?.slides[slideId];
    const sh = slide?.shapes.find((x) => x.id === croppingId);
    return sh && sh.type === 'image' ? sh : null;
  });
  const img = useImageElement(shape?.src ?? null);

  // Изображение запечено без отдельного кропа, поэтому полный кадр = bbox.
  const full: Box | null = shape
    ? { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
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
    const region = {
      x: (rect.x - full.x) / full.w,
      y: (rect.y - full.y) / full.h,
      w: rect.w / full.w,
      h: rect.h / full.h,
    };
    void cropImageBaked(slideId, shape.id, region, rect);
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

  const clampRect = (b: Box): Box => {
    const w = Math.min(b.w, full.w);
    const h = Math.min(b.h, full.h);
    const x = Math.max(full.x, Math.min(b.x, full.x + full.w - w));
    const y = Math.max(full.y, Math.min(b.y, full.y + full.h - h));
    return { x, y, w, h };
  };

  return (
    <>
      {/* Полный кадр затемнён. */}
      <KonvaImage x={full.x} y={full.y} width={full.w} height={full.h} image={img} opacity={0.35} listening={false} />
      {/* Яркая область внутри рамки. */}
      <Group clipX={rect.x} clipY={rect.y} clipWidth={rect.w} clipHeight={rect.h} listening={false}>
        <KonvaImage x={full.x} y={full.y} width={full.w} height={full.h} image={img} listening={false} />
      </Group>
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
