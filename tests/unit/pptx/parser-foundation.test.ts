import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseXml, asArray } from '../../../src/renderer/lib/pptx/parser/xml';
import { emuToPx, pxToEmu, sizeToPt, rotToDeg } from '../../../src/renderer/lib/pptx/parser/emu';
import { parseRels, resolveRelTarget } from '../../../src/renderer/lib/pptx/parser/rels';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';

describe('xml.parseXml + asArray', () => {
  it('isArray callback: один <p:sp> → массив', () => {
    const r = parseXml(`<root><p:sp id="1"/></root>`) as { root: { 'p:sp': unknown[] } };
    expect(Array.isArray(r.root['p:sp'])).toBe(true);
    expect(r.root['p:sp']).toHaveLength(1);
  });
  it('isArray callback: несколько <p:sp> → массив', () => {
    const r = parseXml(`<root><p:sp id="1"/><p:sp id="2"/></root>`) as {
      root: { 'p:sp': unknown[] };
    };
    expect(r.root['p:sp']).toHaveLength(2);
  });
  it('сохраняет неймспейс-префиксы p: и a:', () => {
    const r = parseXml(`<root><p:sp><a:p/></p:sp></root>`) as {
      root: { 'p:sp': Array<{ 'a:p': unknown[] }> };
    };
    expect(r.root['p:sp'][0]['a:p']).toBeDefined();
  });
  it('атрибуты с префиксом @_', () => {
    const r = parseXml(`<root><x val="42"/></root>`) as { root: { x: { '@_val': string } } };
    expect(r.root.x['@_val']).toBe('42');
  });
  it('обрабатывает entities в тексте', () => {
    const r = parseXml(`<root><t>A &amp; B</t></root>`) as { root: { t: string } };
    expect(r.root.t).toBe('A & B');
  });
  it('asArray: undefined/null → пустой; одно → массив; массив → как есть', () => {
    expect(asArray(undefined)).toEqual([]);
    expect(asArray(null)).toEqual([]);
    expect(asArray(7)).toEqual([7]);
    expect(asArray([1, 2])).toEqual([1, 2]);
  });
});

describe('emu', () => {
  it('emuToPx: 914400 EMU = 96 px (1 дюйм при 96 DPI)', () => {
    expect(emuToPx(914400)).toBe(96);
    expect(emuToPx('914400')).toBe(96);
    expect(emuToPx(0)).toBe(0);
    expect(emuToPx(undefined)).toBe(0);
    expect(emuToPx('')).toBe(0);
  });
  it('pxToEmu: round-trip 96 px → 914400 EMU', () => {
    expect(pxToEmu(96)).toBe(914400);
  });
  it('sizeToPt: 2400 → 24pt, 1200 → 12pt; bad → 12pt дефолт', () => {
    expect(sizeToPt(2400)).toBe(24);
    expect(sizeToPt('1200')).toBe(12);
    expect(sizeToPt(undefined)).toBe(12);
    expect(sizeToPt('garbage')).toBe(12);
    expect(sizeToPt(-100)).toBe(12);
  });
  it('rotToDeg: 5400000 → 90°', () => {
    expect(rotToDeg(5400000)).toBe(90);
    expect(rotToDeg('10800000')).toBe(180);
    expect(rotToDeg(undefined)).toBe(0);
  });
});

describe('rels.parseRels + resolveRelTarget', () => {
  it('парсит Relationship-ы в Map', () => {
    const xml = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
    </Relationships>`;
    const m = parseRels(xml);
    expect(m.size).toBe(2);
    expect(m.get('rId1')?.target).toBe('../media/image1.png');
    expect(m.get('rId2')?.type).toContain('slideLayout');
  });
  it('resolveRelTarget: разрешает ".."', () => {
    expect(resolveRelTarget('ppt/slides/_rels/slide1.xml.rels', '../media/image1.png')).toBe(
      'ppt/media/image1.png',
    );
    expect(resolveRelTarget('ppt/slides/_rels/slide1.xml.rels', '../slideLayouts/slideLayout1.xml')).toBe(
      'ppt/slideLayouts/slideLayout1.xml',
    );
    expect(resolveRelTarget('ppt/_rels/presentation.xml.rels', 'slides/slide1.xml')).toBe(
      'ppt/slides/slide1.xml',
    );
  });
});

describe('zip.openPptxArchive', () => {
  it('загружает zip, has/getText/getBytes/fileNames', async () => {
    const zip = new JSZip();
    zip.file('a.xml', '<root/>');
    zip.file('media/img.png', new Uint8Array([1, 2, 3, 4]));
    const buf = await zip.generateAsync({ type: 'arraybuffer' });
    const ar = await openPptxArchive(buf);
    expect(ar.has('a.xml')).toBe(true);
    expect(ar.has('missing.xml')).toBe(false);
    expect(await ar.getText('a.xml')).toBe('<root/>');
    expect(await ar.getText('missing.xml')).toBeNull();
    const bytes = await ar.getBytes('media/img.png');
    expect(bytes).not.toBeNull();
    expect(new Uint8Array(bytes!)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(ar.fileNames()).toEqual(expect.arrayContaining(['a.xml', 'media/img.png']));
  });
  it('бросает на кривом zip', async () => {
    await expect(openPptxArchive(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow();
  });
});
