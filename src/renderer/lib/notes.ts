// Заметки докладчика (Phase 3.23): slide.notes — строка с сериализованным
// TipTap JSON (SPEC §5.2). Здесь — конвертация строки в TipTap-контент с
// поддержкой пустого значения и legacy-простого текста.

export function emptyNotesDoc(): object {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

export function parseNotesContent(notes: string | undefined | null): object {
  if (!notes) return emptyNotesDoc();
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'doc') {
      return parsed as object;
    }
  } catch {
    // не JSON — трактуем как обычный текст (legacy-заметки)
  }
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: notes }] }] };
}
