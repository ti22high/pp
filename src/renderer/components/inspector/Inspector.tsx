import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import { TransformInspector } from './TransformInspector';

// Корень правой панели свойств.
// Логика выбора секции по составу выделения:
// - 0 фигур → плейсхолдер,
// - 1 фигура → TransformInspector (Phase 2.12); fill/stroke/shadow — 2.13/2.14,
// - 2+ фигур → счётчик (multi-edit с mixed values — Phase 2.15).
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
        <TransformInspector slideId={activeSlideId} shapeId={selected[0]} />
      )}
      {activeSlideId && selected.length > 1 && (
        <p className="meta">Выделено: {selected.length} фигур. Групповое редактирование — Phase 2.15.</p>
      )}
    </aside>
  );
}
