import { useShallow } from 'zustand/shallow';
import { useDeckStore } from '@renderer/stores/deck';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import type { ShapeId, SlideId } from '@shared/types';
import { TransformInspector } from './TransformInspector';
import { FillInspector } from './FillInspector';
import { StrokeInspector } from './StrokeInspector';
import { OpacityInspector } from './OpacityInspector';

// Корень правой панели свойств.
// 0 фигур → плейсхолдер; 1 → набор секций; 2+ → счётчик (multi-edit — Phase 2.15).
export function Inspector() {
  const selected = useSelectionStore((s) => s.selectedShapeIds);
  const activeSlideId = useUiStore((s) => s.activeSlideId);

  return (
    <aside className="app-inspector">
      <p className="panel-title">Inspector</p>
      {!activeSlideId && <p className="meta">Нет активного слайда.</p>}
      {activeSlideId && selected.length === 0 && (
        <p className="meta">Выделите фигуру для редактирования свойств.</p>
      )}
      {activeSlideId && selected.length === 1 && (
        <SingleShapeInspector slideId={activeSlideId} shapeId={selected[0]} />
      )}
      {activeSlideId && selected.length > 1 && (
        <p className="meta">Выделено: {selected.length} фигур. Групповое редактирование — Phase 2.15.</p>
      )}
    </aside>
  );
}

// Набор секций для одной выделенной фигуры.
// Подписка на тип фигуры — selector тонкий (только type/fill/stroke/opacity),
// чтобы перерисовка происходила только при изменении этих полей.
function SingleShapeInspector({ slideId, shapeId }: { slideId: SlideId; shapeId: ShapeId }) {
  // useShallow обязателен: селектор возвращает новый объект на каждый вызов,
  // и без shallow-сравнения Zustand v5 будет триггерить ре-рендер на любое
  // изменение стора → бесконечный цикл → React падает в белый экран.
  const shapeFacets = useDeckStore(
    useShallow((s) => {
      const slide = s.deck?.slides[slideId];
      const sh = slide?.shapes.find((x) => x.id === shapeId);
      if (!sh) return null;
      return { type: sh.type, fill: sh.fill, stroke: sh.stroke, opacity: sh.opacity };
    }),
  );
  if (!shapeFacets) return null;

  // Что показываем по типу:
  // - Line: только Stroke + Opacity (заливки у линии нет).
  // - Text: только Opacity (цвет текста — через TipTap inline-color в 2.10/2.11).
  // - Rect/Ellipse/Path: Fill + Stroke + Opacity.
  const showFill = shapeFacets.type === 'rect' || shapeFacets.type === 'ellipse' || shapeFacets.type === 'path';
  const showStroke = shapeFacets.type !== 'text';

  return (
    <>
      <TransformInspector slideId={slideId} shapeId={shapeId} />
      {showFill && <FillInspector slideId={slideId} shapeId={shapeId} fill={shapeFacets.fill} />}
      {showStroke && (
        <StrokeInspector slideId={slideId} shapeId={shapeId} stroke={shapeFacets.stroke} />
      )}
      <OpacityInspector slideId={slideId} shapeId={shapeId} opacity={shapeFacets.opacity} />
    </>
  );
}
