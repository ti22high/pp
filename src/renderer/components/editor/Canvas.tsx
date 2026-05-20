import { useEffect, useRef, useState, useCallback, type ReactElement } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import { useGuidesStore } from '@renderer/stores/guides';
import { computeSnap, unionBox, type SnapBox } from '@renderer/lib/snap';
import { guidesByAxis, moveUserGuide, removeUserGuide } from '@renderer/lib/userGuides';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { expandToGroups } from '@renderer/lib/group';
import type { ShapeId } from '@shared/types';
import { Slide } from './Slide';
import { SelectionTransformer } from './SelectionTransformer';
import { TextOverlay } from './TextOverlay';
import { Rulers } from './Rulers';
import { ShapeContextMenu } from './ShapeContextMenu';
import { CropOverlay } from './CropOverlay';
import { AltHoverOverlay } from './AltHoverOverlay';

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
  const spaceHeld = useUiStore((s) => s.spaceHeld);
  const setSpaceHeld = useUiStore((s) => s.setSpaceHeld);
  const croppingShapeId = useUiStore((s) => s.croppingShapeId);
  const getStage = useCallback(() => stageRef.current, []);

  // Признак: пользователь уже менял pan/zoom вручную → не пере-центрируем автоматически.
  const [userMoved, setUserMoved] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  // Ref на актуальный pan для использования из event-callback без stale closure.
  const stagePanRef = useRef(stagePan);
  useEffect(() => {
    stagePanRef.current = stagePan;
  }, [stagePan]);

  // Контекстное меню (правый клик). Экранные координаты вызова или null.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

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

  // Custom multi-drag — когда пользователь mousedown-ит на пустое место
  // ВНУТРИ bbox-объединения выделения и тянет. Двигаем все выделенные ноды
  // на одну дельту, как при group-drag в ShapeNode, но без Konva native drag.
  const multiDragRef = useRef<{
    startX: number; // pointer at start in slide-coords
    startY: number;
    nodes: Array<{ id: ShapeId; node: Konva.Node; startX: number; startY: number }>;
  } | null>(null);
  // Ref на zoom — нужен в обработчиках mousedown/move без перепересоздания
  // callback-ов на каждый zoom-апдейт.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Отслеживаем размер контейнера через ResizeObserver.
  // ВАЖНО: используем callback ref, а не useEffect на mount, потому что
  // Canvas сначала рендерит placeholder без containerRef (когда deck=null),
  // а потом — реальный Stage. useEffect с []-deps срабатывает один раз
  // когда ref ещё null → Observer не подключается → stageSize остаётся
  // дефолтным (800×600), Stage отрисовывается крошечным в углу.
  const roRef = useRef<ResizeObserver | null>(null);
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({ width: Math.max(100, width), height: Math.max(100, height) });
      }
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // Авто-fit: пока пользователь не менял зум/пан сам, подгоняем zoom так,
  // чтобы слайд целиком влез в канвас с 5% отступом, и центрируем его.
  // Иначе при дефолтном zoom=1 слайд 1920×1080 шире/выше канваса и кажется,
  // что вообще не виден (заполняет всё).
  const slideW = deck?.size.w ?? 1920;
  const slideH = deck?.size.h ?? 1080;
  useEffect(() => {
    if (userMoved) return;
    if (stageSize.width < 50 || stageSize.height < 50) return;
    const fitZoom = Math.min(
      stageSize.width / slideW,
      stageSize.height / slideH,
    ) * 0.95;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom));
    setZoom(clampedZoom);
    const centerX = (stageSize.width - slideW * clampedZoom) / 2;
    const centerY = (stageSize.height - slideH * clampedZoom) / 2;
    setStagePan({ x: centerX, y: centerY });
  }, [userMoved, stageSize.width, stageSize.height, slideW, slideH, setZoom, setStagePan]);

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
  }, [setZoom, setSpaceHeld]);

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
      // Клик/drag по пользовательской направляющей — пусть линия сама
      // обрабатывает свой native drag, выделение не трогаем.
      if (
        typeof (e.target as Konva.Node).hasName === 'function' &&
        (e.target as Konva.Node).hasName('user-guide')
      ) {
        return;
      }

      const shift = (e.evt as MouseEvent).shiftKey === true;

      // Поднимаемся по дереву от hit-target до первой ноды, чей id есть в slide.shapes.
      let node: Konva.Node | null = e.target;
      while (node && node !== stage) {
        const nodeId = node.id() as ShapeId;
        if (nodeId && ids.has(nodeId)) {
          const sel = useSelectionStore.getState();
          // Группа: при клике расширяем до всех членов группы.
          const expanded = expandToGroups([nodeId], slide.shapes);
          if (shift) {
            // Shift+click: toggle всю группу (или фигуру если она не в группе).
            const setSel = new Set(sel.selectedShapeIds);
            const allIn = expanded.every((x) => setSel.has(x));
            if (allIn) {
              sel.select(sel.selectedShapeIds.filter((x) => !expanded.includes(x)));
            } else {
              sel.select([...new Set([...sel.selectedShapeIds, ...expanded])]);
            }
            return;
          }
          if (!sel.selectedShapeIds.includes(nodeId)) {
            // Клик по не-выделенной фигуре → заменяем выделение всей группой.
            sel.select(expanded);
            return;
          }
          // Уже в выделении.
          if (sel.selectedShapeIds.length >= 2) {
            // Старт custom multi-drag прямо отсюда — у Group draggable=false
            // (см. ShapeNode.inMultiSelection), значит Konva native drag не
            // запустится, и mousemove будет идти к Stage.handleStageMouseMove.
            const pointer = stage.getPointerPosition();
            if (!pointer) return;
            const z = zoomRef.current;
            const sx = (pointer.x - stagePanRef.current.x) / z;
            const sy = (pointer.y - stagePanRef.current.y) / z;
            const nodes: Array<{
              id: ShapeId;
              node: Konva.Node;
              startX: number;
              startY: number;
            }> = [];
            const wanted = new Set(sel.selectedShapeIds);
            stage.find((n: Konva.Node) => {
              if (wanted.has(n.id())) {
                nodes.push({
                  id: n.id() as ShapeId,
                  node: n,
                  startX: n.x(),
                  startY: n.y(),
                });
              }
              return false;
            });
            multiDragRef.current = { startX: sx, startY: sy, nodes };
          }
          return;
        }
        node = node.getParent();
      }

      // Клик в пустоту — старт rubber band, но только если pointer вне
      // bbox-объединения текущего выделения. Внутри рамки выделения (например,
      // в зазоре между фигурами) — оставляем выделение в покое, как в Slides:
      // случайный клик в «теле» multi-selection не должен сбрасывать его.
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const z = zoomRef.current;
      const startX = (pointer.x - stagePanRef.current.x) / z;
      const startY = (pointer.y - stagePanRef.current.y) / z;

      if (!shift) {
        const selIds = useSelectionStore.getState().selectedShapeIds;
        if (selIds.length > 0) {
          const selSet = new Set(selIds);
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const sh of slide.shapes) {
            if (!selSet.has(sh.id)) continue;
            if (sh.x < minX) minX = sh.x;
            if (sh.y < minY) minY = sh.y;
            if (sh.x + sh.w > maxX) maxX = sh.x + sh.w;
            if (sh.y + sh.h > maxY) maxY = sh.y + sh.h;
          }
          if (
            Number.isFinite(minX) &&
            startX >= minX &&
            startX <= maxX &&
            startY >= minY &&
            startY <= maxY
          ) {
            // Внутри selection-bbox — стартуем custom multi-drag.
            // Konva native draggable у Group-ов фигур не сработает (mousedown
            // попал в пустое место Stage, а не в фигуру), поэтому двигаем
            // ноды сами через mousemove/mouseup.
            const nodes: Array<{
              id: ShapeId;
              node: Konva.Node;
              startX: number;
              startY: number;
            }> = [];
            const wanted = new Set(selIds);
            stage.find((n: Konva.Node) => {
              if (wanted.has(n.id())) {
                nodes.push({
                  id: n.id() as ShapeId,
                  node: n,
                  startX: n.x(),
                  startY: n.y(),
                });
              }
              return false;
            });
            multiDragRef.current = { startX, startY, nodes };
            return;
          }
        }
      }

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

    // Custom multi-drag из пустого места внутри selection-bbox.
    const md = multiDragRef.current;
    if (md) {
      const z = zoomRef.current;
      const curX = (pointer.x - stagePanRef.current.x) / z;
      const curY = (pointer.y - stagePanRef.current.y) / z;
      let dx = curX - md.startX;
      let dy = curY - md.startY;

      // Snap по union-bbox перемещаемых нод.
      const deckNow = useDeckStore.getState().deck;
      const activeId = useUiStore.getState().activeSlideId;
      const slideNow = deckNow && activeId ? deckNow.slides[activeId] : null;
      if (slideNow) {
        const movedIds = new Set(md.nodes.map((n) => n.id));
        const others: SnapBox[] = [];
        for (const sh of slideNow.shapes) {
          if (!movedIds.has(sh.id)) {
            others.push({ x: sh.x, y: sh.y, w: sh.w, h: sh.h });
          }
        }
        if (deckNow?.size) {
          others.push({ x: 0, y: 0, w: deckNow.size.w, h: deckNow.size.h });
        }
        const movedBoxes: SnapBox[] = md.nodes.map((n) => ({
          x: n.startX + dx,
          y: n.startY + dy,
          w: n.node.width(),
          h: n.node.height(),
        }));
        const u = unionBox(movedBoxes);
        if (u) {
          const userGuides = guidesByAxis(deckNow?.guides ?? []);
          const snap = computeSnap(u, others, 6 / z, userGuides);
          dx += snap.dx;
          dy += snap.dy;
          useGuidesStore.getState().setGuides(snap.guides);
        }
      }

      // Snap-to-grid поверх группы (после smart guides). Если smart guides
      // сработал — оставляем его, иначе округляем дельту к шагу 10.
      const snapGrid = useUiStore.getState().snapToGrid;
      if (snapGrid && useGuidesStore.getState().guides.length === 0) {
        dx = Math.round(dx / 10) * 10;
        dy = Math.round(dy / 10) * 10;
      }

      for (const o of md.nodes) {
        o.node.x(o.startX + dx);
        o.node.y(o.startY + dy);
      }
      // Параллельно пишем новые позиции в модель — filmstrip и Inspector
      // подписаны на стор и без этого не обновляются live во время drag-а.
      // Работает потому, что ShapeView-ы мемоизированы (React.memo) — при
      // мутации только moved-фигур остальные не перерисовываются, и
      // Transformer-эффект на modifiedAt делает только forceUpdate (без
      // re-attach), что не конфликтует с нашим императивным move.
      const slideIdNow = useUiStore.getState().activeSlideId;
      if (slideIdNow) {
        useDeckStore.setState((state) => {
          if (!state.deck) return;
          const slide = state.deck.slides[slideIdNow];
          if (!slide) return;
          for (const o of md.nodes) {
            const sh = slide.shapes.find((s) => s.id === o.id);
            if (sh) {
              sh.x = o.startX + dx;
              sh.y = o.startY + dy;
            }
          }
          state.deck.modifiedAt = new Date().toISOString();
        });
      }
      // batchDraw — иначе Transformer не пересчитает рамку.
      md.nodes[0]?.node.getLayer()?.batchDraw();
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

    // Завершение custom multi-drag — коммитим финальные позиции в модель.
    const md = multiDragRef.current;
    if (md) {
      multiDragRef.current = null;
      useGuidesStore.getState().clear();
      useDeckStore.setState((state) => {
        if (!state.deck) return;
        const slide = state.deck.slides[Object.keys(state.deck.slides)[0]];
        const activeId = useUiStore.getState().activeSlideId;
        const targetSlide = activeId ? state.deck.slides[activeId] : slide;
        if (!targetSlide) return;
        for (const o of md.nodes) {
          const sh = targetSlide.shapes.find((s) => s.id === o.id);
          if (sh) {
            sh.x = o.node.x();
            sh.y = o.node.y();
          }
        }
        state.deck.modifiedAt = new Date().toISOString();
      });
      return;
    }

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
              // Расширяем до полных групп.
              const expandedHits = expandToGroups(hits, slide.shapes);
              if (rb.additive) {
                const merged = [...rb.baseIds];
                for (const id of expandedHits) if (!merged.includes(id)) merged.push(id);
                sel.select(merged);
              } else {
                sel.select(expandedHits);
              }
            }
          }
        }
        return null;
      });
    }
  }, []);

  // Правый клик — контекстное меню. Если клик попал на фигуру, не входящую
  // в выделение, сначала выделяем её (как в Slides/PowerPoint), затем
  // открываем меню в точке курсора.
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const deckNow = useDeckStore.getState().deck;
      const activeId = useUiStore.getState().activeSlideId;
      if (!deckNow || !activeId) return;
      const slide = deckNow.slides[activeId];
      if (!slide) return;
      const ids = new Set(slide.shapes.map((s) => s.id));

      // Поднимаемся от hit-target до фигуры слайда.
      let node: Konva.Node | null = e.target;
      let hitId: ShapeId | null = null;
      while (node && node !== stage) {
        const nid = node.id() as ShapeId;
        if (nid && ids.has(nid)) {
          hitId = nid;
          break;
        }
        node = node.getParent();
      }

      const sel = useSelectionStore.getState();
      if (hitId) {
        if (!sel.selectedShapeIds.includes(hitId)) {
          sel.select(expandToGroups([hitId], slide.shapes));
        }
      }
      // Открываем меню и для фигуры, и для пустого места (там активны
      // «Вставить» / z-order для текущего выделения).
      setCtxMenu({ x: e.evt.clientX, y: e.evt.clientY });
    },
    [],
  );

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

  // Зум через меню (Вид → Увеличить/Уменьшить/Сбросить) — пивот вокруг
  // центра канваса, а не вокруг top-left слайда. Так зум-кнопками
  // слайд не «уезжает» вбок.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;
    return window.api.onMenuCommand((cmd) => {
      if (cmd === 'view:zoom-in' || cmd === 'view:zoom-out') {
        const oldScale = zoomRef.current;
        const newScale =
          cmd === 'view:zoom-in'
            ? Math.min(MAX_ZOOM, oldScale * ZOOM_STEP)
            : Math.max(MIN_ZOOM, oldScale / ZOOM_STEP);
        // Точка-якорь — центр канваса в screen-coords.
        const ax = stageSize.width / 2;
        const ay = stageSize.height / 2;
        const currentPan = stagePanRef.current;
        const anchorContent = {
          x: (ax - currentPan.x) / oldScale,
          y: (ay - currentPan.y) / oldScale,
        };
        setUserMoved(true);
        setZoom(newScale);
        setStagePan({
          x: ax - anchorContent.x * newScale,
          y: ay - anchorContent.y * newScale,
        });
      } else if (cmd === 'view:zoom-reset') {
        setUserMoved(false); // авто-центрирование снова возьмёт верх
        setZoom(1);
      }
    });
  }, [stageSize, setZoom, setStagePan]);

  if (!deck || !activeSlideId) {
    return (
      <div ref={setContainerRef} className="app-canvas">
        <div className="placeholder">Дек не загружен</div>
      </div>
    );
  }

  const slide = deck.slides[activeSlideId];
  if (!slide) {
    return (
      <div ref={setContainerRef} className="app-canvas">
        <div className="placeholder">Активный слайд не найден</div>
      </div>
    );
  }

  return (
    <div
      ref={setContainerRef}
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
        onContextMenu={handleContextMenu}
      >
        <Layer>
          <Slide slide={slide} width={slideW} height={slideH} />
        </Layer>
        <Layer>
          {!croppingShapeId && (
            <SelectionTransformer slideId={slide.id} getStage={getStage} />
          )}
          <CropOverlay slideId={slide.id} />
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
          <GuideLayer slideW={slideW} slideH={slideH} />
          <GridLayer slideW={slideW} slideH={slideH} />
          <UserGuidesLayer slideW={slideW} slideH={slideH} />
        </Layer>
      </Stage>
      <TextOverlayHost slideId={slide.id} panX={stagePan.x} panY={stagePan.y} zoom={zoom} />
      <AltHoverOverlay slideId={slide.id} panX={stagePan.x} panY={stagePan.y} zoom={zoom} />
      <Rulers
        containerRef={containerRef}
        stageW={stageSize.width}
        stageH={stageSize.height}
        panX={stagePan.x}
        panY={stagePan.y}
        zoom={zoom}
      />
      {ctxMenu && (
        <ShapeContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
        />
      )}
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
    return slide.shapes.find((x) => x.id === editingShapeId) ?? null;
  });
  if (!shape) return null;
  return <TextOverlay slideId={slideId} shape={shape} panX={panX} panY={panY} zoom={zoom} />;
}

