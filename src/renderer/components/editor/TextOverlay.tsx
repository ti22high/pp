import { useEffect, useRef, type CSSProperties } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { TextShape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';

interface TextOverlayProps {
  slideId: string;
  shape: TextShape;
  // Параметры стейджа: pan/zoom — чтобы оверлей сел поверх Konva-фигуры
  // в screen-координатах контейнера .app-canvas.
  panX: number;
  panY: number;
  zoom: number;
}

// DOM-оверлей с TipTap для редактирования текста.
// Совпадает по bbox с Konva.Text (с учётом zoom и pan стейджа).
// На blur/Escape — сохраняет JSON в deckStore и закрывает оверлей.
export function TextOverlay({ slideId, shape, panX, panY, zoom }: TextOverlayProps) {
  const setEditingShape = useUiStore((s) => s.setEditingShape);
  const ref = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: shape.tiptapDoc as object,
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'text-overlay__pm',
      },
    },
  });

  // Сохранить и закрыть.
  const commit = () => {
    if (!editor) {
      setEditingShape(null);
      return;
    }
    const json = editor.getJSON();
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const slide = state.deck.slides[slideId];
      if (!slide) return;
      const sh = slide.shapes.find((s) => s.id === shape.id);
      if (sh && sh.type === 'text') {
        sh.tiptapDoc = json;
      }
      state.deck.modifiedAt = new Date().toISOString();
    });
    setEditingShape(null);
  };

  // Escape — отменить выход без сохранения смысла нет (TipTap уже изменил doc),
  // поэтому Escape тоже коммитит. Enter без модификаторов — это просто перевод
  // строки, не выход.
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
  }, [editor]);

  // Клик вне оверлея — закрыть.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        commit();
      }
    };
    // Используем capture, чтобы перехватить событие до Konva-Stage.
    window.addEventListener('mousedown', onMouseDown, true);
    return () => window.removeEventListener('mousedown', onMouseDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  // Координаты в системе .app-canvas (родительский контейнер с position:relative).
  // Stage сдвинут на (panX,panY) и отмасштабирован zoom, поэтому экранная
  // позиция фигуры = pan + shape.xy * zoom; экранный размер = shape.wh * zoom.
  // Rotation для текста в Phase 2.10 не учитываем — full-text editing с rotation
  // редко используется в Slides, добавим позже при необходимости.
  const style: CSSProperties = {
    position: 'absolute',
    left: panX + shape.x * zoom,
    top: panY + shape.y * zoom,
    width: shape.w * zoom,
    height: shape.h * zoom,
    transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
    transformOrigin: 'top left',
  };

  return (
    <div ref={ref} className="text-overlay" style={style}>
      <EditorContent editor={editor} />
    </div>
  );
}
