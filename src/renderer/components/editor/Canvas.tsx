import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
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
  // - если Space зажат → начало pan,
  // - если клик попал в любую ноду, чей id входит в множество shape-id
  //   текущего слайда (или в потомка такой ноды) → select эту фигуру,
  // - иначе → снять выделение.
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
      // Konva помечает анкоры через хэлпер hasName.
      if (
        typeof (e.target as Konva.Node).hasName === 'function' &&
        ((e.target as Konva.Node).hasName('_anchor') ||
          (e.target as Konva.Node).hasName('rotater') ||
          (e.target as Konva.Node).hasName('back'))
      ) {
        return;
      }

      // Поднимаемся по дереву от hit-target до первой ноды, чей id есть в slide.shapes.
      let node: Konva.Node | null = e.target;
      while (node && node !== stage) {
        const nodeId = node.id();
        if (nodeId && ids.has(nodeId)) {
          useSelectionStore.getState().select([nodeId]);
          return;
        }
        node = node.getParent();
      }
      useSelectionStore.getState().clear();
    },
    [spaceHeld],
  );

  const handlePanMove = useCallback(() => {
    const start = panStartRef.current;
    const stage = stageRef.current;
    if (!start || !stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    setUserMoved(true);
    setStagePan({
      x: start.panX + (pointer.x - start.x),
      y: start.panY + (pointer.y - start.y),
    });
  }, [setStagePan]);

  const handlePanEnd = useCallback(() => {
    panStartRef.current = null;
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
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <Layer>
          <Slide slide={slide} width={slideW} height={slideH} />
        </Layer>
        <Layer>
          <SelectionTransformer slideId={slide.id} getStage={getStage} />
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
