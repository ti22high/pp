#!/usr/bin/env -S npx tsx
// Дублирует слайды (и опционально медиа) в существующем .pptx до нужного объёма.
// Цель — нагрузочный тест парсера на большие файлы (200–300 слайдов, 100+ МБ),
// для которых нет публичных эталонов.
//
// Использование:
//   npx tsx scripts/duplicate-pptx-slides.ts \
//     --input  test-assets/training-module-eu.pptx \
//     --output test-assets/training-module-eu-big.pptx \
//     --slides 250 \
//     --media-multiplier 40
//
// Замечания:
// - Дублирование слайда = копия slideN.xml + slideN.xml.rels (новые имена) +
//   запись Relationship в presentation.xml.rels + <p:sldId> в presentation.xml +
//   Override в [Content_Types].xml. Семантика сохраняется (PowerPoint и Р7 видят
//   копии как самостоятельные слайды).
// - media-multiplier 1 = медиа НЕ дублируется (новые слайды ссылаются на те же
//   ppt/media/*.png). Размер не растёт пропорционально слайдам.
// - media-multiplier N>1 = каждая медиа-файл копируется N раз под уникальным
//   именем; каждая копия слайда round-robin'ит свои копии медиа. Размер
//   приближается к N × (исходный_размер_медиа).
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import JSZip from 'jszip';

interface SlideEntry {
  rId: string;
  path: string; // 'ppt/slides/slideN.xml'
  relsPath: string; // 'ppt/slides/_rels/slideN.xml.rels' (может не существовать)
  num: number; // N
  xml: string;
  relsXml: string | null;
}

const { values } = parseArgs({
  options: {
    input: { type: 'string', short: 'i' },
    output: { type: 'string', short: 'o' },
    slides: { type: 'string', short: 's', default: '250' },
    'media-multiplier': { type: 'string', default: '1' },
  },
});

if (!values.input) {
  console.error('Usage: --input file.pptx [--output big.pptx] [--slides 250] [--media-multiplier 1]');
  process.exit(1);
}

const inputPath = String(values.input);
const outputPath = String(values.output ?? inputPath.replace(/\.pptx$/, '-big.pptx'));
const targetSlides = parseInt(String(values.slides), 10);
const mediaMultiplier = parseInt(String(values['media-multiplier']), 10);

const buf = await readFile(inputPath);
console.log(`📂 ${inputPath}: ${(buf.byteLength / 1024 / 1024).toFixed(2)} МБ`);
const zip = await JSZip.loadAsync(buf);

// 1) Считываем главные XML.
const presRelsPath = 'ppt/_rels/presentation.xml.rels';
const presPath = 'ppt/presentation.xml';
const ctPath = '[Content_Types].xml';
const presRelsXml = await zip.file(presRelsPath)!.async('string');
const presXml = await zip.file(presPath)!.async('string');
const ctXml = await zip.file(ctPath)!.async('string');

// 2) Список исходных слайдов через presentation.xml.rels.
const slideRelMatches = [
  ...presRelsXml.matchAll(
    /<Relationship[^>]+Id="(rId\d+)"[^>]+Target="(slides\/slide\d+\.xml)"[^>]*\/>/g,
  ),
];
const originalSlides: SlideEntry[] = await Promise.all(
  slideRelMatches.map(async (m): Promise<SlideEntry> => {
    const target = m[2];
    const path = `ppt/${target}`;
    const num = parseInt(path.match(/slide(\d+)\.xml/)![1], 10);
    const relsPath = `ppt/slides/_rels/slide${num}.xml.rels`;
    const xml = await zip.file(path)!.async('string');
    const rf = zip.file(relsPath);
    const relsXml = rf ? await rf.async('string') : null;
    return { rId: m[1], path, relsPath, num, xml, relsXml };
  }),
);
console.log(`📊 Слайдов в исходнике: ${originalSlides.length}`);

