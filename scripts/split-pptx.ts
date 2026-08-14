#!/usr/bin/env -S npx tsx
// Нарезает большой .pptx на несколько маленьких по N слайдов (Спринт C).
//
// Зачем: Р7 Офис теряет слайды/контент на больших PowerPoint-файлах. Часто
// причина — размер/сложность. Если разрезать файл на части по 10-20 слайдов,
// каждая часть открывается в Р7 надёжно, а пользователь собирает нужное
// «по слайдам» (его же формулировка задачи).
//
// Каждая часть — самостоятельный валидный .pptx: копируются все мастера,
// лейауты, темы, но остаются только слайды из диапазона и только те медиа,
// на которые ссылаются оставленные части (остальные фото выкидываются →
// размер части реально меньше).
//
// Использование:
//   npx tsx scripts/split-pptx.ts --input big.pptx --outdir ./parts --per-chunk 15
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import JSZip from 'jszip';

const { values } = parseArgs({
  options: {
    input: { type: 'string', short: 'i' },
    outdir: { type: 'string', short: 'o', default: './parts' },
    'per-chunk': { type: 'string', short: 'n', default: '15' },
  },
});

if (!values.input) {
  console.error('Использование: --input big.pptx [--outdir ./parts] [--per-chunk 15]');
  process.exit(1);
}
const inputPath = String(values.input);
const outDir = String(values.outdir);
const perChunk = Math.max(1, parseInt(String(values['per-chunk']), 10));

// --- Мелкие помощники (без импортов из renderer, чтобы работать в Node) ---

// Разрешает относительный target из .rels к абсолютному имени в zip.
function resolveTarget(relsFilePath: string, target: string): string {
  if (target.startsWith('/')) return target.replace(/^\/+/, '');
  const dir = relsFilePath.replace(/\/_rels\/[^/]+$/, '');
  const parts = dir.split('/').filter(Boolean);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

// Путь .rels для части: ppt/slides/slide1.xml → ppt/slides/_rels/slide1.xml.rels
function relsPathFor(partPath: string): string {
  return partPath.replace(/([^/]+)$/, '_rels/$1.rels');
}

// Собирает все media-цели (ppt/media/...) из данного .rels-текста.
function mediaTargetsOf(relsXml: string, relsPath: string): string[] {
  const out: string[] = [];
  for (const m of relsXml.matchAll(/Target="([^"]+)"/g)) {
    const resolved = resolveTarget(relsPath, m[1]);
    if (resolved.startsWith('ppt/media/')) out.push(resolved);
  }
  return out;
}

const buf = await readFile(inputPath);
console.log(`📂 ${inputPath}: ${(buf.byteLength / 1024 / 1024).toFixed(1)} МБ`);
const srcZip = await JSZip.loadAsync(buf);

const presRelsPath = 'ppt/_rels/presentation.xml.rels';
const presPath = 'ppt/presentation.xml';
const ctPath = '[Content_Types].xml';
const presRelsXml = await srcZip.file(presRelsPath)!.async('string');
const presXml = await srcZip.file(presPath)!.async('string');
const ctXml = await srcZip.file(ctPath)!.async('string');

// Порядок слайдов из sldIdLst: [{rId, slidePath}]
const sldIdEntries = [...presXml.matchAll(/<p:sldId\b[^>]*\br:id="(rId\d+)"[^>]*\/>/g)].map((m) => m[1]);
const relTargetById = new Map<string, string>();
for (const m of presRelsXml.matchAll(/<Relationship\b[^>]*\bId="(rId\d+)"[^>]*\bTarget="([^"]+)"[^>]*\/>/g)) {
  relTargetById.set(m[1], m[2]);
}
// Также обратный порядок атрибутов (Target перед Id) — на всякий случай.
for (const m of presRelsXml.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="(rId\d+)"[^>]*\/>/g)) {
  if (!relTargetById.has(m[2])) relTargetById.set(m[2], m[1]);
}

const orderedSlides = sldIdEntries
  .map((rId) => ({ rId, path: relTargetById.get(rId) ? resolveTarget(presRelsPath, relTargetById.get(rId)!) : null }))
  .filter((s): s is { rId: string; path: string } => s.path !== null && /slides\/slide\d+\.xml$/.test(s.path));

console.log(`📊 Слайдов: ${orderedSlides.length}, режем по ${perChunk} → ${Math.ceil(orderedSlides.length / perChunk)} частей`);

