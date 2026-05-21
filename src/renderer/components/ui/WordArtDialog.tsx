import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { FONT_FAMILIES } from '@renderer/lib/fonts';
import { measureWordArt } from '@renderer/lib/wordart';
import type { WordArtShape } from '@renderer/lib/model/schema';

// Мини-редактор WordArt (Phase 3.21): текст, шрифт, размер, жирный/курсив,
// цвет заливки, цвет+толщина контура. Пишет в стор «вживую» (превью на холсте
// обновляется сразу). При смене текста/шрифта/размера пересчитываем bbox под
// натуральный размер; цвет/контур bbox не трогают (сохраняем ручной resize).
type TextStylePatch = Partial<Pick<WordArtShape, 'text' | 'fontFamily' | 'fontSize' | 'bold' | 'italic'>>;

export function WordArtDialog() {
  const shapeId = useUiStore((s) => s.wordArtShapeId);
  const close = useUiStore((s) => s.setWordArtShape);
  const slideId = useUiStore((s) => s.activeSlideId);

  const data = useDeckStore(
    useShallow((s) => {
      if (!slideId || !shapeId) return null;
      const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
      if (!sh || sh.type !== 'wordart') return null;
      return {
        text: sh.text,
        fontFamily: sh.fontFamily,
        fontSize: sh.fontSize,
        bold: sh.bold ?? false,
        italic: sh.italic ?? false,
        fillColor: sh.fill?.kind === 'solid' ? sh.fill.color : '#1a73e8',
        strokeColor: sh.stroke?.color ?? '#0a2a66',
        strokeWidth: sh.stroke?.width ?? 0,
      };
    }),
  );

  const open = shapeId !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !slideId || !shapeId || !data) return null;

  // Текст/шрифт/размер/начертание: применяем и пересчитываем bbox под текст.
  const setStyle = (patch: TextStylePatch) => {
    useDeckStore.setState((state) => {
      const sh = state.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
      if (!sh || sh.type !== 'wordart') return;
      if (patch.text !== undefined) sh.text = patch.text;
      if (patch.fontFamily !== undefined) sh.fontFamily = patch.fontFamily;
      if (patch.fontSize !== undefined) sh.fontSize = patch.fontSize;
      if (patch.bold !== undefined) sh.bold = patch.bold;
      if (patch.italic !== undefined) sh.italic = patch.italic;
      const m = measureWordArt(sh.text, sh.fontFamily, sh.fontSize, sh.bold, sh.italic);
      sh.w = m.w;
      sh.h = m.h;
      if (state.deck) state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const setFill = (color: string) => {
    useDeckStore.setState((state) => {
      const sh = state.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
      if (!sh || sh.type !== 'wordart') return;
      sh.fill = { kind: 'solid', color };
      if (state.deck) state.deck.modifiedAt = new Date().toISOString();
    });
  };

  const setStroke = (patch: { color?: string; width?: number }) => {
    useDeckStore.setState((state) => {
      const sh = state.deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
      if (!sh || sh.type !== 'wordart') return;
      const color = patch.color ?? sh.stroke?.color ?? '#0a2a66';
      const width = patch.width ?? sh.stroke?.width ?? 0;
      sh.stroke = width > 0 ? { color, width } : undefined;
      if (state.deck) state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <div className="modal-backdrop" onClick={() => close(null)}>
      <div className="modal modal--hyperlink" onClick={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>WordArt</h2>
          <button className="modal__close" onClick={() => close(null)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="slide-size__body">
          <label className="slide-size__field">
            <span>Текст</span>
            <textarea
              className="alt-text__area"
              rows={2}
              value={data.text}
              autoFocus
              onChange={(e) => setStyle({ text: e.target.value })}
            />
          </label>

          <label className="slide-size__field">
            <span>Шрифт</span>
            <select
              className="inspector-select"
              value={data.fontFamily}
              onChange={(e) => setStyle({ fontFamily: e.target.value })}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <div className="wordart__row">
            <label className="slide-size__field">
              <span>Размер</span>
              <input
                type="number"
                className="inspector-input"
                min={4}
                max={800}
                value={data.fontSize}
                onChange={(e) => setStyle({ fontSize: Math.max(4, Number(e.target.value) || 4) })}
              />
            </label>
            <label className="wordart__check">
              <input
                type="checkbox"
                checked={data.bold}
                onChange={(e) => setStyle({ bold: e.target.checked })}
              />
              <span>Жирный</span>
            </label>
            <label className="wordart__check">
              <input
                type="checkbox"
                checked={data.italic}
                onChange={(e) => setStyle({ italic: e.target.checked })}
              />
              <span>Курсив</span>
            </label>
          </div>

          <div className="wordart__row">
            <label className="wordart__color">
              <span>Заливка</span>
              <input type="color" value={data.fillColor} onChange={(e) => setFill(e.target.value)} />
            </label>
            <label className="wordart__color">
              <span>Контур</span>
              <input
                type="color"
                value={data.strokeColor}
                onChange={(e) => setStroke({ color: e.target.value })}
              />
            </label>
            <label className="slide-size__field">
              <span>Толщина</span>
              <input
                type="number"
                className="inspector-input"
                min={0}
                max={24}
                value={data.strokeWidth}
                onChange={(e) => setStroke({ width: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          </div>
        </div>

        <footer className="slide-size__footer">
          <button className="inspector-btn inspector-btn--primary" onClick={() => close(null)}>
            Готово
          </button>
        </footer>
      </div>
    </div>
  );
}
