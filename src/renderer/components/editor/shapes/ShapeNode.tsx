import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { ReactNode } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import { useGuidesStore } from '@renderer/stores/guides';
import { computeSnap, type SnapBox } from '@renderer/lib/snap';
import { guidesByAxis } from '@renderer/lib/userGuides';
import type { ShapeId } from '@shared/types';

interface ShapeNodeProps {
  id: ShapeId;
  slideId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  children: ReactNode;
}

// Универсальный wrapper для любой фигуры:
// - x/y в координатах слайда, дети рисуются от (0,0) до (w,h),
// - Group имеет stable `id` — Stage по нему находит shape при mousedown,
// - невидимый bbox-хитбокс ловит клики в углах, где нет геометрии фигуры,
// - SINGLE drag (одна фигура выделена) обрабатывает Konva native drag здесь;
//   MULTI drag (2+) — целиком на Canvas-уровне через multiDragRef, чтобы
//   избегать конкуренции между Konva-управляемой нодой и react-konva-апдейтами.
export function ShapeNode({
  id,
  slideId,
  x,
  y,
  w,
  h,
  rotation,
  opacity,
  locked,
  children,
}: ShapeNodeProps) {
  const snapToGrid = useUiStore((s) => s.snapToGrid);
  // Зажат пробел → панорамирование холста имеет приоритет, фигуры не таскаем.
  const spaceHeld = useUiStore((s) => s.spaceHeld);
  // В мульти-выделении (2+) Konva native drag отключаем — drag обрабатывает
  // Canvas-овый multiDragRef.
  const inMultiSelection = useSelectionStore(
    (s) => s.selectedShapeIds.length >= 2 && s.selectedShapeIds.includes(id),
  );
  const setEditingShape = useUiStore((s) => s.setEditingShape);
  const setChartEditor = useUiStore((s) => s.setChartEditor);
  const setHoveredAltShape = useUiStore((s) => s.setHoveredAltShape);

  // Двойной клик: текст-оверлей для большинства фигур; для диаграммы — редактор
  // данных; линия/таблица — своё поведение.
  const handleDblActivate = () => {
    if (shapeType === 'chart') {
      setChartEditor(id);
      return;
    }
    if (shapeType === 'line' || shapeType === 'table') return;
    setEditingShape(id);
  };

  // Наведение: если глобально включён показ alt-текста и у фигуры он задан —
  // отмечаем её как hovered (Canvas покажет подсказку-оверлей).
  const handleMouseEnter = () => {
    if (!useUiStore.getState().showAltOnHover) return;
    const sh = useDeckStore.getState().deck?.slides[slideId]?.shapes.find((s) => s.id === id);
    if (sh?.altText) setHoveredAltShape(id);
  };
  const handleMouseLeave = () => {
    if (useUiStore.getState().hoveredAltShapeId === id) setHoveredAltShape(null);
  };
  // Тип фигуры из стора — нужен, чтобы решить, можно ли поверх двойным
  // кликом открыть text-оверлей (линия — нельзя).
  const shapeType = useDeckStore(
    (s) => s.deck?.slides[slideId]?.shapes.find((sh) => sh.id === id)?.type,
  );

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let nx = node.x();
    let ny = node.y();

    // Smart guides — снепаем dragged к anchor-ам остальных фигур и краёв слайда.
    const deckNow = useDeckStore.getState().deck;
    const slideNow = deckNow?.slides[slideId];
    if (slideNow) {
      const others: SnapBox[] = [];
      for (const sh of slideNow.shapes) {
        if (sh.id !== id) {
          others.push({ x: sh.x, y: sh.y, w: sh.w, h: sh.h });
        }
      }
      if (deckNow?.size) {
        others.push({ x: 0, y: 0, w: deckNow.size.w, h: deckNow.size.h });
      }
      const zoom = useUiStore.getState().zoom || 1;
      const snapBox: SnapBox = { x: nx, y: ny, w: node.width(), h: node.height() };
      const userGuides = guidesByAxis(deckNow?.guides ?? []);
      const snap = computeSnap(snapBox, others, 6 / zoom, userGuides);
      if (snap.dx !== 0) {
        nx += snap.dx;
        node.x(nx);
      }
      if (snap.dy !== 0) {
        ny += snap.dy;
        node.y(ny);
      }
      useGuidesStore.getState().setGuides(snap.guides);
    }

    // Snap-to-grid — округляем к шагу 10 px, если включён. Применяется
    // ПОСЛЕ smart guides: если фигура уже снеплась к anchor-у другой,
    // не сбиваем выравнивание сеткой.
    if (snapToGrid && useGuidesStore.getState().guides.length === 0) {
      nx = Math.round(nx / 10) * 10;
      ny = Math.round(ny / 10) * 10;
      node.x(nx);
      node.y(ny);
    }

    // Single drag: пишем в стор каждый dragmove (Inspector live).
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === id);
      if (sh) {
        sh.x = nx;
        sh.y = ny;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let nextX = node.x();
    let nextY = node.y();
    if (snapToGrid) {
      nextX = Math.round(nextX / 10) * 10;
      nextY = Math.round(nextY / 10) * 10;
    }
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === id);
      if (sh) {
        sh.x = nextX;
        sh.y = nextY;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
    if (node.x() !== nextX) node.x(nextX);
    if (node.y() !== nextY) node.y(nextY);
    useGuidesStore.getState().clear();
  };

  return (
    <Group
      id={id}
      name="shape-root"
      x={x}
      y={y}
      width={w}
      height={h}
      rotation={rotation ?? 0}
      opacity={opacity ?? 1}
      draggable={!locked && !inMultiSelection && !spaceHeld}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDblClick={handleDblActivate}
      onDblTap={handleDblActivate}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Rect x={0} y={0} width={w} height={h} fill="#000" opacity={0.001} />
      {children}
    </Group>
  );
}
