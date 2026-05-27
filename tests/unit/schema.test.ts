import { describe, it, expect } from 'vitest';
import {
  deckSchema,
  hyperlinkSchema,
  userGuideSchema,
  pageNumbersSchema,
  wordartShapeSchema,
  equationShapeSchema,
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

describe('wordart schema (Phase 3.21)', () => {
  const base = {
    id: 'w1',
    type: 'wordart',
    x: 0,
    y: 0,
    w: 200,
    h: 80,
    text: 'Hello',
    fontFamily: 'Montserrat',
    fontSize: 96,
  };

  it('accepts a wordart with fill+outline+font', () => {
    const res = wordartShapeSchema.safeParse({
      ...base,
      bold: true,
      fill: { kind: 'solid', color: '#1a73e8' },
      stroke: { color: '#0a2a66', width: 2 },
    });
    expect(res.success).toBe(true);
  });

  it('rejects non-positive fontSize', () => {
    expect(wordartShapeSchema.safeParse({ ...base, fontSize: 0 }).success).toBe(false);
  });
});

describe('equation schema (Phase 3.24)', () => {
  it('accepts an equation with latex', () => {
    const res = equationShapeSchema.safeParse({
      id: 'e1',
      type: 'equation',
      x: 0,
      y: 0,
      w: 160,
      h: 56,
      latex: '\\frac{a}{b}',
    });
    expect(res.success).toBe(true);
  });

  it('rejects equation without latex', () => {
    expect(
      equationShapeSchema.safeParse({ id: 'e1', type: 'equation', x: 0, y: 0, w: 1, h: 1 }).success,
    ).toBe(false);
  });
});
