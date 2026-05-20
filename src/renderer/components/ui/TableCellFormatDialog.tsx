import { useEffect } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { tableOps, type CellFormat } from '@renderer/lib/table';

const H_TITLES = { left: 'Слева', center: 'По центру', right: 'Справа', justify: 'По ширине' };
const V_TITLES = { top: 'Сверху', middle: 'По центру', bottom: 'Снизу' };

// SVG-иконки выравнивания текста (горизонтальные линии разной длины/привязки),
// как в Slides — без эмодзи.
function HAlignIcon({ kind }: { kind: 'left' | 'center' | 'right' | 'justify' }) {
  // Четыре линии; для каждого режима задаём [x1,x2] по строкам.
  const rows: Array<[number, number]> =
    kind === 'left'
      ? [[2, 14], [2, 10], [2, 13], [2, 8]]
      : kind === 'right'
        ? [[2, 14], [6, 14], [3, 14], [8, 14]]
        : kind === 'center'
          ? [[2, 14], [4, 12], [3, 13], [5, 11]]
          : [[2, 14], [2, 14], [2, 14], [2, 14]];
  const ys = [3.5, 6.5, 9.5, 12.5];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {rows.map(([x1, x2], i) => (
        <line
          key={i}
          x1={x1}
          y1={ys[i]}
          x2={x2}
          y2={ys[i]}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

// SVG-иконки вертикального выравнивания: жирная полоса у нужного края +
// две тонкие «строки текста».
function VAlignIcon({ kind }: { kind: 'top' | 'middle' | 'bottom' }) {
  const barY = kind === 'top' ? 2.5 : kind === 'middle' ? 8 : 13.5;
  const textYs = kind === 'top' ? [6, 9] : kind === 'middle' ? [4.5, 11.5] : [7, 10];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1={barY} x2="14" y2={barY} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {textYs.map((y, i) => (
        <line key={i} x1="5" y1={y} x2="11" y2={y} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

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
    <div className="float-panel float-panel--right">
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

          <div className="slide-size__field">
            <span>По горизонтали</span>
            <div className="seg-group" role="group">
              {(['left', 'center', 'right', 'justify'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  title={H_TITLES[val]}
                  className={`seg-btn${align === val ? ' seg-btn--active' : ''}`}
                  onClick={() => apply({ align: val })}
                >
                  <HAlignIcon kind={val} />
                </button>
              ))}
            </div>
          </div>

          <div className="slide-size__field">
            <span>По вертикали</span>
            <div className="seg-group" role="group">
              {(['top', 'middle', 'bottom'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  title={V_TITLES[val]}
                  className={`seg-btn${valign === val ? ' seg-btn--active' : ''}`}
                  onClick={() => apply({ valign: val })}
                >
                  <VAlignIcon kind={val} />
                </button>
              ))}
            </div>
          </div>
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
  );
}
