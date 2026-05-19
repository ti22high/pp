import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import type { ShapeId } from '@shared/types';
import { Slide } from './Slide';
import { SelectionTransformer } from './SelectionTransformer';
import { TextOverlay } from './TextOverlay';

// Canvas — хост Konva Stage. Размер стейджа адаптируется к контейнеру.
// Содержимое: один активный слайд, отцентрированный и масштабированный по uiStore.zoom.
// Pan/zoom состояния живут в uiStore.

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
  const setStagePan = useUiStore((s) => s.setStagePan);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const getStage = useCallback(() => stageRef.current, []);

  // Признак: пользователь уже менял pan/zoom вручную → не пере-центрируем автоматически.
  const [userMoved, setUserMoved] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  // Ref на актуальный pan для использования из event-callback без stale closure.
  const stagePanRef = useRef(stagePan);
  useEffect(() => {
    stagePanRef.current = stagePan;
  }, [stagePan]);

  // Rubber band — прямоугольник выделения, который пользователь рисует drag-ом
  // на пустом месте слайда. Координаты в slide-coords (т.е. с поправкой
  // на pan/zoom), чтобы оверлей-Rect внутри Stage с scaleX/Y={zoom} был
  // позиционирован корректно.
  const [rubberBand, setRubberBand] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const rubberStartRef = useRef<{
    x: number;
    y: number;
    additive: boolean; // shift зажат → добавляем к существующему выделению
    baseIds: ShapeId[]; // снимок выделения на момент начала drag-а (для additive)
  } | null>(null);
  // Ref на zoom — нужен в обработчиках mousedown/move без перепересоздания
  // callback-ов на каждый zoom-апдейт.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Отслеживаем размер контейнера через ResizeObserver.
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

  // Авто-центрирование: пока пользователь не сдвинул вьюпорт сам,
  // держим слайд по центру при ресайзе окна и смене зума.
  const slideW = deck?.size.w ?? 1920;
  const slideH = deck?.size.h ?? 1080;
  useEffect(() => {
    if (userMoved) return;
    const centerX = (stageSize.width - slideW * zoom) / 2;
    const centerY = (stageSize.height - slideH * zoom) / 2;
    setStagePan({ x: centerX, y: centerY });
  }, [userMoved, stageSize.width, stageSize.height, slideW, slideH, zoom, setStagePan]);

  // Клавиатура: Ctrl+0 — сброс зума и пана; Space — режим пана.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setUserMoved(false); // auto-центрирование снова возьмёт верх
        return;
      }
      if (e.code === 'Space' && !isInTextField(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        panStartRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setZoom]);

  // Один обработчик mousedown на Stage:
  // - Space зажат → начало pan,
  // - клик на анкоре Transformer-а → не трогаем выделение,
  // - клик в shape → select (Shift+click → toggle multi-select),
  // - клик в пустоту → начало rubber-band (Shift зажат → additive).
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      // Pan mode имеет приоритет.
      if (spaceHeld) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        panStartRef.current = {
          x: pointer.x,
          y: pointer.y,
          panX: stagePanRef.current.x,
          panY: stagePanRef.current.y,
        };
        e.evt.preventDefault();
        return;
      }

      // Список id фигур активного слайда — берём свежий snapshot из store,
      // чтобы не зависеть от React-замыкания.
      const deckNow = useDeckStore.getState().deck;
      const activeId = useUiStore.getState().activeSlideId;
      if (!deckNow || !activeId) return;
      const slide = deckNow.slides[activeId];
      if (!slide) return;
      const ids = new Set(slide.shapes.map((s) => s.id));

      // Если клик попал на анкор/ротатор Transformer'а — не трогаем выделение,
      // иначе resize/rotate ломается (Transformer теряет ноды).
      if (
        typeof (e.target as Konva.Node).hasName === 'function' &&
        ((e.target as Konva.Node).hasName('_anchor') ||
          (e.target as Konva.Node).hasName('rotater') ||
          (e.target as Konva.Node).hasName('back'))
      ) {
        return;
      }

      const shift = (e.evt as MouseEvent).shiftKey === true;

      // Поднимаемся по дереву от hit-target до первой ноды, чей id есть в slide.shapes.
      let node: Konva.Node | null = e.target;
      while (node && node !== stage) {
        const nodeId = node.id();
        if (nodeId && ids.has(nodeId)) {
          const sel = useSelectionStore.getState();
          if (shift) sel.toggle(nodeId);
          else sel.select([nodeId]);
          return;
        }
        node = node.getParent();
      }

      // Клик в пустоту — старт rubber band.
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const z = zoomRef.current;
      const startX = (pointer.x - stagePanRef.current.x) / z;
      const startY = (pointer.y - stagePanRef.current.y) / z;
      const baseIds = shift ? [...useSelectionStore.getState().selectedShapeIds] : [];
      rubberStartRef.current = { x: startX, y: startY, additive: shift, baseIds };
      setRubberBand({ x: startX, y: startY, w: 0, h: 0 });
      if (!shift) useSelectionStore.getState().clear();
    },
    [spaceHeld],
  );

  const handleStageMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Pan имеет приоритет.
    const start = panStartRef.current;
    if (start) {
      setUserMoved(true);
      setStagePan({
        x: start.panX + (pointer.x - start.x),
        y: start.panY + (pointer.y - start.y),
      });
      return;
    }

    // Rubber band — обновляем прямоугольник в slide-coords.
    const rb = rubberStartRef.current;
    if (rb) {
      const z = zoomRef.current;
      const curX = (pointer.x - stagePanRef.current.x) / z;
      const curY = (pointer.y - stagePanRef.current.y) / z;
      setRubberBand({
        x: Math.min(rb.x, curX),
        y: Math.min(rb.y, curY),
        w: Math.abs(curX - rb.x),
        h: Math.abs(curY - rb.y),
      });
    }
  }, [setStagePan]);

  const handleStageMouseUp = useCallback(() => {
    panStartRef.current = null;

    const rb = rubberStartRef.current;
    if (rb) {
      rubberStartRef.current = null;
      // Финальный прямоугольник берём из state, чтобы не пересчитывать.
      // Если drag был фактически кликом (≈0×0) — ничего не выделяем сверх того,
      // что уже сделал mousedown (clear/baseIds).
      setRubberBand((prev) => {
        if (prev && (prev.w > 1 || prev.h > 1)) {
          const deckNow = useDeckStore.getState().deck;
          const activeId = useUiStore.getState().activeSlideId;
          if (deckNow && activeId) {
            const slide = deckNow.slides[activeId];
            if (slide) {
              const hits: ShapeId[] = [];
              for (const sh of slide.shapes) {
                // Простой axis-aligned intersect — rotation/flip игнорируем
                // (как в Slides: rubber band ловит bbox без учёта поворота).
                if (
                  sh.x < prev.x + prev.w &&
                  sh.x + sh.w > prev.x &&
                  sh.y < prev.y + prev.h &&
                  sh.y + sh.h > prev.y
                ) {
                  hits.push(sh.id);
                }
              }
              const sel = useSelectionStore.getState();
              if (rb.additive) {
                // baseIds + hits, без дубликатов.
                const merged = [...rb.baseIds];
                for (const id of hits) if (!merged.includes(id)) merged.push(id);
                sel.select(merged);
              } else {
                sel.select(hits);
              }
            }
          }
        }
        return null;
      });
    }
  }, []);

  // Зум колесом — относительно позиции указателя.
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

      const currentPan = stagePanRef.current;
      const mouseRelToContent = {
        x: (pointer.x - currentPan.x) / oldScale,
        y: (pointer.y - currentPan.y) / oldScale,
      };
      setUserMoved(true);
      setZoom(newScale);
      setStagePan({
        x: pointer.x - mouseRelToContent.x * newScale,
        y: pointer.y - mouseRelToContent.y * newScale,
      });
    },
    [zoom, setZoom, setStagePan],
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

  return (
    <div
      ref={containerRef}
      className="app-canvas"
      style={{ cursor: spaceHeld ? (panStartRef.current ? 'grabbing' : 'grab') : 'default' }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePan.x}
        y={stagePan.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
      >
        <Layer>
          <Slide slide={slide} width={slideW} height={slideH} />
        </Layer>
        <Layer>
          <SelectionTransformer slideId={slide.id} getStage={getStage} />
          {rubberBand && (
            <Rect
              x={rubberBand.x}
              y={rubberBand.y}
              width={rubberBand.w}
              height={rubberBand.h}
              fill="rgba(26, 115, 232, 0.08)"
              stroke="#1a73e8"
              strokeWidth={1}
              dash={[4, 2]}
              strokeScaleEnabled={false}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
      <TextOverlayHost slideId={slide.id} panX={stagePan.x} panY={stagePan.y} zoom={zoom} />
    </div>
  );
}

// Хост DOM-оверлея для текущей редактируемой текстовой фигуры.
// Вынесен в отдельный компонент, чтобы подписки на стейт не приводили к
// перерендеру всего Canvas (Stage — дорого).
function TextOverlayHost({
  slideId,
  panX,
  panY,
  zoom,
}: {
  slideId: string;
  panX: number;
  panY: number;
  zoom: number;
}) {
  const editingShapeId = useUiStore((s) => s.editingShapeId);
  const shape = useDeckStore((s) => {
    if (!editingShapeId) return null;
    const slide = s.deck?.slides[slideId];
    if (!slide) return null;
    const sh = slide.shapes.find((x) => x.id === editingShapeId);
    return sh && sh.type === 'text' ? sh : null;
  });
  if (!shape) return null;
  return <TextOverlay slideId={slideId} shape={shape} panX={panX} panY={panY} zoom={zoom} />;
}

// Утилита: считается ли событие пришедшим из текстового поля,
// чтобы не перехватывать Space внутри input/textarea/contenteditable.
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}
