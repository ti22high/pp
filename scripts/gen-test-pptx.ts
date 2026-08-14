#!/usr/bin/env -S npx tsx
// Генерирует тестовый .pptx с N слайдами, картинками, таблицами и графиками —
// для проверки сплиттера/парсера, когда под рукой нет реального файла.
//
//   npx tsx scripts/gen-test-pptx.ts --slides 40 --out test-assets/gen.pptx
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';

// pptxgenjs — CJS-модуль; через ESM-default в tsx конструктор теряется.
// Берём его напрямую через createRequire (тип any — это dev-скрипт).
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');

const { values } = parseArgs({
  options: {
    slides: { type: 'string', short: 's', default: '40' },
    out: { type: 'string', short: 'o', default: 'test-assets/gen.pptx' },
  },
});
const nSlides = Math.max(1, parseInt(String(values.slides), 10));
const outPath = String(values.out);

// Крошечный 2×2 PNG (красный) как data URL — чтобы в архиве было ppt/media/*.
const RED_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP8z8Dwn4EIwDiqEF0RAAxpAxEHZbnHAAAAAElFTkSuQmCC';

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'W', width: 10, height: 7.5 });
pptx.layout = 'W';

for (let i = 0; i < nSlides; i++) {
  const s = pptx.addSlide();
  s.addText(`Слайд ${i + 1}`, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
  s.addText(`Это тестовый слайд номер ${i + 1} с текстом для проверки нарезки.`, {
    x: 0.5,
    y: 1.3,
    w: 9,
    h: 0.6,
    fontSize: 16,
  });
  // Картинка через каждые 2 слайда (даёт медиа-файлы в архив).
  if (i % 2 === 0) {
    s.addImage({ data: RED_PNG, x: 0.5, y: 2.2, w: 2, h: 2 });
  }
  // Таблица через каждые 3.
  if (i % 3 === 0) {
    s.addTable(
      [
        [
          { text: 'A', options: { bold: true } },
          { text: 'B', options: { bold: true } },
        ],
        ['1', '2'],
        ['3', '4'],
      ],
      { x: 3, y: 2.2, w: 4, colW: [2, 2] },
    );
  }
  // График через каждые 5.
  if (i % 5 === 0) {
    s.addChart(pptx.ChartType.bar, [{ name: 'S', labels: ['a', 'b', 'c'], values: [1, 2, 3] }], {
      x: 3,
      y: 4.5,
      w: 5,
      h: 2.5,
    });
  }
}

await mkdir(dirname(outPath), { recursive: true });
const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
await writeFile(outPath, buf);
console.log(`✅ ${outPath}: ${nSlides} слайдов, ${(buf.byteLength / 1024).toFixed(0)} KB`);
