import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { openPptxArchive } from '../../../src/renderer/lib/pptx/parser/zip';
import { parseGraphicFrameChart } from '../../../src/renderer/lib/pptx/parser/chart';
import { parseXml } from '../../../src/renderer/lib/pptx/parser/xml';

const GF = `<p:graphicFrame xmlns:p="x" xmlns:a="y" xmlns:r="z">
  <p:xfrm>
    <a:off x="914400" y="914400"/>
    <a:ext cx="4572000" cy="3429000"/>
  </p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart xmlns:c="cc" r:id="rId1"/>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>`;

// Минимальный chartSpace: bar/column с 2 категориями и 1 серией.
const CHART_XML = `<?xml version="1.0"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <c:chart>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:ser>
          <c:tx><c:strRef><c:strCache>
            <c:pt idx="0"><c:v>Продажи</c:v></c:pt>
          </c:strCache></c:strRef></c:tx>
          <c:cat><c:strRef><c:strCache>
            <c:pt idx="0"><c:v>Q1</c:v></c:pt>
            <c:pt idx="1"><c:v>Q2</c:v></c:pt>
          </c:strCache></c:strRef></c:cat>
          <c:val><c:numRef><c:numCache>
            <c:pt idx="0"><c:v>100</c:v></c:pt>
            <c:pt idx="1"><c:v>200</c:v></c:pt>
          </c:numCache></c:numRef></c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`;

describe('parseGraphicFrameChart', () => {
  it('читает chart через rId → ChartShape', async () => {
    const zip = new JSZip();
    zip.file('ppt/charts/chart1.xml', CHART_XML);
    const ar = await openPptxArchive(await zip.generateAsync({ type: 'arraybuffer' }));

    const gf = (parseXml(GF) as { 'p:graphicFrame': unknown[] })['p:graphicFrame'][0];
    const shape = await parseGraphicFrameChart(gf as never, {
      archive: ar,
      slideRelsPath: 'ppt/slides/_rels/slide1.xml.rels',
      rels: new Map([
        ['rId1', { id: 'rId1', type: 'chart', target: '../charts/chart1.xml' }],
      ]),
    });
    expect(shape).not.toBeNull();
    expect(shape!.type).toBe('chart');
    expect(shape!.chartType).toBe('column');
    expect(shape!.categories).toEqual(['Q1', 'Q2']);
    expect(shape!.series).toHaveLength(1);
    expect(shape!.series[0].name).toBe('Продажи');
    expect(shape!.series[0].data).toEqual([100, 200]);
    expect(shape!.x).toBe(96);
    expect(shape!.w).toBe(480);
  });

  it('таблица uri → null (не наш graphic-тип)', async () => {
    const ar = await openPptxArchive(await new JSZip().generateAsync({ type: 'arraybuffer' }));
    const xml = `<p:graphicFrame xmlns:p="x" xmlns:a="y">
      <p:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></p:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"/></a:graphic>
    </p:graphicFrame>`;
    const gf = (parseXml(xml) as { 'p:graphicFrame': unknown[] })['p:graphicFrame'][0];
    expect(
      await parseGraphicFrameChart(gf as never, {
        archive: ar,
        slideRelsPath: 'x',
        rels: new Map(),
      }),
    ).toBeNull();
  });
});
