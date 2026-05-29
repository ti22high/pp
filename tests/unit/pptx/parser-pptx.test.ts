import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { parsePptx } from '../../../src/renderer/lib/pptx/parser';

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

async function buildPptx(files: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [k, v] of Object.entries(files)) zip.file(k, v);
  return await zip.generateAsync({ type: 'arraybuffer' });
}

const PRES = `<?xml version="1.0"?>
<p:presentation xmlns:p="x" xmlns:r="y">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
    <p:sldId id="257" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`;

const PRES_RELS = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type=".../slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Type=".../slide" Target="slides/slide2.xml"/>
</Relationships>`;

const THEME = `<?xml version="1.0"?>
<a:theme xmlns:a="y">
  <a:themeElements>
    <a:clrScheme name="Office"><a:accent1><a:srgbClr val="5B9BD5"/></a:accent1></a:clrScheme>
    <a:fontScheme><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>
  </a:themeElements>
</a:theme>`;

const SLIDE1 = `<p:sld xmlns:p="x" xmlns:a="y" xmlns:r="z"><p:cSld><p:spTree>
  <p:sp>
    <p:spPr>
      <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
      <a:prstGeom prst="rect"/>
      <a:solidFill><a:schemeClr val="accent1"/></a:solidFill>
    </p:spPr>
    <p:txBody><a:p><a:r><a:t>Заголовок</a:t></a:r></a:p></p:txBody>
  </p:sp>
</p:spTree></p:cSld></p:sld>`;

const SLIDE2 = `<p:sld xmlns:p="x" xmlns:a="y" xmlns:r="z"><p:cSld><p:spTree>
  <p:sp>
    <p:spPr>
      <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
      <a:prstGeom prst="ellipse"/>
      <a:solidFill><a:srgbClr val="00FF00"/></a:solidFill>
    </p:spPr>
  </p:sp>
</p:spTree></p:cSld></p:sld>`;

describe('parsePptx', () => {
  it('собирает 2-слайдовую презентацию + резолвит schemeClr', async () => {
    const bytes = await buildPptx({
      'ppt/presentation.xml': PRES,
      'ppt/_rels/presentation.xml.rels': PRES_RELS,
      'ppt/theme/theme1.xml': THEME,
      'ppt/slides/slide1.xml': SLIDE1,
      'ppt/slides/slide2.xml': SLIDE2,
    });
    const progress: { current: number; total: number; message: string }[] = [];
    const res = await parsePptx(bytes, (p) => progress.push({ ...p }));
    expect(res.warnings).toEqual([]);
    expect(res.deck.slideOrder).toHaveLength(2);
    const s1 = res.deck.slides[res.deck.slideOrder[0]];
    expect(s1.shapes[0].type).toBe('rect');
    // accent1 = 5B9BD5 → должен резолвиться через тему.
    expect(s1.shapes[0].fill).toEqual({ kind: 'solid', color: '#5b9bd5' });
    const s2 = res.deck.slides[res.deck.slideOrder[1]];
    expect(s2.shapes[0].type).toBe('ellipse');
    // 960×720 в px из 9144000×6858000 EMU.
    expect(res.deck.size).toEqual({ w: 960, h: 720 });
    // прогресс был вызван
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1].message).toBe('Готово');
  });

  it('пустой sldIdLst → дек с одним default-слайдом', async () => {
    const PRES_EMPTY = `<?xml version="1.0"?><p:presentation xmlns:p="x" xmlns:r="y">
      <p:sldIdLst/><p:sldSz cx="9144000" cy="6858000"/>
    </p:presentation>`;
    const bytes = await buildPptx({
      'ppt/presentation.xml': PRES_EMPTY,
      'ppt/_rels/presentation.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    });
    const res = await parsePptx(bytes);
    expect(res.deck.slideOrder).toHaveLength(1); // fallback default slide
  });

  it('бросает на не-pptx', async () => {
    await expect(parsePptx(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow();
  });
});
