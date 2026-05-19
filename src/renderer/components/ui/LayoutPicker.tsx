import { useEffect } from 'react';
import { LAYOUTS, type LayoutKey } from '@renderer/lib/model/layouts';
import { applyLayout } from '@renderer/lib/slides';

interface LayoutPickerProps {
  open: boolean;
  onClose: () => void;
}

// Модальный пикер layout-ов. Открывается из меню Слайд → Применить макет
// (команда `slide:apply-layout`). Клик по карточке применяет layout
// к активному слайду — placeholder-фигуры из layout-а добавляются
// (старые НЕ удаляются — пользователь может смешивать).
export function LayoutPicker({ open, onClose }: LayoutPickerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const choose = (key: LayoutKey) => {
    applyLayout(key);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Выберите макет</h2>
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>
        <div className="layout-grid">
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              type="button"
              className="layout-card"
              onClick={() => choose(l.key)}
            >
              <LayoutThumb layoutKey={l.key} />
              <span className="layout-card__label">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Мини-превью layout-а: рендерим placeholder-фигуры в 200×112 (16:9) с
// заливкой светло-серой.
function LayoutThumb({ layoutKey }: { layoutKey: LayoutKey }) {
  const layout = LAYOUTS.find((l) => l.key === layoutKey);
  if (!layout) return null;
  const shapes = layout.build();
  const W = 1920;
  const H = 1080;
  return (
    <div className="layout-thumb">
      {shapes.map((sh) => (
        <div
          key={sh.id}
          className="layout-thumb__ph"
          style={{
            left: `${(sh.x / W) * 100}%`,
            top: `${(sh.y / H) * 100}%`,
            width: `${(sh.w / W) * 100}%`,
            height: `${(sh.h / H) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
