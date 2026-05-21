import { PRESET_CATEGORIES, type PresetShape } from '@renderer/lib/presetShapes';

interface ShapeLibraryProps {
  onPick: (preset: PresetShape) => void;
  onClose: () => void;
}

// Поповер библиотеки фигур (Phase 3.20): фигуры по категориям, по клику —
// вставка фигуры (нативный примитив для rect/ellipse/line или pathShape).
// Превью — сам SVG-path; линии рисуем штрихом без заливки.
export function ShapeLibrary({ onPick, onClose }: ShapeLibraryProps) {
  return (
    <>
      <div className="shape-library-backdrop" onClick={onClose} />
      <div className="shape-library" onClick={(e) => e.stopPropagation()}>
        {PRESET_CATEGORIES.map((cat) => (
          <div key={cat.key} className="shape-library__cat">
            <p className="shape-library__cat-title">{cat.label}</p>
            <div className="shape-library__grid">
              {cat.shapes.map((s) => {
                const isLine = s.native === 'line' || s.native === 'arrowLine';
                return (
                  <button
                    key={s.key}
                    type="button"
                    className="shape-library__item"
                    title={s.label}
                    onClick={() => onPick(s)}
                  >
                    <svg viewBox="-4 -4 108 108" className="shape-library__svg" aria-hidden>
                      <path
                        d={s.path}
                        fill={isLine ? 'none' : '#4a9eff'}
                        stroke="#1a73e8"
                        strokeWidth={isLine ? 6 : 2}
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
