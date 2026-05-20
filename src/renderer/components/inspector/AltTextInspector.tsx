import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import type { ShapeId, SlideId } from '@shared/types';

interface AltTextInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
}

// Секция «Alt-текст» — доступна для ЛЮБОЙ фигуры (поле altText есть в baseShape).
// Кнопка открывает диалог; чекбокс включает показ описания при наведении на
// фигуру (общий тумблер showAltOnHover, оверлей рисует Canvas).
export function AltTextInspector({ slideId, shapeId }: AltTextInspectorProps) {
  const setAltTextShape = useUiStore((s) => s.setAltTextShape);
  const showAltOnHover = useUiStore((s) => s.showAltOnHover);
  const toggleAltOnHover = useUiStore((s) => s.toggleAltOnHover);
  const altText = useDeckStore((s) => {
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.altText;
  });

  return (
    <section className="inspector-section">
      <p className="panel-title">Alt-текст</p>
      <div className="inspector-row inspector-row--buttons">
        <button
          type="button"
          className="inspector-btn"
          onClick={() => setAltTextShape(shapeId)}
        >
          {altText ? 'Изменить ✓' : 'Добавить…'}
        </button>
      </div>
      {altText && (
        <label className="inspector-row inspector-row--checkbox">
          <input
            type="checkbox"
            className="inspector-checkbox"
            checked={showAltOnHover}
            onChange={toggleAltOnHover}
          />
          <span className="inspector-checkbox-label">Показывать при наведении</span>
        </label>
      )}
    </section>
  );
}
