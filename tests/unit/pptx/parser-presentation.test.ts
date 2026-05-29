import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';
import { parsePresentation } from '../../../src/renderer/lib/pptx/parser/presentation';

async function buildArchive(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const buf = await zip.generateAsync({ type: 'arraybuffer' });
  return await openPptxArchive(buf);
}

const RELS = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type=".../slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type=".../slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type=".../slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId4" Type=".../slide" Target="slides/slide3.xml"/>
</Relationships>`;

describe('parsePresentation', () => {
  it('читает размер 16:9 + порядок слайдов через .rels', async () => {
    const PRES = `<?xml version="1.0"?><p:presentation xmlns:p="x" xmlns:r="y">
      <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
      <p:sldIdLst>
        <p:sldId id="256" r:id="rId2"/>
        <p:sldId id="257" r:id="rId3"/>
        <p:sldId id="258" r:id="rId4"/>
      </p:sldIdLst>
      <p:sldSz cx="12192000" cy="6858000"/>
    </p:presentation>`;
    const zip = await buildArchive({
      'ppt/presentation.xml': PRES,
      'ppt/_rels/presentation.xml.rels': RELS,
    });
    const info = await parsePresentation(zip);
    expect(info.size.w).toBe(1280); // 12192000 / 9525
    expect(info.size.h).toBe(720);
    expect(info.slidePaths).toEqual([
      'ppt/slides/slide1.xml',
      'ppt/slides/slide2.xml',
      'ppt/slides/slide3.xml',
    ]);
    expect(info.slideMasterPaths).toEqual(['ppt/slideMasters/slideMaster1.xml']);
  });

  it('одиночный слайд (isArray fix) — один p:sldId', async () => {
    const PRES = `<?xml version="1.0"?><p:presentation xmlns:p="x" xmlns:r="y">
      <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
      <p:sldSz cx="9144000" cy="6858000"/>
    </p:presentation>`;
    const zip = await buildArchive({
      'ppt/presentation.xml': PRES,
      'ppt/_rels/presentation.xml.rels': RELS,
    });
    const info = await parsePresentation(zip);
    expect(info.slidePaths).toHaveLength(1);
    expect(info.slidePaths[0]).toBe('ppt/slides/slide1.xml');
  });

  it('без p:sldSz → дефолт 4:3 960×720', async () => {
    const PRES = `<?xml version="1.0"?><p:presentation xmlns:p="x" xmlns:r="y">
      <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
    </p:presentation>`;
    const zip = await buildArchive({
      'ppt/presentation.xml': PRES,
      'ppt/_rels/presentation.xml.rels': RELS,
    });
    const info = await parsePresentation(zip);
    // 9144000 EMU = 960 px при 96 DPI; 6858000 = 720 px.
    expect(info.size.w).toBe(960);
    expect(info.size.h).toBe(720);
  });

  it('бросает на отсутствие presentation.xml', async () => {
    const zip = await buildArchive({ 'random.xml': '<x/>' });
    await expect(parsePresentation(zip)).rejects.toThrow();
  });
});
