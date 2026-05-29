import { describe, it, expect } from 'vitest';
import { parseGraphicFrameTable } from '../../../src/renderer/lib/pptx/parser/table';
import type { PptxTheme } from '../../../src/renderer/lib/pptx/parser/theme';
import { parseXml } from '../../../src/renderer/lib/pptx/parser/xml';

const theme: PptxTheme = {
  colors: new Map([['accent1', '5b9bd5']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri',
};

const TABLE_GF = `<p:graphicFrame xmlns:p="x" xmlns:a="y">
  <p:xfrm>
    <a:off x="914400" y="914400"/>
    <a:ext cx="9144000" cy="2286000"/>
  </p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
      <a:tbl>
        <a:tblGrid>
          <a:gridCol w="3048000"/>
          <a:gridCol w="3048000"/>
          <a:gridCol w="3048000"/>
        </a:tblGrid>
        <a:tr h="762000">
          <a:tc>
            <a:txBody>
              <a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="1400" b="1"/><a:t>H1</a:t></a:r></a:p>
            </a:txBody>
            <a:tcPr anchor="ctr"><a:solidFill><a:srgbClr val="DDDDDD"/></a:solidFill></a:tcPr>
          </a:tc>
          <a:tc>
            <a:txBody><a:p><a:r><a:t>H2</a:t></a:r></a:p></a:txBody>
          </a:tc>
          <a:tc>
            <a:txBody><a:p><a:r><a:t>H3</a:t></a:r></a:p></a:txBody>
          </a:tc>
        </a:tr>
        <a:tr h="762000">
          <a:tc>
            <a:txBody><a:p><a:r><a:t>A</a:t></a:r></a:p></a:txBody>
          </a:tc>
          <a:tc>
            <a:txBody><a:p><a:r><a:t>B</a:t></a:r></a:p></a:txBody>
          </a:tc>
          <a:tc>
            <a:txBody><a:p><a:r><a:t>C</a:t></a:r></a:p></a:txBody>
          </a:tc>
        </a:tr>
      </a:tbl>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>`;

describe('parseGraphicFrameTable', () => {
  it('2×3 таблица: размеры, доли, ячейки, стиль заголовка', () => {
    const gf = (parseXml(TABLE_GF) as { 'p:graphicFrame': unknown[] })['p:graphicFrame'][0];
    const shape = parseGraphicFrameTable(gf as never, theme);
    expect(shape).not.toBeNull();
    expect(shape!.type).toBe('table');
    expect(shape!.rows).toBe(2);
    expect(shape!.cols).toBe(3);
    expect(shape!.x).toBe(96);
    expect(shape!.w).toBe(960);
    expect(shape!.colFractions).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(shape!.rowFractions).toEqual([0.5, 0.5]);
    expect(shape!.cells[0][0].text).toBe('H1');
    expect(shape!.cells[0][0].bold).toBe(true);
    expect(shape!.cells[0][0].align).toBe('center');
    expect(shape!.cells[0][0].valign).toBe('middle');
    expect(shape!.cells[0][0].fill).toBe('#dddddd');
    expect(shape!.cells[1][2].text).toBe('C');
  });

  it('graphicData без uri таблицы → null', () => {
    const r = parseXml(`<p:graphicFrame xmlns:p="x" xmlns:a="y">
      <p:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></p:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"/></a:graphic>
    </p:graphicFrame>`) as { 'p:graphicFrame': unknown[] };
    expect(parseGraphicFrameTable(r['p:graphicFrame'][0] as never, theme)).toBeNull();
  });

  it('пустой tbl → null', () => {
    const r = parseXml(`<p:graphicFrame xmlns:p="x" xmlns:a="y">
      <p:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></p:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"></a:graphicData></a:graphic>
    </p:graphicFrame>`) as { 'p:graphicFrame': never };
    expect(parseGraphicFrameTable(r['p:graphicFrame'], theme)).toBeNull();
  });
});
