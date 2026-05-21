import { useEffect, useRef, type CSSProperties } from 'react';
import type { WordArtShape } from '@renderer/lib/model/schema';
import { useUiStore } from '@renderer/stores/ui';
import { setWordArtStyle } from '@renderer/lib/slides';
import { WORDART_LINE_HEIGHT } from '@renderer/lib/wordart';

interface WordArtOverlayProps {
  slideId: string;
  shape: WordArtShape;
  panX: number;
  panY: number;
  zoom: number;
}

// Инлайн-редактор WordArt (Phase 3.21): DOM-textarea поверх Konva-фигуры,
// стилизованная под WordArt (шрифт, заливка, контур). Правка «как в Word»:
// двойной клик → печатаешь прямо на холсте, текст виден сразу. Размер bbox
// подгоняется под текст при каждом вводе (setWordArtStyle). Стиль (цвет/шрифт)
// меняется в контекстном тулбаре сверху, не закрывая редактор (data-keep-editing).
export function WordArtOverlay({ slideId, shape, panX, panY, zoom }: WordArtOverlayProps) {
  const setEditingShape = useUiStore((s) => s.setEditingShape);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Фокус и каретка в конце при открытии.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const commit = () => setEditingShape(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        commit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Клик вне оверлея — закрыть. Клик по [data-keep-editing] (контекстный
  // тулбар WordArt) не закрывает — иначе нельзя поменять стиль во время правки.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-keep-editing]')) return;
      if (ref.current && !ref.current.contains(e.target as Node)) commit();
    };
    window.addEventListener('mousedown', onMouseDown, true);
    return () => window.removeEventListener('mousedown', onMouseDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillColor = shape.fill?.kind === 'solid' ? shape.fill.color : '#1a73e8';
  const strokeColor = shape.stroke?.color;
  const strokeWidth = shape.stroke?.width ?? 0;

  const style: CSSProperties = {
    position: 'absolute',
    left: panX + shape.x * zoom,
    top: panY + shape.y * zoom,
    width: shape.w * zoom,
    height: shape.h * zoom,
    transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
    transformOrigin: 'top left',
    fontFamily: shape.fontFamily,
    fontSize: `${shape.fontSize * zoom}px`,
    fontWeight: shape.bold ? 700 : 400,
    fontStyle: shape.italic ? 'italic' : 'normal',
    lineHeight: WORDART_LINE_HEIGHT,
    color: fillColor,
    WebkitTextStroke: strokeWidth > 0 && strokeColor ? `${strokeWidth * zoom}px ${strokeColor}` : undefined,
    textAlign: 'center',
  };

  return (
    <textarea
      ref={ref}
      className="wordart-overlay"
      style={style}
      value={shape.text}
      spellCheck={false}
      onChange={(e) => setWordArtStyle(slideId, shape.id, { text: e.target.value })}
    />
  );
}
