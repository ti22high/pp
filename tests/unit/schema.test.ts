import { describe, it, expect } from 'vitest';
import {
  deckSchema,
  hyperlinkSchema,
  userGuideSchema,
  pageNumbersSchema,
} from '../../src/renderer/lib/model/schema';
import { createEmptyDeck } from '../../src/renderer/lib/model/factory';

describe('deck schema with phase-2 fields', () => {
  it('parses a deck with guides and pageNumbers', () => {
    const deck = createEmptyDeck();
    deck.guides = [{ id: 'g1', kind: 'v', pos: 960 }];
    deck.pageNumbers = { enabled: true, skipFirst: true };
    const res = deckSchema.safeParse(deck);
    expect(res.success).toBe(true);
  });

  it('rejects a guide with invalid kind', () => {
    const res = userGuideSchema.safeParse({ id: 'x', kind: 'diagonal', pos: 5 });
    expect(res.success).toBe(false);
  });

  it('pageNumbers requires both flags', () => {
    expect(pageNumbersSchema.safeParse({ enabled: true }).success).toBe(false);
    expect(
      pageNumbersSchema.safeParse({ enabled: true, skipFirst: false }).success,
    ).toBe(true);
  });
});

describe('hyperlink schema', () => {
  it('accepts slide and slide-rel links', () => {
    expect(hyperlinkSchema.safeParse({ kind: 'slide', slideId: 's1' }).success).toBe(true);
    expect(
      hyperlinkSchema.safeParse({ kind: 'slide-rel', rel: 'next' }).success,
    ).toBe(true);
  });

  it('rejects an unknown rel target', () => {
    expect(
      hyperlinkSchema.safeParse({ kind: 'slide-rel', rel: 'sideways' }).success,
    ).toBe(false);
  });

  it('rejects a malformed url link', () => {
    expect(hyperlinkSchema.safeParse({ kind: 'url', url: 'not a url' }).success).toBe(false);
  });
});
