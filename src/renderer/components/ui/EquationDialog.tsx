import { useEffect, useMemo, useRef } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { renderEquationHtml, measureEquation } from '@renderer/lib/equation';
import { setEquationLatex } from '@renderer/lib/slides';

// Редактор формулы (Phase 3.24): поле LaTeX + live-превью KaTeX. Пишет в стор
// вживую (формула на холсте обновляется сразу); bbox фигуры подгоняем под
// измеренный размер формулы. Открывается при вставке и по двойному клику.
const EXAMPLES = ['\\frac{a}{b}', 'x^2 + y^2 = r^2', '\\sqrt{2}', '\\sum_{i=1}^{n} i', '\\int_0^1 x\\,dx'];

export function EquationDialog() {
  const shapeId = useUiStore((s) => s.equationShapeId);
  const close = useUiStore((s) => s.setEquationShape);
  const slideId = useUiStore((s) => s.activeSlideId);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const latex = useDeckStore((s) => {
    if (!slideId || !shapeId) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'equation' ? sh.latex : null;
  });

  const open = shapeId !== null;
  const html = useMemo(() => renderEquationHtml(latex ?? ''), [latex]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => taRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  if (!open || !slideId || !shapeId || latex === null) return null;

  const setLatex = (value: string) => {
    const { w, h } = measureEquation(value);
    setEquationLatex(slideId, shapeId, value, w, h);
  };

  return (
    <div className="modal-backdrop" onClick={() => close(null)}>
      <div className="modal modal--hyperlink" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Формула (LaTeX)</h2>
          <button className="modal__close" onClick={() => close(null)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <label className="slide-size__field">
            <span>LaTeX</span>
            <textarea
              ref={taRef}
              className="alt-text__area"
              rows={3}
              value={latex}
              placeholder="\\frac{a}{b}"
              onChange={(e) => setLatex(e.target.value)}
            />
          </label>

          <p className="meta">Превью:</p>
          <div className="equation-preview" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="equation-examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="inspector-btn"
                title={`Вставить ${ex}`}
                onClick={() => setLatex(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <footer className="slide-size__footer">
          <button className="inspector-btn inspector-btn--primary" onClick={() => close(null)}>
            Готово
          </button>
        </footer>
      </div>
    </div>
  );
}
