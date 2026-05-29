import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';
import { parseSlide } from '../../../src/renderer/lib/pptx/parser/slide';
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
  colors: new Map([['accent1', '5b9bd5']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

async function archive(files: Record<string, string | Uint8Array>) {
  const zip = new JSZip();
  for (const [k, v] of Object.entries(files)) zip.file(k, v);
  return await openPptxArchive(await zip.generateAsync({ type: 'arraybuffer' }));
}

describe('parseSlide', () => {
  it('собирает rect + ellipse + текст + bg', async () => {
    const SLIDE = `<p:sld xmlns:p="x" xmlns:a="y" xmlns:r="z">
      <p:cSld>
        <p:bg><p:bgPr><a:solidFill><a:srgbClr val="EEEEEE"/></a:solidFill></p:bgPr></p:bg>
        <p:spTree>
          <p:sp>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
              <a:prstGeom prst="rect"/>
              <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
            </p:spPr>
          </p:sp>
          <p:sp>
            <p:spPr>
              <a:xfrm><a:off x="914400" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
              <a:prstGeom prst="ellipse"/>
              <a:solidFill><a:srgbClr val="00FF00"/></a:solidFill>
            </p:spPr>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`;
    const ar = await archive({ 'ppt/slides/slide1.xml': SLIDE });
    const slide = await parseSlide('ppt/slides/slide1.xml', { archive: ar, theme });
    expect(slide.shapes).toHaveLength(2);
    expect(slide.shapes[0].type).toBe('rect');
    expect(slide.shapes[1].type).toBe('ellipse');
    expect(slide.background?.type).toBe('color');
  });

  it('разворачивает вложенные p:grpSp плоско', async () => {
    const SLIDE = `<p:sld xmlns:p="x" xmlns:a="y" xmlns:r="z">
      <p:cSld><p:spTree>
        <p:grpSp>
          <p:sp>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
              <a:prstGeom prst="rect"/>
              <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
            </p:spPr>
          </p:sp>
          <p:grpSp>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
                <a:prstGeom prst="ellipse"/>
                <a:solidFill><a:srgbClr val="0000FF"/></a:solidFill>
              </p:spPr>
            </p:sp>
          </p:grpSp>
        </p:grpSp>
      </p:spTree></p:cSld>
    </p:sld>`;
    const ar = await archive({ 'ppt/slides/slide1.xml': SLIDE });
    const slide = await parseSlide('ppt/slides/slide1.xml', { archive: ar, theme });
    expect(slide.shapes).toHaveLength(2);
    expect(slide.shapes.map((s) => s.type)).toEqual(['rect', 'ellipse']);
  });

  it('сбой в одной фигуре не теряет весь слайд', async () => {
    const SLIDE = `<p:sld xmlns:p="x" xmlns:a="y" xmlns:r="z">
      <p:cSld><p:spTree>
        <p:sp>
          <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm></p:spPr>
        </p:sp>
        <p:sp>
          <p:spPr>
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
            <a:prstGeom prst="rect"/>
            <a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill>
          </p:spPr>
        </p:sp>
      </p:spTree></p:cSld>
    </p:sld>`;
    const ar = await archive({ 'ppt/slides/slide1.xml': SLIDE });
    const slide = await parseSlide('ppt/slides/slide1.xml', { archive: ar, theme });
    expect(slide.shapes).toHaveLength(1); // нулевая фигура отброшена, остальные на месте
    expect(slide.shapes[0].type).toBe('rect');
  });

  it('отсутствие slideN.xml → пустой слайд (не throw)', async () => {
    const ar = await archive({ 'other.xml': '<x/>' });
    const slide = await parseSlide('ppt/slides/slide1.xml', { archive: ar, theme });
    expect(slide.shapes).toEqual([]);
  });
});
