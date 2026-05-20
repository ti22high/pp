import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

// Ссылка на активный TipTap-editor (текущий открытый TextOverlay).
// Нужна, чтобы SpecialCharsDialog мог вставить символ в позицию курсора
// редактируемого текста. Регистрируется при маунте TextOverlay, снимается
// при анмаунте. Отдельный стор — чтобы изменение editor-ссылки не дёргало
// рендер дека/канваса.

interface ActiveEditorState {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
}

export const useActiveEditorStore = create<ActiveEditorState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
