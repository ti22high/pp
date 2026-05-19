import { useEffect, useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { setPageNumbers } from '@renderer/lib/slides';

interface PageNumbersDialogProps {
  open: boolean;
  onClose: () => void;
}

// Диалог «Вставка → Номер слайда…» (команда `insert:page-number`). По §1.13:
// on/off + skip title slides. Положение фиксировано — правый нижний угол
// слайда (рендер в Slide.tsx). Применяется ко всем слайдам деки сразу.
export function PageNumbersDialog({ open, onClose }: PageNumbersDialogProps) {
  const cfg = useDeckStore((s) => s.deck?.pageNumbers);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [skipFirst, setSkipFirst] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;
    setEnabled(cfg?.enabled ?? false);
    setSkipFirst(cfg?.skipFirst ?? true);
  }, [open, cfg]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const apply = () => {
    setPageNumbers(enabled, skipFirst);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--page-numbers"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Номера слайдов</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <label className="slide-size__scale">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Показывать номера слайдов</span>
          </label>
          <label className="slide-size__scale">
            <input
              type="checkbox"
              checked={skipFirst}
              disabled={!enabled}
              onChange={(e) => setSkipFirst(e.target.checked)}
            />
            <span>Не показывать на первом слайде</span>
          </label>
        </div>

        <footer className="slide-size__footer">
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
          >
            Применить
          </button>
        </footer>
      </div>
    </div>
  );
}
