import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useSelectionStore } from '@renderer/stores/selection';
import { useDeckStore } from '@renderer/stores/deck';
import type { ShapeId } from '@shared/types';

interface SelectionTransformerProps {
  slideId: string;
  // Stage нужен, чтобы найти Konva-ноды по id выделенных фигур.
  getStage: () => Konva.Stage | null;
}

// Единый Transformer для выделенных фигур текущего слайда.
// При rotate/resize меняем не scaleX/Y, а w/h фигуры — иначе при последующих
// операциях накапливается scale и текст/обводки начинают «жирнеть».
// Стандартный Konva-паттерн: в onTransformEnd сбрасываем scale и записываем
// результирующие width/height обратно в модель.
export function SelectionTransformer({ slideId, getStage }: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedIds = useSelectionStore((s) => s.selectedShapeIds);

  // Привязываем Transformer к актуальному набору выделенных нод.
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = getStage();
    if (!tr || !stage) return;
    if (selectedIds.length === 0) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const nodes = selectedIds
      .map((id) => stage.findOne(`#${cssEscape(id)}`))
      .filter((n): n is Konva.Node => n != null);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, slideId, getStage]);

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
        const nextW = Math.max(2, node.width() * scaleX);
        const nextH = Math.max(2, node.height() * scaleY);
        sh.x = node.x();
        sh.y = node.y();
        sh.w = nextW;
        sh.h = nextH;
        sh.rotation = node.rotation();
        // Сбрасываем scale, чтобы при следующем transform отсчёт шёл с 1.
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
      // Минимальный размер при drag-resize, чтобы фигура не схлопнулась в точку.
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
      anchorStroke="#1a73e8"
      anchorFill="#ffffff"
      rotateAnchorOffset={28}
    />
  );
}

// Утилита: id могут содержать символы, ломающие CSS-селектор (двоеточия, точки).
// CSS.escape недоступен в test-окружении — простой fallback на экранирование.
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s);
  }
  return s.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}
