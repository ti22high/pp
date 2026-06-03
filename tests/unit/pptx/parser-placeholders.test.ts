import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';
import { parseSlide } from '../../../src/renderer/lib/pptx/parser/slide';
import {
  parsePlaceholdersXml,
  lookupPlaceholderXfrm,
  mergePlaceholders,
} from '../../../src/renderer/lib/pptx/parser/placeholders';
import type { PptxTheme } from '../../../src/renderer/lib/pptx/parser/theme';

beforeEach(() => {
  (globalThis as unknown as { window: { api: unknown } }).window = {
    api: {
      media: {
        save: vi.fn(async (_b: ArrayBuffer, ext: string) => `${'a'.repeat(64)}.${ext}`),
        exists: vi.fn(async () => true),
      },
    },
  };
});

const theme: PptxTheme = {
  colors: new Map(),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

const LAYOUT_XML = `<p:sldLayout xmlns:p="x" xmlns:a="y">
  <p:cSld><p:spTree>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="457200" y="274320"/><a:ext cx="8229600" cy="1143000"/></a:xfrm>
      </p:spPr>
    </p:sp>
    <p:sp>
      <p:nvSpPr><p:cNvPr id="3" name="Body 1"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="4525963"/></a:xfrm>
      </p:spPr>
    </p:sp>
  </p:spTree></p:cSld>
</p:sldLayout>`;

describe('parsePlaceholdersXml', () => {
  it('собирает title и body с разными ключами', () => {
    const map = parsePlaceholdersXml(LAYOUT_XML);
    expect(lookupPlaceholderXfrm(map, 'title', undefined)).toBeDefined();
    expect(lookupPlaceholderXfrm(map, 'body', '1')).toBeDefined();
    // По одному только idx — тоже должен найтись.
    expect(lookupPlaceholderXfrm(map, undefined, '1')).toBeDefined();
  });

  it('пустой xml → пустая карта', () => {
    expect(parsePlaceholdersXml(null).size).toBe(0);
    expect(parsePlaceholdersXml('').size).toBe(0);
  });

  it('mergePlaceholders: override перебивает base', () => {
    const base = parsePlaceholdersXml(LAYOUT_XML);
    const override = new Map(base);
    const merged = mergePlaceholders(base, override);
    expect(merged.size).toBe(base.size);
  });
});

describe('parseSlide с inherited xfrm', () => {
  it('placeholder без своего xfrm берёт размеры из slideLayout', async () => {
    // Слайд с placeholder-ом title и body — у обоих <p:spPr/> пустой.
    const SLIDE = `<p:sld xmlns:p="x" xmlns:a="y" xmlns:r="z"><p:cSld><p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:p><a:r><a:t>Заголовок</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:p><a:r><a:t>Тело</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree></p:cSld></p:sld>`;
    const SLIDE_RELS = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
    </Relationships>`;
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', SLIDE);
    zip.file('ppt/slides/_rels/slide1.xml.rels', SLIDE_RELS);
    zip.file('ppt/slideLayouts/slideLayout1.xml', LAYOUT_XML);
    const ar = await openPptxArchive(await zip.generateAsync({ type: 'arraybuffer' }));
    const slide = await parseSlide('ppt/slides/slide1.xml', { archive: ar, theme });
    expect(slide.shapes).toHaveLength(2);
    // Title: 457200 EMU = 48 px (x), 274320 = 28.8 → 28.8 px (y), 8229600 = 864 px (w).
    expect(slide.shapes[0].x).toBe(48);
    expect(slide.shapes[0].w).toBe(864);
    // Body.
    expect(slide.shapes[1].x).toBe(48);
    expect(slide.shapes[1].y).toBeCloseTo(168.0, 1);
  });

  it('без layout: placeholder без xfrm всё ещё выбрасывается (legacy поведение)', async () => {
    const SLIDE = `<p:sld xmlns:p="x" xmlns:a="y"><p:cSld><p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:p><a:r><a:t>X</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree></p:cSld></p:sld>`;
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', SLIDE);
    const ar = await openPptxArchive(await zip.generateAsync({ type: 'arraybuffer' }));
    const slide = await parseSlide('ppt/slides/slide1.xml', { archive: ar, theme });
    // Без layout-fallback нечего наследовать → фигура без xfrm выбрасывается.
    expect(slide.shapes).toHaveLength(0);
  });
});