// Сетка 10×10 — отображается, когда View → Show grid включён.
// Не listening, чтобы не мешать hit-detection.
const GRID_STEP = 10;
function GridLayer({ slideW, slideH }: { slideW: number; slideH: number }) {
  const showGrid = useUiStore((s) => s.showGrid);
  if (!showGrid) return null;
  const lines: ReactElement[] = [];
  for (let x = 0; x <= slideW; x += GRID_STEP) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, 0, x, slideH]}
        stroke="#e5e7eb"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />,
    );
  }
  for (let y = 0; y <= slideH; y += GRID_STEP) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[0, y, slideW, y]}
        stroke="#e5e7eb"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />,
    );
  }
  return <>{lines}</>;
}

// Слой пользовательских направляющих (deck.guides). Каждая — Konva.Line на
// всю длину слайда, draggable вдоль своей оси. dragEnd → moveUserGuide;
// double-click → removeUserGuide.
function UserGuidesLayer({
  slideW,
  slideH,
}: {
  slideW: number;
  slideH: number;
}) {
  const guides = useDeckStore((s) => s.deck?.guides ?? []);
  if (guides.length === 0) return null;
  return (
    <>
      {guides.map((g) =>
        g.kind === 'v' ? (
          <Line
            key={g.id}
            points={[g.pos, 0, g.pos, slideH]}
            stroke="#00bcd4"
            strokeWidth={1}
            strokeScaleEnabled={false}
            name="user-guide"
            hitStrokeWidth={10}
            draggable
            onDragMove={(e) => {
              // Konva dragBoundFunc принимает absolute screen-coords и не
              // понимает stage zoom/pan, поэтому ось фиксируем здесь — в
              // layer-coords. Y всегда 0: точки [pos, 0..slideH] перемещаются
              // целиком по X через position.x.
              e.target.y(0);
            }}
            onDragEnd={(e) => {
              moveUserGuide(g.id, e.target.x() + g.pos);
              e.target.position({ x: 0, y: 0 });
            }}
            onDblClick={() => removeUserGuide(g.id)}
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = '';
            }}
          />
        ) : (
          <Line
            key={g.id}
            points={[0, g.pos, slideW, g.pos]}
            stroke="#00bcd4"
            strokeWidth={1}
            strokeScaleEnabled={false}
            name="user-guide"
            hitStrokeWidth={10}
            draggable
            onDragMove={(e) => {
              e.target.x(0);
            }}
            onDragEnd={(e) => {
              moveUserGuide(g.id, e.target.y() + g.pos);
              e.target.position({ x: 0, y: 0 });
            }}
            onDblClick={() => removeUserGuide(g.id)}
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'ns-resize';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = '';
            }}
          />
        ),
      )}
    </>
  );
}

// Слой smart-guides: рисует красные линии-направляющие на всю длину слайда
// в координатах слайда. Подписан на отдельный стор useGuidesStore, который
// обновляется в onDragMove (ShapeNode + Canvas multi-drag).
function GuideLayer({ slideW, slideH }: { slideW: number; slideH: number }) {
  const guides = useGuidesStore((s) => s.guides);
  if (guides.length === 0) return null;
  return (
    <>
      {guides.map((g, i) =>
        g.kind === 'v' ? (
          <Line
            key={i}
            points={[g.pos, 0, g.pos, slideH]}
            stroke="#ff4081"
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
        ) : (
          <Line
            key={i}
            points={[0, g.pos, slideW, g.pos]}
            stroke="#ff4081"
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
        ),
      )}
    </>
  );
}

// Утилита: считается ли событие пришедшим из текстового поля,
// чтобы не перехватывать Space внутри input/textarea/contenteditable.
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}
