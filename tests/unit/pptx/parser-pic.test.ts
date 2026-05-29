import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';
import { parsePic, type PicContext } from '../../../src/renderer/lib/pptx/parser/pic';

beforeEach(() => {
  (globalThis as unknown as { window: { api: unknown } }).window = {
    api: {
      media: {
        save: vi.fn(async (_bytes: ArrayBuffer, ext: string) => {
          // Эмулируем MediaManager: возвращаем sha-подобное имя <hash>.<ext>.
          return `${'a'.repeat(64)}.${ext}`;
        }),
        exists: vi.fn(async () => true),
      },
    },
  };
});

describe('parsePic', () => {
  it('извлекает картинку и сохраняет через MediaManager', async () => {
    const zip = new JSZip();
    zip.file('ppt/media/image1.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47])); // PNG-magic
    const ar = await openPptxArchive(await zip.generateAsync({ type: 'arraybuffer' }));

    const ctx: PicContext = {
      archive: ar,
      slideRelsPath: 'ppt/slides/_rels/slide1.xml.rels',
      rels: new Map([
        ['rId1', { id: 'rId1', type: 'image', target: '../media/image1.png' }],
      ]),
    };
    const shape = await parsePic(
      {
        'p:blipFill': { 'a:blip': { '@_r:embed': 'rId1' } },
        'p:spPr': {
          'a:xfrm': {
            'a:off': { '@_x': '914400', '@_y': '914400' },
            'a:ext': { '@_cx': '1828800', '@_cy': '914400' },
          },
        },
      },
      ctx,
    );
    expect(shape).not.toBeNull();
    expect(shape!.type).toBe('image');
    expect(shape!.src.startsWith('app://media/')).toBe(true);
    expect(shape!.src.endsWith('.png')).toBe(true);
    expect(shape!.x).toBe(96);
    expect(shape!.w).toBe(192);
  });

  it('нет rId — null', async () => {
    const ar = await openPptxArchive(await new JSZip().generateAsync({ type: 'arraybuffer' }));
    const shape = await parsePic(
      { 'p:blipFill': {}, 'p:spPr': {} },
      { archive: ar, slideRelsPath: 'x', rels: new Map() },
    );
    expect(shape).toBeNull();
  });

  it('нет файла в zip — null', async () => {
    const ar = await openPptxArchive(await new JSZip().generateAsync({ type: 'arraybuffer' }));
    const shape = await parsePic(
      {
        'p:blipFill': { 'a:blip': { '@_r:embed': 'rId1' } },
        'p:spPr': {
          'a:xfrm': {
            'a:off': { '@_x': '0', '@_y': '0' },
            'a:ext': { '@_cx': '914400', '@_cy': '914400' },
          },
        },
      },
      {
        archive: ar,
        slideRelsPath: 'ppt/slides/_rels/slide1.xml.rels',
        rels: new Map([
          ['rId1', { id: 'rId1', type: 'image', target: '../media/missing.png' }],
        ]),
      },
    );
    expect(shape).toBeNull();
  });
});
