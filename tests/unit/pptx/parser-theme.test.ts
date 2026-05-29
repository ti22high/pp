import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';
import { parseTheme, resolveSchemeColor } from '../../../src/renderer/lib/pptx/parser/theme';

async function buildArchive(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return await openPptxArchive(await zip.generateAsync({ type: 'arraybuffer' }));
}

const FULL_THEME = `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="5B9BD5"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`;

describe('parseTheme', () => {
  it('извлекает clrScheme + fontScheme', async () => {
    const zip = await buildArchive({ 'ppt/theme/theme1.xml': FULL_THEME });
    const t = await parseTheme(zip, 'ppt/theme/theme1.xml');
    expect(t.colors.get('accent1')).toBe('5b9bd5');
    expect(t.colors.get('accent2')).toBe('ed7d31');
    // dk1/lt1 — через sysClr lastClr.
    expect(t.colors.get('dk1')).toBe('000000');
    expect(t.colors.get('lt1')).toBe('ffffff');
    // dk1/lt1 алиасятся в tx1/bg1.
    expect(t.colors.get('tx1')).toBe('000000');
    expect(t.colors.get('bg1')).toBe('ffffff');
    expect(t.colors.get('hlink')).toBe('0563c1');
    expect(t.majorFont).toBe('Calibri Light');
    expect(t.minorFont).toBe('Calibri');
  });

  it('отсутствие theme-файла → fallback (пустая палитра + дефолтные шрифты)', async () => {
    const zip = await buildArchive({ 'random.xml': '<x/>' });
    const t = await parseTheme(zip, 'ppt/theme/theme1.xml');
    expect(t.colors.size).toBe(0);
    expect(t.majorFont).toBe('Calibri Light');
    expect(t.minorFont).toBe('Calibri');
  });

  it('resolveSchemeColor: знаемые → hex, незнаемые → 000000', async () => {
    const zip = await buildArchive({ 'ppt/theme/theme1.xml': FULL_THEME });
    const t = await parseTheme(zip, 'ppt/theme/theme1.xml');
    expect(resolveSchemeColor(t, 'accent1')).toBe('5b9bd5');
    expect(resolveSchemeColor(t, 'tx1')).toBe('000000'); // sysClr lastClr
    expect(resolveSchemeColor(t, 'unknown')).toBe('000000');
  });
});
