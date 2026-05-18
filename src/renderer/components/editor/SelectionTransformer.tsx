import { useEffect, useRef } from 'react';
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

  // Привязка к актуальному набору выделенных нод + пере-вычисление bbox при
  // любом изменении модели (modifiedAt).
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
    // forceUpdate обновляет bbox по текущим размерам нод — нужен после resize.
    tr.forceUpdate();
    tr.getLayer()?.batchDraw();
  }, [selectedIds, slideId, getStage, modifiedAt]);

  const handleTransformEnd = () => {
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
        const nodeWidth = node.width();
        const nodeHeight = node.height();
        const nextW = Math.max(2, nodeWidth * scaleX);
        const nextH = Math.max(2, nodeHeight * scaleY);
        console.log('[transformEnd]', {
          id,
          type: sh.type,
          scaleX,
          scaleY,
          nodeWidth,
          nodeHeight,
          nextW,
          nextH,
          oldW: sh.w,
          oldH: sh.h,
        });

        // Для линии: масштабируем точки пропорционально bbox, чтобы штрих
        // вытянулся вместе с рамкой. Толщину штриха меняем ТОЛЬКО при
        // uniform-resize (drag за угол, sx≈sy) — иначе одноосное растяжение
        // (drag за середину стороны) делало бы линию длиннее, но и пересчитывало
        // толщину, что неинтуитивно.
        if (sh.type === 'line') {
          const sx = sh.w > 0 ? nextW / sh.w : 1;
          const sy = sh.h > 0 ? nextH / sh.h : 1;
          const [x1, y1, x2, y2] = sh.points;
          sh.points = [x1 * sx, y1 * sy, x2 * sx, y2 * sy];
          // Считаем uniform, если sx и sy отличаются не больше чем на 5 %.
          const isUniform = Math.abs(sx - sy) / Math.max(sx, sy) < 0.05;
          if (isUniform && sh.stroke) {
            sh.stroke.width = Math.max(0.5, sh.stroke.width * sx);
          }
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
      onTransformEnd={handleTransformEnd}
      rotateEnabled
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 5 || newBox.height < 5) return oldBox;
        return newBox;
      }}
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
      anchorSize={9}
      anchorCornerRadius={2}
      borderStroke="#1a73e8"
      borderStrokeWidth={1}
      anchorStroke="#1a73e8"
      anchorStrokeWidth={1}
      anchorFill="#ffffff"
      // Отступ рамки от bbox — иначе у тонких фигур (линий, узких rect)
      // рамка наслаивается на саму фигуру и не отличается от штриха.
      padding={4}
      rotateAnchorOffset={28}
    />
  );
}

