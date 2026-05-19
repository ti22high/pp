import { useEffect, useRef, useState, type RefObject } from 'react';
import { useUiStore } from '@renderer/stores/ui';

interface RulersProps {
  containerRef: RefObject<HTMLDivElement | null>;
  stageW: number;
  stageH: number;
  panX: number;
  panY: number;
  zoom: number;
}

// Линейки вокруг канваса (верх + лево). 0 шкалы = top-left активного слайда
// (точка (0,0) в slide-coords). Шкала в пикселях слайд-координат, шаг тиков
// адаптируется к zoom-у через niceStep так, чтобы major-tick-и всегда были
// разнесены примерно на 80 экранных px.
//
// Размер полосы — 22 px. CSS-разметка: оба canvas-а абсолютно позиционированы
// поверх stage, в углу — корнер-квадрат. pointer-events: none, чтобы клики
// проходили к stage. Курсор отслеживается через window mousemove.

const RULER_SIZE = 22;
const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
const TARGET_PX_BETWEEN_MAJOR = 80;

function niceStep(approxSlideStep: number): number {
  for (const s of NICE_STEPS) {
    if (s >= approxSlideStep) return s;
  }
  return NICE_STEPS[NICE_STEPS.length - 1];
}

export function Rulers({
  containerRef,
  stageW,
  stageH,
  panX,
  panY,
  zoom,
}: RulersProps) {
  const showRuler = useUiStore((s) => s.showRuler);
  const hRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<HTMLCanvasElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const nextPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Подписка на mousemove: координаты приводим к относительным от
  // .app-canvas. Через rAF throttle, чтобы pointer обновлялся не чаще
  // одного раза за кадр.
  useEffect(() => {
    if (!showRuler) return;
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        nextPointerRef.current = null;
      } else {
        nextPointerRef.current = { x, y };
      }
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setPointer(nextPointerRef.current);
        });
      }
    };
    const onLeave = () => {
      nextPointerRef.current = null;
      setPointer(null);
    };
    window.addEventListener('mousemove', onMove);
    const el = containerRef.current;
    el?.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el?.removeEventListener('mouseleave', onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [showRuler, containerRef]);

  // Перерисовка тиков и индикатора при любом изменении параметров.
  useEffect(() => {
    if (!showRuler) return;
    drawRuler(hRef.current, 'h', stageW, panX, zoom, pointer?.x ?? null);
    drawRuler(vRef.current, 'v', stageH, panY, zoom, pointer?.y ?? null);
  }, [showRuler, stageW, stageH, panX, panY, zoom, pointer]);

  if (!showRuler) return null;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return (
    <>
      <canvas
        ref={hRef}
        className="ruler-h"
        width={Math.max(1, Math.round(stageW * dpr))}
        height={Math.round(RULER_SIZE * dpr)}
        style={{ width: stageW, height: RULER_SIZE }}
      />
      <canvas
        ref={vRef}
        className="ruler-v"
        width={Math.round(RULER_SIZE * dpr)}
        height={Math.max(1, Math.round(stageH * dpr))}
        style={{ width: RULER_SIZE, height: stageH }}
      />
      <div className="ruler-corner" />
    </>
  );
}

// Рисует линейку в canvas: major-тики + подписи, minor-тики (полу-длина),
// sub-tик-и (1/5 шаг от major). Координаты по короткой оси — экранные пиксели
// линейки (0..RULER_SIZE), по длинной — screen-coord в канвасе (0..stageSize).
function drawRuler(
  canvas: HTMLCanvasElement | null,
  axis: 'h' | 'v',
  stageSize: number,
  pan: number,
  zoom: number,
  cursor: number | null,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const longLen = stageSize;
  ctx.clearRect(0, 0, axis === 'h' ? longLen : RULER_SIZE, axis === 'h' ? RULER_SIZE : longLen);

  // Фон.
  ctx.fillStyle = '#fafafa';
  if (axis === 'h') ctx.fillRect(0, 0, longLen, RULER_SIZE);
  else ctx.fillRect(0, 0, RULER_SIZE, longLen);

  // Внутренняя граница (отделить от канваса).
  ctx.fillStyle = '#dadce0';
  if (axis === 'h') ctx.fillRect(0, RULER_SIZE - 1, longLen, 1);
  else ctx.fillRect(RULER_SIZE - 1, 0, 1, longLen);

  // Шаг тиков в slide-coords. Major раздвинуты на ~80 экранных px.
  const major = niceStep(TARGET_PX_BETWEEN_MAJOR / zoom);
  const sub = major / 5;

  // Диапазон видимых slide-coords.
  const startSlide = (0 - pan) / zoom;
  const endSlide = (longLen - pan) / zoom;
  // Округляем стартовый sub до кратного sub.
  const first = Math.floor(startSlide / sub) * sub;

  ctx.fillStyle = '#80868b';
  ctx.font = '10px Roboto, Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  for (let s = first; s <= endSlide + sub; s += sub) {
    // Скрываем дробные ошибки округления — приводим к ближайшему sub.
    const sRounded = Math.round(s / sub) * sub;
    const pos = pan + sRounded * zoom;
    if (pos < 0 || pos > longLen) continue;
    const isMajor = Math.abs(sRounded % major) < 0.0001;
    const isMid = !isMajor && Math.abs(sRounded % (major / 2)) < 0.0001;
    const len = isMajor ? RULER_SIZE - 6 : isMid ? RULER_SIZE - 12 : RULER_SIZE - 16;
    if (axis === 'h') {
      ctx.fillRect(Math.round(pos), RULER_SIZE - 1 - len, 1, len);
      if (isMajor) {
        const label = String(Math.round(sRounded));
        ctx.fillText(label, Math.round(pos), 2);
      }
    } else {
      ctx.fillRect(RULER_SIZE - 1 - len, Math.round(pos), len, 1);
      if (isMajor) {
        // Поворачиваем подпись на 90° для вертикальной линейки.
        ctx.save();
        ctx.translate(2, Math.round(pos));
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.round(sRounded)), 0, 0);
        ctx.restore();
      }
    }
  }

  // Индикатор позиции курсора — синяя полоса.
  if (cursor !== null && cursor >= 0 && cursor <= longLen) {
    ctx.fillStyle = '#1a73e8';
    if (axis === 'h') ctx.fillRect(Math.round(cursor), 0, 1, RULER_SIZE);
    else ctx.fillRect(0, Math.round(cursor), RULER_SIZE, 1);
  }
}