// 3) Дублирование медиа (если нужно). Делаем заранее, чтобы новые slide-rels
//    могли ссылаться на дубликаты по уникальным именам.
const mediaFiles = Object.keys(zip.files).filter(
  (k) => k.startsWith('ppt/media/') && !zip.files[k].dir,
);
console.log(`🖼  Медиа-файлов в исходнике: ${mediaFiles.length}`);
// origPath ('ppt/media/imageX.png') → массив дубликатов (тоже abs-пути в zip).
const mediaCopies = new Map<string, string[]>();
if (mediaMultiplier > 1) {
  console.log(`📐 Дублируем каждый медиа-файл ×${mediaMultiplier - 1} (итого ${mediaMultiplier})`);
  for (const orig of mediaFiles) {
    const ext = orig.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'bin';
    const stem = orig.replace(/\.[^.]+$/, '');
    const bytes = await zip.file(orig)!.async('uint8array');
    const copies: string[] = [];
    for (let i = 1; i < mediaMultiplier; i++) {
      const dupPath = `${stem}_dup${i}.${ext}`;
      zip.file(dupPath, bytes);
      copies.push(dupPath);
    }
    mediaCopies.set(orig, copies);
  }
}

// 4) Счётчики ID — продолжаем нумерацию от максимальных существующих.
let maxRId = Math.max(
  ...[...presRelsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10)),
);
let maxSlideNum = Math.max(...originalSlides.map((s) => s.num));
let maxSldId = Math.max(
  ...[...presXml.matchAll(/<p:sldId[^>]+id="(\d+)"/g)].map((m) => parseInt(m[1], 10)),
);

const additionalNeeded = Math.max(0, targetSlides - originalSlides.length);
const copiesPerSlide = Math.ceil(additionalNeeded / originalSlides.length);
const finalSlides = originalSlides.length * (1 + copiesPerSlide);
console.log(
  `🎯 Целевое: ${targetSlides}. Добавляем ${copiesPerSlide} копий каждого → итого ${finalSlides} слайдов.`,
);

// 5) Генерируем новые слайды.
const newPresRels: string[] = [];
const newSldIds: string[] = [];
const newCtOverrides: string[] = [];

for (let copyN = 1; copyN <= copiesPerSlide; copyN++) {
  for (const orig of originalSlides) {
    maxSlideNum += 1;
    maxRId += 1;
    maxSldId += 1;
    const newSlideName = `slide${maxSlideNum}.xml`;
    const newSlidePath = `ppt/slides/${newSlideName}`;

    let newSlideXml = orig.xml;
    let newSlideRelsXml = orig.relsXml;

    // Если дублируем медиа — подменяем Target в slide-rels на одну из копий
    // (round-robin по copyN, чтобы разные копии слайдов ссылались на разные медиа).
    if (newSlideRelsXml && mediaMultiplier > 1) {
      newSlideRelsXml = newSlideRelsXml.replace(
        /Target="(\.\.\/media\/[^"]+)"/g,
        (match, target) => {
          const mediaName = String(target).split('/').pop()!;
          const absPath = `ppt/media/${mediaName}`;
          const copies = mediaCopies.get(absPath);
          if (!copies || copies.length === 0) return match;
          const chosen = copies[(copyN - 1) % copies.length];
          const chosenName = chosen.split('/').pop()!;
          return `Target="../media/${chosenName}"`;
        },
      );
    }

    zip.file(newSlidePath, newSlideXml);
    if (newSlideRelsXml) {
      const newRelsPath = `ppt/slides/_rels/${newSlideName}.rels`;
      zip.file(newRelsPath, newSlideRelsXml);
    }

    const newRId = `rId${maxRId}`;
    newPresRels.push(
      `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${newSlideName}"/>`,
    );
    newSldIds.push(`<p:sldId id="${maxSldId}" r:id="${newRId}"/>`);
    newCtOverrides.push(
      `<Override PartName="/${newSlidePath}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    );
  }
}

// 6) Обновляем XML заголовки.
zip.file(
  presRelsPath,
  presRelsXml.replace(/<\/Relationships>/, `${newPresRels.join('')}</Relationships>`),
);
zip.file(presPath, presXml.replace(/<\/p:sldIdLst>/, `${newSldIds.join('')}</p:sldIdLst>`));
zip.file(ctPath, ctXml.replace(/<\/Types>/, `${newCtOverrides.join('')}</Types>`));

// 7) Сохраняем.
console.log(`💾 Сохраняем в ${outputPath}…`);
const outBuf = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 },
});
await writeFile(outputPath, outBuf);
console.log(
  `✅ Готово: ${(outBuf.byteLength / 1024 / 1024).toFixed(1)} МБ, ${finalSlides} слайдов.`,
);
