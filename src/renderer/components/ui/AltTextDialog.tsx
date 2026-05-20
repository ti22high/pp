import { useEffect, useRef, useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { setShapeAltText } from '@renderer/lib/slides';

// Диалог «Alt-текст» (Phase 3.7): альтернативное текстовое описание фигуры
// для доступности (screen reader) и экспорта в .pptx (descr у picture).
// Открывается из инспектора изображения; работает для любой фигуры с altText.
export function AltTextDialog() {
  const shapeId = useUiStore((s) => s.altTextShapeId);
  const close = useUiStore((s) => s.setAltTextShape);
  const slideId = useUiStore((s) => s.activeSlideId);
  const current = useDeckStore((s) => {
    if (!slideId || !shapeId) return undefined;
    return s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId)?.altText;
  });

  const open = shapeId !== null;
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // При открытии — инициализируем поле текущим значением и фокусируем.
  useEffect(() => {
    if (!open) return;
    setText(current ?? '');
    const id = window.setTimeout(() => taRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // current намеренно не в зависимостях: подхватываем только на открытии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !slideId || !shapeId) return null;

  const apply = () => {
    setShapeAltText(slideId, shapeId, text);
    close(null);
  };

  return (
    <div className="modal-backdrop" onClick={() => close(null)}>
      <div className="modal modal--hyperlink" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Alt-текст</h2>
          <button className="modal__close" onClick={() => close(null)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <p className="meta">
            Краткое описание изображения для программ чтения с экрана и экспорта
            в .pptx.
          </p>
          <label className="slide-size__field">
            <span>Описание</span>
            <textarea
              ref={taRef}
              className="alt-text__area"
              rows={4}
              value={text}
              placeholder="Например: график роста выручки за 2025 год"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        </div>

        <footer className="slide-size__footer">
          <button
            type="button"
            className="slide-size__btn slide-size__btn--ghost"
            onClick={() => close(null)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="slide-size__btn slide-size__btn--primary"
            onClick={apply}
          >
            Применить
          </button>
        </footer>
      </div>
    </div>
  );
}
