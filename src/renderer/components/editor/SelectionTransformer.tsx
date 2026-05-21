import { useEffect, useMemo, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useSelectionStore } from '@renderer/stores/selection';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useGuidesStore } from '@renderer/stores/guides';
import { snapEdge, type Guide } from '@renderer/lib/snap';
import type { ShapeId } from '@shared/types';

interface SelectionTransformerProps {
  slideId: string;
  getStage: () => Konva.Stage | null;
}

// Единый Transformer для выделенных фигур текущего слайда.
// В onTransformEnd сбрасываем scale на Group и записываем в модель новые w/h
// (иначе при каждом следующем resize накапливается scale и обводки «жирнеют»).
export function SelectionTransformer({ slideId, getStage }: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedIds = useSelectionStore((s) => s.selectedShapeIds);
  // Подписка на modifiedAt — заставляет Transformer пересчитать bbox после
  // того как фигура изменила свои размеры/позицию (resize, drag, move).
  const modifiedAt = useDeckStore((s) => s.deck?.modifiedAt);

  // Если в выделении есть линия (одномерная геометрия), убираем middle-анкоры
  // и оставляем только углы — drag за середину edge у линии бессмысленен
  // (так же ведут себя Slides и PowerPoint).
  const selectedHasLine = useDeckStore((s) => {
    const slide = s.deck?.slides[slideId];
    if (!slide) return false;
    return slide.shapes.some(
      (sh) => selectedIds.includes(sh.id) && sh.type === 'line',
    );
  });
  const enabledAnchors = useMemo(
    () =>
      selectedHasLine
        ? (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const)
        : ([
            'top-left',
            'top-center',
            'top-right',
            'middle-left',
            'middle-right',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ] as const),
    [selectedHasLine],
  );

  // Эффект A: привязка Transformer-а к выделенным нодам.
  // Триггерится ТОЛЬКО на изменение selectedIds/slideId — реcaмо-привязка
  // нод во время drag/resize (когда тикает modifiedAt) портит внутреннее
  // состояние Konva.Transformer и приводит к дрожанию фигур.
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = getStage();
    if (!tr || !stage) return;
    if (selectedIds.length === 0) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    // Коннекторы не масштабируем рамкой — у них концевые ручки (ConnectorOverlay).
    const slideShapes = useDeckStore.getState().deck?.slides[slideId]?.shapes ?? [];
    const connectorIds = new Set(
      slideShapes.filter((s) => s.type === 'connector').map((s) => s.id),
    );
    const wantedIds = new Set(selectedIds.filter((id) => !connectorIds.has(id)));
    // Функциональный поиск вместо CSS-селектора `#id`: UUID может начинаться
    // с цифры, тогда селектор невалиден и findOne ничего не находит.
    const nodes: Konva.Node[] = [];
    stage.find((n: Konva.Node) => {
      if (wantedIds.has(n.id())) {
        nodes.push(n);
      }
      return false;
    });
    tr.nodes(nodes);
    tr.forceUpdate();
    tr.getLayer()?.batchDraw();
  }, [selectedIds, slideId, getStage]);

  // Эффект B: пересчёт bbox при изменении модели (drag/resize/Inspector-edit).
  // Не трогаем nodes — только forceUpdate. Этого достаточно, чтобы рамка
  // следовала за изменёнными координатами нод.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr || selectedIds.length === 0) return;
    tr.forceUpdate();
    tr.getLayer()?.batchDraw();
  }, [modifiedAt, selectedIds.length]);

  // Запекание scale в w/h + запись в модель. Вызывается и на каждый
  // transform (live-апдейт Inspector-а), и на transformend (финальный коммит).
  // Сброс scale на ноду в середине drag-а — рекомендованный Konva-паттерн,
  // см. https://konvajs.org/docs/select_and_transform/Resize_Limits.html.
  const bakeTransform = () => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = tr.nodes();
    if (nodes.length === 0) return;

    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      for (const node of nodes) {
        const id = node.id() as ShapeId;
        const sh = slide.shapes.find((s) => s.id === id);
        if (!sh) continue;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const nextW = Math.max(2, node.width() * scaleX);
        const nextH = Math.max(2, node.height() * scaleY);

        // Для линии масштабируем сами точки пропорционально bbox,
        // чтобы штрих вытянулся вместе с рамкой. Толщину штриха не трогаем —
        // как в Slides, она задаётся явно через Inspector (Phase 2.13).
        // Иначе stroke накапливается при каждом resize и линия становится
        // толще и толще, а bbox Transformer-а расходится с самой линией.
        if (sh.type === 'line') {
          const sx = sh.w > 0 ? nextW / sh.w : 1;
          const sy = sh.h > 0 ? nextH / sh.h : 1;
          const [x1, y1, x2, y2] = sh.points;
          sh.points = [x1 * sx, y1 * sy, x2 * sx, y2 * sy];
        }

        sh.x = node.x();
        sh.y = node.y();
        sh.w = nextW;
        sh.h = nextH;
        sh.rotation = node.rotation();
        // Сброс scale на Group, чтобы дочерние ноды не оставались растянутыми
        // до React-ре-рендера с новыми w/h.
        node.scaleX(1);
        node.scaleY(1);
        node.width(nextW);
        node.height(nextH);
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  // Snap при resize: привязка движущихся рёбер bbox к краям слайда и
  // к рёбрам/центрам других фигур. Работает только без поворота (для
  // повёрнутых фигур геометрия рёбер не осепараллельна). Подсвечивает
  // направляющие через useGuidesStore (очищаются в onTransformEnd).
  const resizeBoundBox = (
    oldBox: { x: number; y: number; width: number; height: number; rotation: number },
    newBox: { x: number; y: number; width: number; height: number; rotation: number },
  ) => {
    if (newBox.width < 5 || newBox.height < 5) return oldBox;
    if (Math.abs(newBox.rotation) > 0.001) return newBox;

    const ui = useUiStore.getState();
    const zoom = ui.zoom || 1;
    const pan = ui.stagePan;
    const deck = useDeckStore.getState().deck;
    const slide = deck?.slides[slideId];
    if (!deck || !slide) return newBox;

    // boundBox в абсолютных stage-координатах → переводим в slide-coords.
    const toSx = (ax: number) => (ax - pan.x) / zoom;
    const toSy = (ay: number) => (ay - pan.y) / zoom;
    let left = toSx(newBox.x);
    let top = toSy(newBox.y);
    let right = left + newBox.width / zoom;
    let bottom = top + newBox.height / zoom;
    const oldLeft = toSx(oldBox.x);
    const oldTop = toSy(oldBox.y);
    const oldRight = oldLeft + oldBox.width / zoom;
    const oldBottom = oldTop + oldBox.height / zoom;

    const th = 6 / zoom;
    // Цели по X: левый край, центр, правый край слайда; по Y — аналогично.
    const vTargets = [0, deck.size.w / 2, deck.size.w];
    const hTargets = [0, deck.size.h / 2, deck.size.h];
    const sel = new Set(selectedIds);
    for (const sh of slide.shapes) {
      if (sel.has(sh.id)) continue;
      vTargets.push(sh.x, sh.x + sh.w / 2, sh.x + sh.w);
      hTargets.push(sh.y, sh.y + sh.h / 2, sh.y + sh.h);
    }

    const guides: Guide[] = [];
    const changed = (a: number, b: number) => Math.abs(a - b) > 0.01;
    // Снепаем только те рёбра, что реально двигаются (зависит от анкора).
    if (changed(left, oldLeft)) {
      const r = snapEdge(left, vTargets, th);
      left = r.value;
      if (r.line !== null) guides.push({ kind: 'v', pos: r.line });
    }
    if (changed(right, oldRight)) {
      const r = snapEdge(right, vTargets, th);
      right = r.value;
      if (r.line !== null) guides.push({ kind: 'v', pos: r.line });
    }
    if (changed(top, oldTop)) {
      const r = snapEdge(top, hTargets, th);
      top = r.value;
      if (r.line !== null) guides.push({ kind: 'h', pos: r.line });
    }
    if (changed(bottom, oldBottom)) {
      const r = snapEdge(bottom, hTargets, th);
      bottom = r.value;
      if (r.line !== null) guides.push({ kind: 'h', pos: r.line });
    }
    useGuidesStore.getState().setGuides(guides);

    if (right - left < 5 || bottom - top < 5) return newBox;
    return {
      ...newBox,
      x: left * zoom + pan.x,
      y: top * zoom + pan.y,
      width: (right - left) * zoom,
      height: (bottom - top) * zoom,
    };
  };

  return (
    <Transformer
      ref={transformerRef}
      onTransform={bakeTransform}
      onTransformEnd={() => {
        bakeTransform();
        useGuidesStore.getState().clear();
      }}
      rotateEnabled
      boundBoxFunc={resizeBoundBox}
      enabledAnchors={enabledAnchors as unknown as string[]}
      anchorSize={9}
      anchorCornerRadius={2}
      borderStroke="#1a73e8"
      borderStrokeWidth={1}
      anchorStroke="#1a73e8"
      anchorStrokeWidth={1}
      anchorFill="#ffffff"
      // padding=0 — рамка сидит впритык к bbox фигуры. Раньше был 2,
      // но он давал заметный визуальный зазор; теперь штрих рамки идёт
      // ровно по краю Group-bbox (для line/rect со stroke штрих может
      // слегка торчать наружу — это OK, в Slides ведёт себя так же).
      padding={0}
      rotateAnchorOffset={28}
    />
  );
}

