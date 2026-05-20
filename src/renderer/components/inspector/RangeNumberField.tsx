import { useEffect, useState } from 'react';

interface RangeNumberFieldProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  // Округление значения для отображения (например, Math.round).
  format?: (v: number) => number;
  onChange: (next: number) => void;
}

// Ползунок + редактируемое числовое поле для ручного ввода значения.
// Поле — локальный стейт, чтобы можно было печатать промежуточные строки
// (минус, пустая строка); коммит наружу — по blur / Enter с зажимом в [min,max].
export function RangeNumberField({
  label,
  min,
  max,
  step = 1,
  value,
  format = (v) => v,
  onChange,
}: RangeNumberFieldProps) {
  const display = format(value);
  const [text, setText] = useState(String(display));

  // Синхронизируем поле, когда значение меняется снаружи (ползунок, undo и т.п.).
  useEffect(() => {
    setText(String(display));
  }, [display]);

  const commit = () => {
    const parsed = Number(text);
    if (Number.isNaN(parsed)) {
      setText(String(display));
      return;
    }
    onChange(Math.max(min, Math.min(max, parsed)));
  };

  return (
    <label className="inspector-row">
      <span className="inspector-label">{label}</span>
      <span className="inspector-input-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={display}
          className="inspector-range"
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={text}
          className="inspector-range-num"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </span>
    </label>
  );
}
