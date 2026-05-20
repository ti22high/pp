import { describe, it, expect } from 'vitest';
import { createEmptyDeck, createRect, createText, cloneSlide, createImage, createChart } from '../../src/renderer/lib/model/factory';
import { deckSchema, imageShapeSchema, chartShapeSchema } from '../../src/renderer/lib/model/schema';

describe('model factory', () => {
  it('creates an empty deck that validates against zod schema', () => {
    const deck = createEmptyDeck();
    const result = deckSchema.safeParse(deck);
    expect(result.success).toBe(true);
    expect(deck.slideOrder).toHaveLength(1);
  });

  it('rect factory produces valid shape', () => {
    const r = createRect();
    expect(r.type).toBe('rect');
    expect(r.w).toBeGreaterThan(0);
    expect(r.h).toBeGreaterThan(0);
  });

  it('text factory produces valid tiptap doc', () => {
    const t = createText(0, 0, 100, 50, 'Hello');
    expect(t.type).toBe('text');
    // tiptapDoc — корневой узел prosemirror, тип doc.
    expect((t.tiptapDoc as { type: string }).type).toBe('doc');
  });

  it('image factory produces a valid image shape', () => {
    const img = createImage(10, 20, 300, 200, 'data:image/png;base64,AAAA', 600, 400);
    expect(img.type).toBe('image');
    expect(imageShapeSchema.safeParse(img).success).toBe(true);
    expect(img.naturalW).toBe(600);
  });

  it('chart factory produces a valid chart shape', () => {
    const ch = createChart(0, 0, 640, 400);
    expect(ch.type).toBe('chart');
    expect(chartShapeSchema.safeParse(ch).success).toBe(true);
    expect(ch.series.length).toBeGreaterThan(0);
    expect(ch.series[0].data.length).toBe(ch.categories.length);
  });

  it('cloneSlide makes fresh ids', () => {
    const deck = createEmptyDeck();
    const first = deck.slides[deck.slideOrder[0]];
    expect(first).toBeDefined();
    const dup = cloneSlide(first!);
    expect(dup.id).not.toBe(first!.id);
  });
});
