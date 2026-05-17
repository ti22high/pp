import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { Slide } from './Slide';

// Canvas — хост Konva Stage. Размер стейджа адаптируется к контейнеру.
// Содержимое: один активный слайд, отцентрированный и масштабированный по uiStore.zoom.
// На пункте 2.4 — только zoom (wheel + Ctrl+0).
// Пан (Space+drag) появится в 2.5.

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.1;

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const deck = useDeckStore((s) => s.deck);
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const zoom = useUiStore((s) => s.zoom);
  const setZoom = useUiStore((s) => s.setZoom);
  const stagePan = useUiStore((s) => s.stagePan);

  // Отслеживаем размер контейнера через ResizeObserver, чтобы Stage не выходил
  // за пределы canvas-area и не оставлял пустоты при resize окна.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({ width: Math.max(100, width), height: Math.max(100, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Глобальная клавиатура: Ctrl+0 сбрасывает зум к 100 %.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        useUiStore.getState().setStagePan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setZoom]);

  // Зум колесом — относительно позиции указателя (нативное поведение Slides).
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale =
        direction > 0
          ? Math.min(MAX_ZOOM, oldScale * ZOOM_STEP)
          : Math.max(MIN_ZOOM, oldScale / ZOOM_STEP);

      // Сохраняем позицию указателя относительно содержимого: меняем pan так,
      // чтобы точка под курсором осталась на месте после смены масштаба.
      const mouseRelToContent = {
        x: (pointer.x - stagePan.x) / oldScale,
        y: (pointer.y - stagePan.y) / oldScale,
      };
      const newPan = {
        x: pointer.x - mouseRelToContent.x * newScale,
        y: pointer.y - mouseRelToContent.y * newScale,
      };
      setZoom(newScale);
      useUiStore.getState().setStagePan(newPan);
    },
    [zoom, stagePan, setZoom],
  );

  if (!deck || !activeSlideId) {
    return (
      <div className="app-canvas">
        <div className="placeholder">No deck loaded</div>
      </div>
    );
  }

  const slide = deck.slides[activeSlideId];
  if (!slide) {
    return (
      <div className="app-canvas">
        <div className="placeholder">Active slide not found</div>
      </div>
    );
  }

  // Изначальное центрирование стейджа: если pan = 0/0, кладём слайд по центру.
  // (Если пользователь уже двигал/зумил — сохраняем явный pan из стора.)
  const slideW = deck.size.w;
  const slideH = deck.size.h;
  const centerOffsetX = (stageSize.width - slideW * zoom) / 2;
  const centerOffsetY = (stageSize.height - slideH * zoom) / 2;
  const effectivePanX = stagePan.x === 0 ? centerOffsetX : stagePan.x;
  const effectivePanY = stagePan.y === 0 ? centerOffsetY : stagePan.y;

  return (
    <div ref={containerRef} className="app-canvas">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={effectivePanX}
        y={effectivePanY}
        onWheel={handleWheel}
      >
        <Layer>
          <Slide slide={slide} width={slideW} height={slideH} />
        </Layer>
      </Stage>
    </div>
  );
}
