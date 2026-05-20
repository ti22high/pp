import { describe, it, expect } from 'vitest';
import { parseChartXml } from '../../src/renderer/lib/xlsxCharts';

const barChart = `<?xml version="1.0"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
 <c:chart><c:plotArea>
  <c:barChart>
   <c:barDir val="col"/>
   <c:grouping val="clustered"/>
   <c:ser>
     <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Продажи</c:v></c:pt></c:strCache></c:strRef></c:tx>
     <c:cat><c:strRef><c:strCache><c:pt idx="0"><c:v>Янв</c:v></c:pt><c:pt idx="1"><c:v>Фев</c:v></c:pt></c:strCache></c:strRef></c:cat>
     <c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>10</c:v></c:pt><c:pt idx="1"><c:v>20</c:v></c:pt></c:numCache></c:numRef></c:val>
   </c:ser>
  </c:barChart>
 </c:plotArea></c:chart>
</c:chartSpace>`;

describe('parseChartXml', () => {
  it('parses a clustered column chart', () => {
    const c = parseChartXml(barChart);
    expect(c).not.toBeNull();
    expect(c!.chartType).toBe('column');
    expect(c!.categories).toEqual(['Янв', 'Фев']);
    expect(c!.series).toHaveLength(1);
    expect(c!.series[0].name).toBe('Продажи');
    expect(c!.series[0].data).toEqual([10, 20]);
  });

  it('maps stacked bar', () => {
    const xml = barChart
      .replace('val="col"', 'val="bar"')
      .replace('val="clustered"', 'val="stacked"');
    expect(parseChartXml(xml)!.chartType).toBe('stackedBar');
  });

  it('returns null when no chart present', () => {
    expect(parseChartXml('<c:chartSpace><c:chart><c:plotArea/></c:chart></c:chartSpace>')).toBeNull();
  });
});
