import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import type { SlideBackground } from '@renderer/lib/model/schema';
import {
  setSlideBackground,
  setAllSlidesBackground,
} from '@renderer/lib/slides';
import { fileToMediaSrc } from '@renderer/lib/media';

interface BackgroundEditorProps {
  open: boolean;
  onClose: () => void;
}

// Модалка «Слайд → Фон…» (команда `slide:background`). Позволяет:
// — сменить цвет фона текущего слайда;
// — загрузить изображение в качестве фона (data URL пока, до MediaManager);
// — сбросить к фону темы.
// Кнопки: «Применить» (к текущему слайду), «Применить ко всем», «Отмена».
//
// Дизайн повторяет LayoutPicker: backdrop + .modal + header + body. Outside-
// click и Esc закрывают без применения.
type Mode = 'color' | 'image' | 'theme';

const PRESET_COLORS = [
  '#ffffff',
  '#f8f9fa',
  '#fde293',
  '#fce8b2',
  '#a8dab5',
  '#aecbfa',
  '#d7aefb',
  '#fbcfe8',
  '#1f1f1f',
  '#5f6368',
  '#1a73e8',
  '#137333',
  '#a50e0e',
  '#b06000',
];

export function BackgroundEditor({ open, onClose }: BackgroundEditorProps) {
  const activeId = useUiStore((s) => s.activeSlideId);
  const slide = useDeckStore((s) =>
    activeId ? s.deck?.slides[activeId] ?? null : null,
  );

  const [mode, setMode] = useState<Mode>('color');
  const [color, setColor] = useState<string>('#ffffff');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // На каждое открытие инициализируем форму текущим фоном слайда.
  useEffect(() => {
    if (!open || !slide) return;
    const bg = slide.background;
    if (!bg || bg.type === 'theme') {
      setMode('theme');
      setColor('#ffffff');
      setImageSrc(null);
    } else if (bg.type === 'color') {
      setMode('color');
      setColor(bg.color);
      setImageSrc(null);
    } else {
      setMode('image');
      setImageSrc(bg.src);
    }
  }, [open, slide]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const buildBackground = (): SlideBackground => {
    if (mode === 'color') return { type: 'color', color };
    if (mode === 'image' && imageSrc) return { type: 'image', src: imageSrc };
    return { type: 'theme' };
  };

  const apply = () => {
    if (!activeId) return;
    setSlideBackground(activeId, buildBackground());
    onClose();
  };

  const applyAll = () => {
    setAllSlidesBackground(buildBackground());
    onClose();
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Сбрасываем value заранее: повторный выбор того же файла триггерит change.
    e.target.value = '';
    if (!file) return;
    // Картинка сохраняется на диск через MediaManager → 'app://media/<sha256>.<ext>'.
    const src = await fileToMediaSrc(file);
    setImageSrc(src);
    setMode('image');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--bg-editor"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Фон слайда</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="bg-editor__body">
          <nav className="bg-editor__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'color'}
              className={`bg-editor__tab${mode === 'color' ? ' bg-editor__tab--active' : ''}`}
              onClick={() => setMode('color')}
            >
              Цвет
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'image'}
              className={`bg-editor__tab${mode === 'image' ? ' bg-editor__tab--active' : ''}`}
              onClick={() => setMode('image')}
            >
              Изображение
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'theme'}
              className={`bg-editor__tab${mode === 'theme' ? ' bg-editor__tab--active' : ''}`}
              onClick={() => setMode('theme')}
            >
              По теме
            </button>
          </nav>

          <div className="bg-editor__content">
            {mode === 'color' && (
              <div className="bg-editor__pane">
                <div className="bg-editor__row">
                  <label className="bg-editor__label" htmlFor="bg-color-input">
                    Цвет
                  </label>
                  <span className="bg-editor__color-wrap">
                    <input
                      id="bg-color-input"
                      type="color"
                      className="bg-editor__color"
                      value={color.slice(0, 7)}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <input
                      type="text"
                      className="bg-editor__hex"
                      value={color}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                          setColor(v.startsWith('#') ? v : `#${v}`);
                        } else {
                          setColor(v);
                        }
                      }}
                    />
                  </span>
                </div>
                <div className="bg-editor__presets">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`bg-editor__preset${
                        c.toLowerCase() === color.toLowerCase()
                          ? ' bg-editor__preset--active'
                          : ''
                      }`}
                      style={{ background: c }}
                      aria-label={`Цвет ${c}`}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {mode === 'image' && (
              <div className="bg-editor__pane">
                <div
                  className="bg-editor__preview"
                  style={{
                    backgroundImage: imageSrc
                      ? `url(${JSON.stringify(imageSrc)})`
                      : undefined,
                  }}
                >
                  {!imageSrc && (
                    <span className="bg-editor__preview-empty">
                      Изображение не выбрано
                    </span>
                  )}
                </div>
                <div className="bg-editor__actions">
                  <button
                    type="button"
                    className="bg-editor__btn"
                    onClick={onPickFile}
                  >
                    Выбрать файл…
                  </button>
                  {imageSrc && (
                    <button
                      type="button"
                      className="bg-editor__btn bg-editor__btn--ghost"
                      onClick={() => setImageSrc(null)}
                    >
                      Убрать
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="bg-editor__file-hidden"
                    onChange={onFileChange}
                  />
                </div>
                <p className="bg-editor__hint">
                  Изображение растягивается на 1920×1080 c сохранением
                  пропорций (cover).
                </p>
              </div>
            )}

            {mode === 'theme' && (
              <div className="bg-editor__pane">
                <p className="bg-editor__hint">
                  Использовать фон из темы (мастер-слайда). Эквивалент
                  «Сбросить фон».
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="bg-editor__footer">
          <button
            type="button"
            className="bg-editor__btn bg-editor__btn--ghost"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="bg-editor__btn bg-editor__btn--ghost"
            onClick={applyAll}
            disabled={mode === 'image' && !imageSrc}
          >
            Применить ко всем
          </button>
          <button
            type="button"
            className="bg-editor__btn bg-editor__btn--primary"
            onClick={apply}
            disabled={mode === 'image' && !imageSrc}
          >
            Применить
          </button>
        </footer>
      </div>
    </div>
  );
}
