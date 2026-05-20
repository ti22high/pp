import { useEffect } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { tableOps, type CellFormat } from '@renderer/lib/table';

// Диалог «Формат ячеек» (Phase 3.10). Открывается из контекстного меню таблицы;
// применяет фон, границу, padding и выравнивание к выбранному диапазону ячеек.
// Изменения применяются сразу (live), закрытие — Esc / кнопка / клик по фону.
export function TableCellFormatDialog() {
  const open = useUiStore((s) => s.tableFormatOpen);
  const setOpen = useUiStore((s) => s.setTableFormatOpen);
  const slideId = useUiStore((s) => s.activeSlideId);
  const selection = useUiStore((s) => s.tableSelection);

  // Анкор-ячейка диапазона — для префилла текущих значений.
  const cell = useDeckStore((s) => {
    if (!slideId || !selection) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === selection.shapeId);
    if (sh?.type !== 'table') return null;
    const r = Math.min(selection.r0, selection.r1);
    const c = Math.min(selection.c0, selection.c1);
    return sh.cells[r]?.[c] ?? null;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open || !slideId || !selection) return null;

  const apply = (fmt: CellFormat) => {
    tableOps.setCellFormat(
      slideId,
      selection.shapeId,
      selection.r0,
      selection.c0,
      selection.r1,
      selection.c1,
      fmt,
    );
  };

  const fill = cell?.fill ?? '#ffffff';
  const borderColor = cell?.borderColor ?? '#9aa0a6';
  const borderWidth = cell?.borderWidth ?? 1;
  const padding = cell?.padding ?? 8;
  const align = cell?.align ?? 'left';
  const valign = cell?.valign ?? 'middle';

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal modal--hyperlink" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Формат ячеек</h2>
          <button className="modal__close" onClick={() => setOpen(false)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <label className="slide-size__field">
            <span>Фон</span>
            <span className="inspector-input-wrap">
              <input
                type="color"
                value={fill}
                onChange={(e) => apply({ fill: e.target.value })}
              />
              <button
                type="button"
                className="slide-size__btn slide-size__btn--ghost"
                onClick={() => apply({ fill: undefined })}
              >
                Без фона
              </button>
            </span>
          </label>

          <label className="slide-size__field">
            <span>Цвет границы</span>
            <input
              type="color"
              value={borderColor}
              onChange={(e) => apply({ borderColor: e.target.value })}
            />
          </label>

          <label className="slide-size__field">
            <span>Толщина границы</span>
            <input
              type="number"
              min={0}
              max={20}
              value={borderWidth}
              onChange={(e) => apply({ borderWidth: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>

          <label className="slide-size__field">
            <span>Отступ (padding)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={padding}
              onChange={(e) => apply({ padding: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>

          <label className="slide-size__field">
            <span>По горизонтали</span>
            <select value={align} onChange={(e) => apply({ align: e.target.value as CellFormat['align'] })}>
              <option value="left">Слева</option>
              <option value="center">По центру</option>
              <option value="right">Справа</option>
            </select>
          </label>

          <label className="slide-size__field">
            <span>По вертикали</span>
            <select value={valign} onChange={(e) => apply({ valign: e.target.value as CellFormat['valign'] })}>
              <option value="top">Сверху</option>
              <option value="middle">По центру</option>
              <option value="bottom">Снизу</option>
            </select>
          </label>
        </div>

        <footer className="slide-size__footer">
          <button
            type="button"
            className="slide-size__btn slide-size__btn--primary"
            onClick={() => setOpen(false)}
          >
            Готово
          </button>
        </footer>
      </div>
    </div>
  );
}
