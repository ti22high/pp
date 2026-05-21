import { useEffect, useRef, type CSSProperties } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { tiptapExtensions } from '@renderer/lib/editor/extensions';
import type { Shape } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useActiveEditorStore } from '@renderer/stores/activeEditor';

interface TextOverlayProps {
  slideId: string;
  // Любая фигура: для TextShape пишем в tiptapDoc, для остальных — в text.
  shape: Shape;
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

  const initialContent =
    (shape.type === 'text' ? shape.tiptapDoc : (shape.text as object | undefined)) ??
    emptyDoc();

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: initialContent as object,
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
      if (!sh) return;
      if (sh.type === 'text') {
        sh.tiptapDoc = json;
      } else {
        sh.text = json;
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

  // Регистрируем активный editor в сторе — SpecialCharsDialog вставляет
  // символы в его текущую позицию курсора.
  useEffect(() => {
    if (!editor) return;
    useActiveEditorStore.getState().setEditor(editor);
    return () => {
      // Снимаем только если это всё ещё наш editor (защита от гонки маунтов).
      if (useActiveEditorStore.getState().editor === editor) {
        useActiveEditorStore.getState().setEditor(null);
      }
    };
  }, [editor]);

  // Клик вне оверлея — закрыть. Исключение — элементы с [data-keep-editing]
  // (например модалка спецсимволов): клик по ним не должен коммитить текст,
  // иначе editor размонтируется и вставлять символ будет некуда.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-keep-editing]')) return;
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
    // Шрифт и padding масштабируем под zoom, чтобы оверлей при редактировании
    // выглядел один-в-один как Konva.Text после blur-а. Без этого редактирование
    // показывает 20px, а после blur Konva рендерит 20px * zoom — визуально
    // «прыгает». Базовый размер 20 px согласован с TextShapeView.
    fontSize: `${20 * zoom}px`,
    // Межстрочный интервал блока (для TextShape) — WYSIWYG с Konva-рендером.
    lineHeight: shape.type === 'text' ? (shape.lineHeight ?? 1.2) : undefined,
  };

  return (
    <div ref={ref} className="text-overlay" style={style}>
      <EditorContent editor={editor} />
    </div>
  );
}

function emptyDoc(): object {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}
