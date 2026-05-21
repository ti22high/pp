import { PRESET_CATEGORIES } from '@renderer/lib/presetShapes';

interface ShapeLibraryProps {
  onPick: (path: string) => void;
  onClose: () => void;
}

// Поповер библиотеки фигур (Phase 3.20): фигуры по категориям, по клику —
// вставка preset-фигуры (pathShape). Превью — сам SVG-path в коробке 0..100.
export function ShapeLibrary({ onPick, onClose }: ShapeLibraryProps) {
  return (
    <>
      <div className="shape-library-backdrop" onClick={onClose} />
      <div className="shape-library" onClick={(e) => e.stopPropagation()}>
        {PRESET_CATEGORIES.map((cat) => (
          <div key={cat.key} className="shape-library__cat">
            <p className="shape-library__cat-title">{cat.label}</p>
            <div className="shape-library__grid">
              {cat.shapes.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="shape-library__item"
                  title={s.label}
                  onClick={() => onPick(s.path)}
                >
                  <svg viewBox="-4 -4 108 108" className="shape-library__svg" aria-hidden>
                    <path d={s.path} fill="#4a9eff" stroke="#1a73e8" strokeWidth={2} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
