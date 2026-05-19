import { useEffect } from 'react';
import { initHistory, undo, redo } from '@renderer/lib/undo';

// Cmd/Ctrl+Z — undo, Cmd/Ctrl+Shift+Z или Cmd/Ctrl+Y — redo.
// Игнорирует события из text-input / contenteditable, чтобы не конфликтовать
// с нативным undo текста в Inspector и TipTap.
function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return target.isContentEditable;
}

export function useUndoRedo(): void {
  useEffect(() => {
    initHistory();
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (isInTextField(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