// Медиа, на которые ссылаются НЕ-слайдовые части (мастера/лейауты/темы) —
// они остаются в каждой части, поэтому их медиа всегда сохраняем.
const alwaysKeepMedia = new Set<string>();
for (const name of Object.keys(srcZip.files)) {
  if (!name.endsWith('.rels')) continue;
  // owner .rels для слайда обрабатываем по-другому (пер-часть), здесь только не-слайды.
  if (/ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(name)) continue;
  const relsXml = await srcZip.file(name)!.async('string');
  for (const t of mediaTargetsOf(relsXml, name)) alwaysKeepMedia.add(t);
}

await mkdir(outDir, { recursive: true });
const baseName = basename(inputPath, '.pptx');
const totalChunks = Math.ceil(orderedSlides.length / perChunk);

for (let chunk = 0; chunk < totalChunks; chunk++) {
  const keep = orderedSlides.slice(chunk * perChunk, (chunk + 1) * perChunk);
  const keepPaths = new Set(keep.map((s) => s.path));
  const keepRIds = new Set(keep.map((s) => s.rId));

  // Медиа этой части = alwaysKeep ∪ медиа оставленных слайдов.
  const keepMedia = new Set(alwaysKeepMedia);
  for (const s of keep) {
    const rp = relsPathFor(s.path);
    const rf = srcZip.file(rp);
    if (rf) {
      const relsXml = await rf.async('string');
      for (const t of mediaTargetsOf(relsXml, rp)) keepMedia.add(t);
    }
  }

  const out = new JSZip();
  for (const [name, entry] of Object.entries(srcZip.files)) {
    if (entry.dir) continue;
    // Пропускаем слайды не из диапазона и их .rels.
    const slideMatch = name.match(/^ppt\/slides\/slide\d+\.xml$/);
    if (slideMatch && !keepPaths.has(name)) continue;
    const slideRelsMatch = name.match(/^ppt\/slides\/_rels\/(slide\d+\.xml)\.rels$/);
    if (slideRelsMatch && !keepPaths.has(`ppt/slides/${slideRelsMatch[1]}`)) continue;
    // Пропускаем неиспользуемые медиа.
    if (name.startsWith('ppt/media/') && !keepMedia.has(name)) continue;

    out.file(name, await entry.async('uint8array'));
  }

  // presentation.xml — оставить только sldId из диапазона.
  let newPres = presXml;
  const sldLstMatch = newPres.match(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/);
  if (sldLstMatch) {
    const kept = [...sldLstMatch[0].matchAll(/<p:sldId\b[^>]*\/>/g)]
      .filter((m) => {
        const rid = m[0].match(/r:id="(rId\d+)"/)?.[1];
        return rid && keepRIds.has(rid);
      })
      .map((m) => m[0])
      .join('');
    newPres = newPres.replace(sldLstMatch[0], `<p:sldIdLst>${kept}</p:sldIdLst>`);
  }
  out.file(presPath, newPres);

  // presentation.xml.rels — убрать слайд-rels не из диапазона (остальные оставить).
  const newPresRels = presRelsXml.replace(/<Relationship\b[^>]*\/>/g, (rel) => {
    const target = rel.match(/Target="([^"]+)"/)?.[1];
    if (!target) return rel;
    const resolved = resolveTarget(presRelsPath, target);
    if (/slides\/slide\d+\.xml$/.test(resolved) && !keepPaths.has(resolved)) return '';
    return rel;
  });
  out.file(presRelsPath, newPresRels);

  // [Content_Types].xml — убрать Override для выкинутых слайдов.
  const newCt = ctXml.replace(/<Override\b[^>]*\/>/g, (ov) => {
    const part = ov.match(/PartName="([^"]+)"/)?.[1];
    if (!part) return ov;
    const norm = part.replace(/^\/+/, '');
    if (/^ppt\/slides\/slide\d+\.xml$/.test(norm) && !keepPaths.has(norm)) return '';
    return ov;
  });
  out.file(ctPath, newCt);

  const outName = join(outDir, `${baseName}-part${chunk + 1}.pptx`);
  const outBuf = await out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  await writeFile(outName, outBuf);
  console.log(`  ✅ ${outName}: ${keep.length} слайдов, ${(outBuf.byteLength / 1024 / 1024).toFixed(1)} МБ`);
}

console.log('🎉 Готово. Открывай части в Р7 по одной.');
