import { useEffect, useRef } from 'react';
import type * as React from 'react';
import { MathfieldElement } from 'mathlive';
import 'mathlive/static.css';
import 'mathlive/fonts.css';

// Шрифты MathLive (тот же набор KaTeX) грузим сами через mathlive/fonts.css —
// Vite их бандлит, поэтому отключаем авто-загрузку с CDN (офлайн-first).
// Звуки клавиатуры не нужны.
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        ref?: React.Ref<MathfieldElement>;
      };
    }
  }
}

interface MathFieldProps {
  value: string;
  onChange: (latex: string) => void;
  onReady?: (mf: MathfieldElement) => void;
}

// React-обёртка над веб-компонентом <math-field> (Phase 3.24): WYSIWYG-ввод
// формул «как в Word», на выходе LaTeX. onChange — при каждом изменении.
export function MathField({ value, onChange, onReady }: MathFieldProps) {
  const ref = useRef<MathfieldElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const mf = ref.current;
    if (!mf) return;
    mf.value = value;
    onReady?.(mf);
    const handler = () => onChangeRef.current(mf.value);
    mf.addEventListener('input', handler);
    return () => mf.removeEventListener('input', handler);
    // Инициализация один раз; внешний value синхронизируется ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Внешнее изменение value (правка в LaTeX-поле) → синхронизируем без петли.
  useEffect(() => {
    const mf = ref.current;
    if (mf && mf.value !== value) mf.value = value;
  }, [value]);

  return <math-field ref={ref} className="mathfield" />;
}
