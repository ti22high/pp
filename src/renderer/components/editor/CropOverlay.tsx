import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Shape, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useCropBridge } from '@renderer/stores/cropBridge';
import { applyImageCrop, setImageCropAbsolute } from '@renderer/lib/slides';
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
// Два режима:
//  - БЕЗ маски: рамка-прямоугольник = область кропа, её двигают/тянут.
//  - С маской (fill, как в PowerPoint): форма зафиксирована на bbox, двигается
//    и масштабируется само изображение «под» формой (выбор заполнения).
export function CropOverlay({ slideId }: CropOverlayProps) {
  const croppingId = useUiStore((s) => s.croppingShapeId);
  const setCroppingShape = useUiStore((s) => s.setCroppingShape);
  const shape = useDeckStore((s) => {
    const slide = s.deck?.slides[slideId];
    const sh = slide?.shapes.find((x) => x.id === croppingId);
    return sh && sh.type === 'image' ? sh : null;
  });
  const img = useImageElement(shape?.src ?? null);
  const masked = !!shape?.maskShape;

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
  // Зафиксированная форма-рамка (= display bbox фигуры) для masked-режима.
  const fixedFrame: Box | null = shape
    ? { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
    : null;

  // rect: в rect-режиме это область кропа; в masked-режиме это рамка
  // изображения (двигается/масштабируется), а форма берётся из fixedFrame.
  const [rect, setRect] = useState<Box | null>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!shape) {
      setRect(null);
      return;
    }
    // В обоих режимах rect = текущий bbox фигуры.
    // Masked → rect это форма (двигаем/тянем форму, картинка cover-вписывается).
    // Rect → rect это область кропа.
    setRect({ x: shape.x, y: shape.y, w: shape.w, h: shape.h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppingId]);

  // Cover-fit: прямоугольник, в который вписана картинка целиком, покрывая
  // рамку формы (frame) без искажения пропорций, по центру.
  const coverDisp = (frame: Box): Box => {
    const nW = img?.naturalWidth ?? 1;
    const nH = img?.naturalHeight ?? 1;
    const scale = Math.max(frame.w / nW, frame.h / nH);
    const w = nW * scale;
    const h = nH * scale;
    return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
  };

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
    if (!shape || !rect || !full || !fixedFrame) {
      setCroppingShape(null);
      return;
    }
    if (masked) {
      // Картинка cover-вписана в форму (rect). crop = доля формы внутри
      // cover-прямоугольника картинки — гарантированно без искажения.
      const disp = coverDisp(rect);
      const cropFrac = {
        x: (rect.x - disp.x) / disp.w,
        y: (rect.y - disp.y) / disp.h,
        w: rect.w / disp.w,
        h: rect.h / disp.h,
      };
      setImageCropAbsolute(slideId, shape.id, cropFrac, rect);
    } else {
      const cropFrac = {
        x: (rect.x - full.x) / full.w,
        y: (rect.y - full.y) / full.h,
        w: rect.w / full.w,
        h: rect.h / full.h,
      };
      applyImageCrop(slideId, shape.id, cropFrac, rect);
    }
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

  if (!croppingId || !shape || !img || !rect || !full || !fixedFrame) return null;

  // rect-режим: область кропа не выходит за полный кадр.
  const clampRect = (b: Box): Box => {
    const w = Math.min(b.w, full.w);
    const h = Math.min(b.h, full.h);
    const x = Math.max(full.x, Math.min(b.x, full.x + full.w - w));
    const y = Math.max(full.y, Math.min(b.y, full.y + full.h - h));
    return { x, y, w, h };
  };

  // Cover-вписанная картинка для текущей формы (masked-режим).
  const disp = masked ? coverDisp(rect) : full;

  return (
    <>
      {masked ? (
        <>
          {/* Cover-вписанная картинка целиком, затемнена. */}
          <KonvaImage
            x={disp.x}
            y={disp.y}
            width={disp.w}
            height={disp.h}
            image={img}
            opacity={0.35}
            listening={false}
          />
          {/* Яркая часть — внутри формы (= рамка). */}
          <Group
            clipFunc={(ctx) =>
              maskClipFunc(shape.maskShape!, rect.x, rect.y, rect.w, rect.h)(ctx)
            }
            listening={false}
          >
            <KonvaImage x={disp.x} y={disp.y} width={disp.w} height={disp.h} image={img} listening={false} />
          </Group>
          {/* Контур формы (= рамка, двигается/тянется). */}
          <Shape
            x={0}
            y={0}
            listening={false}
            stroke="#1a73e8"
            strokeWidth={2}
            strokeScaleEnabled={false}
            sceneFunc={(ctx, s) => {
              maskClipFunc(shape.maskShape!, rect.x, rect.y, rect.w, rect.h)(ctx);
              ctx.strokeShape(s);
            }}
          />
          {/* Прокси-рамка формы: drag + resize (картинка cover-перевписывается). */}
          <Rect
            ref={rectRef}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            stroke="#9aa0a6"
            strokeWidth={1}
            dash={[4, 3]}
            strokeScaleEnabled={false}
            draggable
            onDragMove={(e) => {
              setRect({ x: e.target.x(), y: e.target.y(), w: rect.w, h: rect.h });
            }}
            onTransform={(e) => {
              const node = e.target as Konva.Rect;
              const w = Math.max(10, node.width() * node.scaleX());
              const h = Math.max(10, node.height() * node.scaleY());
              node.scaleX(1);
              node.scaleY(1);
              node.width(w);
              node.height(h);
              setRect({ x: node.x(), y: node.y(), w, h });
            }}
          />
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            anchorSize={9}
            anchorCornerRadius={2}
            borderStroke="#9aa0a6"
            anchorStroke="#1a73e8"
            anchorFill="#ffffff"
            padding={0}
            boundBoxFunc={(oldB, newB) => (newB.width < 10 || newB.height < 10 ? oldB : newB)}
          />
        </>
      ) : (
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
      )}
    </>
  );
}
