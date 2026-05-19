import { useEffect, useMemo, useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { setDeckSize } from '@renderer/lib/slides';

interface SlideSizeDialogProps {
  open: boolean;
  onClose: () => void;
}

// Модалка «Файл → Размер слайда…» (команда `file:slide-size`). По §1.1
// поддерживает три пресета (16:9, 4:3, 16:10) и кастомный размер в
// px / in / cm / pt. Внутри модели всегда px @96 DPI.
//
// Чекбокс «Масштабировать содержимое» (по умолчанию вкл.) пропорционально
// двигает все фигуры всех слайдов под новый размер — иначе оставляет
// координаты как есть.

type Unit = 'px' | 'in' | 'cm' | 'pt';

interface Preset {
  key: 'w16x9' | 'w4x3' | 'w16x10' | 'custom';
  label: string;
  // null для custom — пользователь вводит сам.
  w: number | null;
  h: number | null;
}

const PRESETS: Preset[] = [
  { key: 'w16x9', label: '16:9 (FullHD, 1920×1080)', w: 1920, h: 1080 },
  { key: 'w4x3', label: '4:3 (Standard, 960×720)', w: 960, h: 720 },
  { key: 'w16x10', label: '16:10 (1280×800)', w: 1280, h: 800 },
  { key: 'custom', label: 'Кастомный', w: null, h: null },
];

// CSS-стандарт: 96 px = 1 in. Остальные единицы — через дюйм.
const PX_PER_UNIT: Record<Unit, number> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  pt: 96 / 72,
};

function pxToUnit(px: number, unit: Unit): number {
  return px / PX_PER_UNIT[unit];
}
function unitToPx(value: number, unit: Unit): number {
  return value * PX_PER_UNIT[unit];
}

// Округление для отображения: px — целое, остальные — 3 знака после запятой
// (достаточно, чтобы 1920 px ↔ 20 in туда-обратно не «плыло»).
function formatValue(px: number, unit: Unit): string {
  const v = pxToUnit(px, unit);
  if (unit === 'px') return String(Math.round(v));
  return (Math.round(v * 1000) / 1000).toString();
}

export function SlideSizeDialog({ open, onClose }: SlideSizeDialogProps) {
  const curW = useDeckStore((s) => s.deck?.size.w ?? 1920);
  const curH = useDeckStore((s) => s.deck?.size.h ?? 1080);

  const [presetKey, setPresetKey] = useState<Preset['key']>('w16x9');
  const [unit, setUnit] = useState<Unit>('px');
  const [wStr, setWStr] = useState<string>('1920');
  const [hStr, setHStr] = useState<string>('1080');
  const [scaleContent, setScaleContent] = useState<boolean>(true);

  // Инициализация при каждом открытии — текущий размер деки + подбор пресета.
  useEffect(() => {
    if (!open) return;
    const matched =
      PRESETS.find(
        (p) => p.w !== null && p.h !== null && p.w === curW && p.h === curH,
      ) ?? PRESETS[3];
    setPresetKey(matched.key);
    setUnit('px');
    setWStr(formatValue(curW, 'px'));
    setHStr(formatValue(curH, 'px'));
    setScaleContent(true);
  }, [open, curW, curH]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Парсим текущие поля как px. Возвращаем null, если ввод невалидный.
  const parsedPx = useMemo((): { w: number; h: number } | null => {
    const w = Number(wStr.replace(',', '.'));
    const h = Number(hStr.replace(',', '.'));
    if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
    const wPx = Math.round(unitToPx(w, unit));
    const hPx = Math.round(unitToPx(h, unit));
    if (wPx <= 0 || hPx <= 0) return null;
    // Защита от слишком больших размеров (Konva упрётся в лимит canvas).
    if (wPx > 32000 || hPx > 32000) return null;
    return { w: wPx, h: hPx };
  }, [wStr, hStr, unit]);

  if (!open) return null;

  const choosePreset = (key: Preset['key']) => {
    setPresetKey(key);
    const p = PRESETS.find((x) => x.key === key);
    if (!p || p.w === null || p.h === null) return;
    setWStr(formatValue(p.w, unit));
    setHStr(formatValue(p.h, unit));
  };

  const changeUnit = (next: Unit) => {
    // Конвертируем текущее значение из старой единицы → px → новую,
    // чтобы переключение единиц не «дёргало» введённые числа.
    const wPx = unitToPx(Number(wStr.replace(',', '.')) || 0, unit);
    const hPx = unitToPx(Number(hStr.replace(',', '.')) || 0, unit);
    setUnit(next);
    setWStr(formatValue(wPx, next));
    setHStr(formatValue(hPx, next));
  };

  const onChangeDim = (which: 'w' | 'h', value: string) => {
    if (which === 'w') setWStr(value);
    else setHStr(value);
    // Любое ручное редактирование переводит в режим «Кастомный».
    if (presetKey !== 'custom') setPresetKey('custom');
  };

  const apply = () => {
    if (!parsedPx) return;
    setDeckSize(parsedPx.w, parsedPx.h, scaleContent);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--slide-size"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Размер слайда</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <div className="slide-size__presets" role="radiogroup">
            {PRESETS.map((p) => (
              <label
                key={p.key}
                className={`slide-size__preset${
                  presetKey === p.key ? ' slide-size__preset--active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="slide-size-preset"
                  checked={presetKey === p.key}
                  onChange={() => choosePreset(p.key)}
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>

          <div className="slide-size__dims">
            <label className="slide-size__field">
              <span>Ширина</span>
              <input
                type="text"
                inputMode="decimal"
                value={wStr}
                onChange={(e) => onChangeDim('w', e.target.value)}
              />
            </label>
            <label className="slide-size__field">
              <span>Высота</span>
              <input
                type="text"
                inputMode="decimal"
                value={hStr}
                onChange={(e) => onChangeDim('h', e.target.value)}
              />
            </label>
            <label className="slide-size__field slide-size__field--unit">
              <span>Единицы</span>
              <select
                value={unit}
                onChange={(e) => changeUnit(e.target.value as Unit)}
              >
                <option value="px">пиксели (px)</option>
                <option value="in">дюймы (in)</option>
                <option value="cm">сантиметры (cm)</option>
                <option value="pt">пункты (pt)</option>
              </select>
            </label>
          </div>

          <label className="slide-size__scale">
            <input
              type="checkbox"
              checked={scaleContent}
              onChange={(e) => setScaleContent(e.target.checked)}
            />
            <span>Масштабировать содержимое всех слайдов</span>
          </label>

          {!parsedPx && (
            <p className="slide-size__error">
              Введите корректные положительные размеры (до 32000 px по каждой
              стороне).
            </p>
          )}
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
            disabled={!parsedPx}
          >
            Применить
          </button>
        </footer>
      </div>
    </div>
  );
}
