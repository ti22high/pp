import { useEffect, useMemo, useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { setShapeHyperlink } from '@renderer/lib/slides';
import { listBookmarks } from '@renderer/lib/bookmarks';
import type { Hyperlink } from '@renderer/lib/model/schema';

interface HyperlinkDialogProps {
  open: boolean;
  onClose: () => void;
}

// Диалог «Вставка → Гиперссылка…» (команда `insert:hyperlink`, Cmd+K).
// По решению DECISIONS.md 2026-05-19 поддерживаем только внутренние ссылки:
// «на слайд» (по id или относительная) и «на закладку» (источников нет до
// 3.22). URL/email — за рамки текущего scope (отсутствие сети).
//
// Применяется ко ВСЕМ выделенным фигурам разом. Если ничего не выделено —
// диалог информирует об этом.

type Mode = 'slide' | 'bookmark' | 'none';
type SlideTarget = string | 'next' | 'prev' | 'first' | 'last';

export function HyperlinkDialog({ open, onClose }: HyperlinkDialogProps) {
  const slideOrder = useDeckStore((s) => s.deck?.slideOrder ?? []);
  const slidesById = useDeckStore((s) => s.deck?.slides ?? {});
  const deck = useDeckStore((s) => s.deck);
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const selectedIds = useSelectionStore((s) => s.selectedShapeIds);

  const [mode, setMode] = useState<Mode>('slide');
  const [slideTarget, setSlideTarget] = useState<SlideTarget>('next');
  const [bookmarkId, setBookmarkId] = useState<string>('');

  const bookmarks = useMemo(() => listBookmarks(deck), [deck]);

  // Если выделена одна фигура — инициализируем форму её текущей ссылкой.
  // Если несколько — берём ссылку первой как преcет.
  const primaryHyperlink: Hyperlink | undefined = useMemo(() => {
    if (!activeSlideId || selectedIds.length === 0) return undefined;
    const slide = slidesById[activeSlideId];
    if (!slide) return undefined;
    const first = slide.shapes.find((x) => x.id === selectedIds[0]);
    return first?.hyperlink;
  }, [activeSlideId, selectedIds, slidesById]);

  useEffect(() => {
    if (!open) return;
    if (!primaryHyperlink) {
      setMode('slide');
      setSlideTarget('next');
      return;
    }
    if (primaryHyperlink.kind === 'slide') {
      setMode('slide');
      setSlideTarget(primaryHyperlink.slideId);
    } else if (primaryHyperlink.kind === 'slide-rel') {
      setMode('slide');
      setSlideTarget(primaryHyperlink.rel);
    } else if (primaryHyperlink.kind === 'bookmark') {
      setMode('bookmark');
      setBookmarkId(primaryHyperlink.bookmarkId);
    } else {
      // url / email — пока в UI не редактируем (отсутствует сетевой scope).
      setMode('slide');
      setSlideTarget('next');
    }
  }, [open, primaryHyperlink]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const buildHyperlink = (): Hyperlink | null => {
    if (mode === 'slide') {
      if (slideTarget === 'next' || slideTarget === 'prev' ||
          slideTarget === 'first' || slideTarget === 'last') {
        return { kind: 'slide-rel', rel: slideTarget };
      }
      return { kind: 'slide', slideId: slideTarget };
    }
    if (mode === 'bookmark' && bookmarkId) {
      return { kind: 'bookmark', bookmarkId };
    }
    return null;
  };

  const apply = () => {
    if (!activeSlideId || selectedIds.length === 0) {
      onClose();
      return;
    }
    const hl = buildHyperlink();
    if (!hl) {
      onClose();
      return;
    }
    for (const id of selectedIds) {
      setShapeHyperlink(activeSlideId, id, hl);
    }
    onClose();
  };

  const removeLink = () => {
    if (!activeSlideId) {
      onClose();
      return;
    }
    for (const id of selectedIds) {
      setShapeHyperlink(activeSlideId, id, undefined);
    }
    onClose();
  };

  const hasSelection = activeSlideId !== null && selectedIds.length > 0;
  const canApply =
    hasSelection && (mode === 'slide' || (mode === 'bookmark' && bookmarkId !== ''));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--hyperlink"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Гиперссылка</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="slide-size__body">
          {!hasSelection && (
            <p className="slide-size__error">
              Выделите фигуру, чтобы добавить или изменить ссылку.
            </p>
          )}

          <div className="slide-size__presets" role="radiogroup">
            <label
              className={`slide-size__preset${
                mode === 'slide' ? ' slide-size__preset--active' : ''
              }`}
            >
              <input
                type="radio"
                name="hl-mode"
                checked={mode === 'slide'}
                onChange={() => setMode('slide')}
              />
              <span>На слайд</span>
            </label>
            <label
              className={`slide-size__preset${
                mode === 'bookmark' ? ' slide-size__preset--active' : ''
              }`}
            >
              <input
                type="radio"
                name="hl-mode"
                checked={mode === 'bookmark'}
                onChange={() => setMode('bookmark')}
              />
              <span>На закладку</span>
            </label>
          </div>

          {mode === 'slide' && (
            <label className="slide-size__field">
              <span>Назначение</span>
              <select
                value={slideTarget}
                onChange={(e) => setSlideTarget(e.target.value as SlideTarget)}
                disabled={!hasSelection}
              >
                <option value="next">Следующий слайд</option>
                <option value="prev">Предыдущий слайд</option>
                <option value="first">Первый слайд</option>
                <option value="last">Последний слайд</option>
                <optgroup label="По номеру">
                  {slideOrder.map((id, i) => (
                    <option key={id} value={id}>
                      Слайд {i + 1}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          )}

          {mode === 'bookmark' &&
            (bookmarks.length === 0 ? (
              <p className="slide-size__error">
                Закладок пока нет. Задайте имя закладки в панели свойств фигуры
                (секция «Закладка»), затем сошлитесь на неё здесь.
              </p>
            ) : (
              <label className="slide-size__field">
                <span>Закладка</span>
                <select
                  value={bookmarkId}
                  onChange={(e) => setBookmarkId(e.target.value)}
                  disabled={!hasSelection}
                >
                  <option value="">— выберите закладку —</option>
                  {bookmarks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Слайд {b.slideIndex + 1})
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </div>

        <footer className="slide-size__footer">
          {primaryHyperlink && hasSelection && (
            <button
              type="button"
              className="slide-size__btn slide-size__btn--ghost"
              onClick={removeLink}
            >
              Удалить ссылку
            </button>
          )}
          <button
            type="button"
            className="slide-size__btn slide-size__btn--ghost"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="slide-size__btn slide-size__btn--primary"
            onClick={apply}
            disabled={!canApply}
          >
            Применить
          </button>
        </footer>
      </div>
    </div>
  );
}
