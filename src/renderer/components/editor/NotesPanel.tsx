import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { tiptapExtensions } from '@renderer/lib/editor/extensions';
import { useUiStore } from '@renderer/stores/ui';
import { useDeckStore } from '@renderer/stores/deck';
import { setSlideNotes } from '@renderer/lib/slides';
import { parseNotesContent } from '@renderer/lib/notes';

// Панель заметок докладчика снизу (Phase 3.23). TipTap-редактор правит
// slide.notes активного слайда; notes хранится строкой = сериализованный
// TipTap JSON (SPEC §5.2). Сворачивается в тонкую полоску (showNotes).
// Сами заметки показываются в Presenter View (Phase 6).

export function NotesPanel() {
  const showNotes = useUiStore((s) => s.showNotes);
  const toggleNotes = useUiStore((s) => s.toggleNotes);
  const activeSlideId = useUiStore((s) => s.activeSlideId);

  // Ref на активный слайд для onUpdate (замыкание useEditor видит старое значение).
  const slideIdRef = useRef<string | null>(activeSlideId);
  slideIdRef.current = activeSlideId;

  const editor = useEditor({
    extensions: tiptapExtensions,
    content: parseNotesContent(
      activeSlideId ? useDeckStore.getState().deck?.slides[activeSlideId]?.notes : undefined,
    ),
    editorProps: { attributes: { class: 'notes-panel__pm' } },
    onUpdate: ({ editor }) => {
      const id = slideIdRef.current;
      if (id) setSlideNotes(id, JSON.stringify(editor.getJSON()));
    },
  });

  // Смена активного слайда → подгружаем его заметки (без onUpdate, чтобы не
  // перезаписать чужой слайд).
  useEffect(() => {
    if (!editor || !activeSlideId) return;
    const notes = useDeckStore.getState().deck?.slides[activeSlideId]?.notes;
    editor.commands.setContent(parseNotesContent(notes), { emitUpdate: false });
  }, [editor, activeSlideId]);

  if (!showNotes) {
    return (
      <div className="app-notes app-notes--collapsed">
        <button
          type="button"
          className="notes-panel__toggle"
          title="Показать заметки докладчика"
          onClick={toggleNotes}
        >
          ▴ Заметки
        </button>
      </div>
    );
  }

  return (
    <div className="app-notes">
      <div className="notes-panel__head">
        <span className="panel-title">Заметки докладчика</span>
        <button
          type="button"
          className="notes-panel__toggle"
          title="Свернуть заметки"
          onClick={toggleNotes}
        >
          ▾
        </button>
      </div>
      {activeSlideId ? (
        <EditorContent editor={editor} className="notes-panel__body" />
      ) : (
        <p className="meta">Нет активного слайда.</p>
      )}
    </div>
  );
}
