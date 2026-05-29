import { describe, it, expect } from 'vitest';
import { parseTxBody, plainTextFromTxBody } from '../../../src/renderer/lib/pptx/parser/text';
import type { PptxTheme } from '../../../src/renderer/lib/pptx/parser/theme';
import { parseXml } from '../../../src/renderer/lib/pptx/parser/xml';

const theme: PptxTheme = {
  colors: new Map([['accent1', '5b9bd5']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

function parse(xml: string) {
  const r = parseXml(xml) as { 'p:txBody'?: unknown };
  return r['p:txBody'];
}

describe('parseTxBody', () => {
  it('пустой txBody → один пустой параграф', () => {
    const doc = parseTxBody(undefined, theme);
    expect(doc.type).toBe('doc');
    expect(doc.content).toEqual([{ type: 'paragraph' }]);
  });

  it('простой текст в одном run', () => {
    const tx = parse(
      `<p:txBody xmlns:p="x" xmlns:a="y">
        <a:p><a:r><a:t>Hello</a:t></a:r></a:p>
      </p:txBody>`,
    );
    const doc = parseTxBody(tx as never, theme);
    expect(doc.content[0].content?.[0].text).toBe('Hello');
  });

  it('жирный + курсив + размер + шрифт + цвет → marks', () => {
    const tx = parse(
      `<p:txBody xmlns:p="x" xmlns:a="y">
        <a:p>
          <a:r>
            <a:rPr sz="2400" b="1" i="1">
              <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
              <a:latin typeface="Arial"/>
            </a:rPr>
            <a:t>Big</a:t>
          </a:r>
        </a:p>
      </p:txBody>`,
    );
    const doc = parseTxBody(tx as never, theme);
    const node = doc.content[0].content?.[0];
    expect(node?.text).toBe('Big');
    const marks = node?.marks ?? [];
    expect(marks.some((m) => m.type === 'bold')).toBe(true);
    expect(marks.some((m) => m.type === 'italic')).toBe(true);
    const ts = marks.find((m) => m.type === 'textStyle');
    expect(ts?.attrs?.fontFamily).toBe('Arial');
    expect(ts?.attrs?.fontSize).toBe('24pt');
    expect(ts?.attrs?.color).toBe('#ff0000');
  });

  it('schemeClr резолвится через тему', () => {
    const tx = parse(
      `<p:txBody xmlns:p="x" xmlns:a="y">
        <a:p><a:r>
          <a:rPr><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:rPr>
          <a:t>X</a:t>
        </a:r></a:p>
      </p:txBody>`,
    );
    const doc = parseTxBody(tx as never, theme);
    const ts = doc.content[0].content?.[0].marks?.find((m) => m.type === 'textStyle');
    expect(ts?.attrs?.color).toBe('#5b9bd5');
  });

  it('algn=ctr → textAlign=center на параграфе', () => {
    const tx = parse(
      `<p:txBody xmlns:p="x" xmlns:a="y">
        <a:p><a:pPr algn="ctr"/><a:r><a:t>C</a:t></a:r></a:p>
      </p:txBody>`,
    );
    const doc = parseTxBody(tx as never, theme);
    expect(doc.content[0].attrs?.textAlign).toBe('center');
  });

  it('несколько параграфов', () => {
    const tx = parse(
      `<p:txBody xmlns:p="x" xmlns:a="y">
        <a:p><a:r><a:t>A</a:t></a:r></a:p>
        <a:p><a:r><a:t>B</a:t></a:r></a:p>
      </p:txBody>`,
    );
    const doc = parseTxBody(tx as never, theme);
    expect(doc.content).toHaveLength(2);
    expect(doc.content[0].content?.[0].text).toBe('A');
    expect(doc.content[1].content?.[0].text).toBe('B');
  });

  it('plainTextFromTxBody конкатенирует runs и абзацы через \\n', () => {
    const tx = parse(
      `<p:txBody xmlns:p="x" xmlns:a="y">
        <a:p><a:r><a:t>Hello</a:t></a:r><a:r><a:t> world</a:t></a:r></a:p>
        <a:p><a:r><a:t>line2</a:t></a:r></a:p>
      </p:txBody>`,
    );
    expect(plainTextFromTxBody(tx as never)).toBe('Hello world\nline2');
  });
});
