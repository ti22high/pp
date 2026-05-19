import { useEffect, useMemo, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useSelectionStore } from '@renderer/stores/selection';
import { useDeckStore } from '@renderer/stores/deck';
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
    const wantedIds = new Set(selectedIds);
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

  return (
    <Transformer
      ref={transformerRef}
      onTransform={bakeTransform}
      onTransformEnd={bakeTransform}
      rotateEnabled
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 5 || newBox.height < 5) return oldBox;
        return newBox;
      }}
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

