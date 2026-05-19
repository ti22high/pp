import { useEffect, useRef, useState } from 'react';

interface ColorFieldProps {
  label: string;
  // ARGB hex или RGB hex (с/без alpha). null/undefined = «без цвета».
  value: string | null | undefined;
  onCommit: (next: string) => void;
  // Доп. action, например, чекбокс «нет цвета» — рендерится справа от input-а.
  // Пока не используем; alpha-канал управляется через opacity-секцию.
}

// Свотч + hex-input. Свотч открывает нативный <input type="color"> через
// клик по скрытому элементу — это стандартный паттерн для chromium/electron.
// Hex без `#` принимаем тоже; нормализуем при коммите.
export function ColorField({ label, value, onCommit }: ColorFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState(value ?? '#000000');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setBuffer(value ?? '#000000');
  }, [value, focused]);

  const commit = (raw: string) => {
    const v = normalizeHex(raw);
    if (v) {
      setBuffer(v);
      onCommit(v);
    } else {
      setBuffer(value ?? '#000000');
    }
  };

  return (
    <label className="inspector-row">
      <span className="inspector-label">{label}</span>
      <span className="inspector-input-wrap">
        <button
          type="button"
          className="inspector-swatch"
          style={{ background: buffer }}
          onClick={() => ref.current?.click()}
          aria-label={`Выбрать ${label.toLowerCase()}`}
        />
        <input
          ref={ref}
          type="color"
          className="inspector-color-hidden"
          value={buffer.slice(0, 7)}
          onChange={(e) => commit(e.target.value)}
        />
        <input
          type="text"
          className="inspector-input inspector-input--hex"
          value={buffer}
          onFocus={() => setFocused(true)}
          onChange={(e) => setBuffer(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(buffer);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setBuffer(value ?? '#000000');
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </span>
    </label>
  );
}

// Принимаем "#rrggbb", "rrggbb", "#rrggbbaa", "rrggbbaa". Возвращаем
// нормализованный hex (lowercase, с #) или null если строка не парсится.
function normalizeHex(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(cleaned) || /^[0-9a-f]{8}$/.test(cleaned)) {
    return `#${cleaned}`;
  }
  return null;
}
