import { useState } from 'react';

interface TablePickerProps {
  onPick: (rows: number, cols: number) => void;
  onClose: () => void;
}

const MAX_ROWS = 8;
const MAX_COLS = 10;

// Поповер выбора размера таблицы наведением по сетке (как в Slides/PowerPoint).
// Подсвечивает rows×cols, по клику вставляет таблицу. Большие таблицы — через
// добавление строк/столбцов (Phase 3.9).
export function TablePicker({ onPick, onClose }: TablePickerProps) {
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 1, c: 1 });

  return (
    <div className="table-picker-backdrop" onClick={onClose}>
      <div className="table-picker" onClick={(e) => e.stopPropagation()}>
        <div className="table-picker__grid">
          {Array.from({ length: MAX_ROWS }, (_, r) =>
            Array.from({ length: MAX_COLS }, (_, c) => {
              const active = r < hover.r && c < hover.c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`table-picker__cell${active ? ' table-picker__cell--active' : ''}`}
                  onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                  onClick={() => onPick(hover.r, hover.c)}
                />
              );
            }),
          )}
        </div>
        <p className="table-picker__label">
          {hover.c} × {hover.r}
        </p>
      </div>
    </div>
  );
}
