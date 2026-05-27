import { describe, it, expect } from 'vitest';
import { parseNotesContent, emptyNotesDoc } from '../../src/renderer/lib/notes';

describe('parseNotesContent', () => {
  it('пусто/undefined → пустой doc', () => {
    expect(parseNotesContent(undefined)).toEqual(emptyNotesDoc());
    expect(parseNotesContent('')).toEqual(emptyNotesDoc());
  });

  it('валидный TipTap JSON → как есть', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'привет' }] }] };
    expect(parseNotesContent(JSON.stringify(doc))).toEqual(doc);
  });

  it('legacy-простой текст → оборачивается в параграф', () => {
    const res = parseNotesContent('просто заметка') as {
      type: string;
      content: Array<{ type: string; content: Array<{ text: string }> }>;
    };
    expect(res.type).toBe('doc');
    expect(res.content[0].content[0].text).toBe('просто заметка');
  });
});
