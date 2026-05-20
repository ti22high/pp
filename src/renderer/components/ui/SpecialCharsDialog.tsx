import { useEffect, useState } from 'react';
import { useActiveEditorStore } from '@renderer/stores/activeEditor';
import {
  CHAR_CATEGORIES,
  searchChars,
  type SpecialChar,
} from '@renderer/lib/specialChars';

interface SpecialCharsDialogProps {
  open: boolean;
  onClose: () => void;
}

// Пикер спецсимволов (§1.11, команда `insert:special-chars`). Категории
// (Математика / Символы / Стрелки / Пунктуация / Греческие / Эмодзи) + поиск
// по имени. Клик по символу вставляет его в активный TipTap-editor (открытый
// TextOverlay) и НЕ закрывает пикер — можно вставить несколько подряд.
//
// data-keep-editing на корне модалки нужен, чтобы клики по ней не коммитили
// и не размонтировали редактируемый текст (см. TextOverlay onMouseDown).
export function SpecialCharsDialog({ open, onClose }: SpecialCharsDialogProps) {
  const [catKey, setCatKey] = useState<string>(CHAR_CATEGORIES[0].key);
  const [query, setQuery] = useState<string>('');
  // Подписка на наличие активного редактора, чтобы дизейблить вставку и
  // показывать подсказку, если текст не редактируется.
  const hasEditor = useActiveEditorStore((s) => s.editor !== null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const insert = (c: SpecialChar) => {
    const editor = useActiveEditorStore.getState().editor;
    if (!editor) return;
    editor.chain().focus().insertContent(c.ch).run();
  };

  const visibleChars: SpecialChar[] = query.trim()
    ? searchChars(query)
    : (CHAR_CATEGORIES.find((c) => c.key === catKey)?.chars ?? []);

  return (
    // Немодальная плавающая панель: без затемнения и без click-outside-закрытия,
    // чтобы во время вставки был виден слайд с текстом. Закрытие — крестик/Esc.
    <div className="special-chars-panel" data-keep-editing>
      <div className="modal modal--special-chars">
        <header className="modal__header">
          <h2>Специальные символы</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="special-chars__body">
          {!hasEditor && (
            <p className="slide-size__error">
              Откройте текст для редактирования (двойной клик по фигуре), чтобы
              вставлять символы.
            </p>
          )}

          <input
            type="text"
            className="special-chars__search"
            placeholder="Поиск по имени (например, arrow, сердце, sum)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {!query.trim() && (
            <nav className="special-chars__tabs" role="tablist">
              {CHAR_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={catKey === c.key}
                  className={`special-chars__tab${
                    catKey === c.key ? ' special-chars__tab--active' : ''
                  }`}
                  onClick={() => setCatKey(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </nav>
          )}

          <div className="special-chars__grid">
            {visibleChars.length === 0 && query.trim() && (
              <span className="special-chars__empty">Ничего не найдено</span>
            )}
            {visibleChars.map((c) => (
              <button
                key={c.ch}
                type="button"
                className="special-chars__cell"
                title={c.name}
                disabled={!hasEditor}
                onClick={() => insert(c)}
              >
                {c.ch}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
