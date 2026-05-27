import { useEffect, useState } from 'react';
import type { MathfieldElement } from 'mathlive';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { measureEquation } from '@renderer/lib/equation';
import { SNIPPET_GROUPS } from '@renderer/lib/equationSnippets';
import { setEquationLatex } from '@renderer/lib/slides';
import { MathField } from './MathField';

// Редактор формулы (Phase 3.24/3.24a): визуальный ввод «как в Word» через
// MathLive (math-field) + палитра кнопок-шаблонов. На выходе LaTeX, рендер на
// слайде — KaTeX. Сырой LaTeX доступен по кнопке-тогглу снизу (для продвинутых).
export function EquationDialog() {
  const shapeId = useUiStore((s) => s.equationShapeId);
  const close = useUiStore((s) => s.setEquationShape);
  const slideId = useUiStore((s) => s.activeSlideId);
  const [mathfield, setMathfield] = useState<MathfieldElement | null>(null);
  const [showLatex, setShowLatex] = useState(false);

  const latex = useDeckStore((s) => {
    if (!slideId || !shapeId) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
    return sh?.type === 'equation' ? sh.latex : null;
  });

  const open = shapeId !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
          <h2>Формула</h2>
          <button className="modal__close" onClick={() => close(null)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          {/* Палитра шаблонов — вставка в визуальный редактор. */}
          {SNIPPET_GROUPS.map((group) => (
            <div key={group.title} className="equation-palette">
              <span className="equation-palette__title">{group.title}</span>
              <div className="equation-palette__row">
                {group.items.map((it) => (
                  <button
                    key={it.label + it.insert}
                    type="button"
                    className="equation-palette__btn"
                    title={it.insert}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => mathfield?.insert(it.insert, { focus: true })}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Визуальное поле формулы (WYSIWYG). */}
          <MathField value={latex} onChange={setLatex} onReady={setMathfield} />

          <button
            type="button"
            className="equation-latex-toggle"
            onClick={() => setShowLatex((v) => !v)}
          >
            {showLatex ? '▾ Скрыть LaTeX' : '▸ Показать LaTeX'}
          </button>
          {showLatex && (
            <textarea
              className="alt-text__area"
              rows={2}
              value={latex}
              spellCheck={false}
              placeholder="\frac{a}{b}"
              onChange={(e) => setLatex(e.target.value)}
            />
          )}
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
