import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { renderEquationHtml, measureEquation } from '@renderer/lib/equation';
import { SNIPPET_GROUPS, applySnippet } from '@renderer/lib/equationSnippets';
import { setEquationLatex } from '@renderer/lib/slides';

// Редактор формулы (Phase 3.24) + визуальный конструктор (3.24a): поле LaTeX,
// live-превью KaTeX и палитра кнопок-шаблонов (дробь/корень/степень/сумма/
// матрица/греческие), вставляющих LaTeX-сниппеты с плейсхолдером-кареткой.
export function EquationDialog() {
  const shapeId = useUiStore((s) => s.equationShapeId);
  const close = useUiStore((s) => s.setEquationShape);
  const slideId = useUiStore((s) => s.activeSlideId);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Куда поставить каретку после программной вставки сниппета (после ре-рендера).
  const pendingCaret = useRef<number | null>(null);

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

  // После вставки сниппета (latex обновился) ставим каретку на плейсхолдер.
  useLayoutEffect(() => {
    if (pendingCaret.current == null) return;
    const ta = taRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [latex]);

  if (!open || !slideId || !shapeId || latex === null) return null;

  const setLatex = (value: string) => {
    const { w, h } = measureEquation(value);
    setEquationLatex(slideId, shapeId, value, w, h);
  };

  // Вставка шаблона в текущую позицию курсора (или вместо выделения).
  const insertSnippet = (snippet: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? latex.length;
    const end = ta?.selectionEnd ?? latex.length;
    const res = applySnippet(latex, start, end, snippet);
    pendingCaret.current = res.caret;
    setLatex(res.value);
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
              placeholder="\frac{a}{b}"
              onChange={(e) => setLatex(e.target.value)}
            />
          </label>

          {SNIPPET_GROUPS.map((group) => (
            <div key={group.title} className="equation-palette">
              <span className="equation-palette__title">{group.title}</span>
              <div className="equation-palette__row">
                {group.items.map((it) => (
                  <button
                    key={it.label + it.snippet}
                    type="button"
                    className="equation-palette__btn"
                    title={it.snippet.trim()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSnippet(it.snippet)}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="meta">Превью:</p>
          <div className="equation-preview" dangerouslySetInnerHTML={{ __html: html }} />
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
