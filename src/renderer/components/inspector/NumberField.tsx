import { useEffect, useRef, useState } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (next: number) => void;
  // Минимум (после parseFloat). По умолчанию -Infinity. Для W/H используем 2.
  min?: number;
  // Шаг для стрелок (Up/Down). Дефолт 1.
  step?: number;
  // Суффикс — отображается рядом с input-ом (например, "°" для rotation).
  suffix?: string;
}

// Числовое поле с локальным буфером.
//
// Зачем буфер вместо прямой записи в стор на каждый keystroke:
// ввод «120» проходит через значения «1», «12» — если мы будем коммитить
// каждое промежуточное состояние, фигура успеет прыгнуть в эти бредовые
// координаты и обратно, а floating point round-trip размажет точность.
// Поэтому коммитим только на Enter / blur. Escape — откатить буфер.
//
// `value` из props — источник истины (модель). Если меняется снаружи
// (drag/resize на канвасе), синхронизируем буфер.
export function NumberField({ label, value, onCommit, min, step = 1, suffix }: NumberFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState<string>(() => format(value));
  // Флаг «в фокусе»: пока пользователь редактирует, внешние обновления
  // value не должны перезаписывать буфер (иначе курсор/ввод ломаются).
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setBuffer(format(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseFloat(buffer.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setBuffer(format(value));
      return;
    }
    const clamped = min !== undefined ? Math.max(min, parsed) : parsed;
    if (clamped !== value) onCommit(clamped);
    setBuffer(format(clamped));
  };

  return (
    <label className="inspector-row">
      <span className="inspector-label">{label}</span>
      <span className="inspector-input-wrap">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="inspector-input"
          value={buffer}
          step={step}
          onFocus={() => setFocused(true)}
          onChange={(e) => setBuffer(e.target.value)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
              inputRef.current?.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setBuffer(format(value));
              inputRef.current?.blur();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const next = (parseFloat(buffer.replace(',', '.')) || 0) + (e.shiftKey ? step * 10 : step);
              setBuffer(format(min !== undefined ? Math.max(min, next) : next));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = (parseFloat(buffer.replace(',', '.')) || 0) - (e.shiftKey ? step * 10 : step);
              setBuffer(format(min !== undefined ? Math.max(min, next) : next));
            }
          }}
        />
        {suffix && <span className="inspector-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

// Округление до 1 знака; целые числа — без десятичной точки.
function format(v: number): string {
  if (!Number.isFinite(v)) return '0';
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
