// Загрузчик woff2-шрифтов для offline-режима.
// Источник — fontsource.org CDN (https://r2.fontsource.org/fonts/<family>/<file>.woff2),
// у Fontsource зеркало npm-пакетов: стабильно, не требует регистрации, есть кириллица.
//
// Список шрифтов и весов определяет SPEC.md §1.2 (Roboto, Open Sans, Lato, Montserrat,
// PT Sans, PT Serif, Roboto Slab, Roboto Mono, Source Sans 3, Noto Sans, Noto Serif,
// Inter, Playfair Display, Merriweather, Oswald, Raleway, Poppins, Caveat, Pacifico,
// JetBrains Mono).
//
// Решение по весам зафиксировано в DECISIONS.md: для каждого шрифта — Regular 400 и
// Bold 700, italic-варианты для основных пропорциональных. Моноширинные — только normal.
//
// Запуск:
//   npm run fonts:download
//
// Шрифты сохраняются в resources/fonts/ как <family>-<style>-<weight>.woff2.
// Файл считается уже скачанным, если он есть на диске — повторного запроса не делаем.

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface FontSpec {
  // Имя на Fontsource (slug в URL).
  fontsourceSlug: string;
  // CSS font-family (как будет в FontFace).
  family: string;
  // Какие веса и стили качать.
  variants: Array<{ weight: 400 | 500 | 700; style: 'normal' | 'italic' }>;
  // Подсеты: latin для английского, cyrillic для русского. Берём оба.
  subsets: Array<'latin' | 'cyrillic'>;
}

// Полный набор по §1.2.
const FONTS: FontSpec[] = [
  spec('roboto', 'Roboto', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('open-sans', 'Open Sans', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('lato', 'Lato', ['n400', 'n700', 'i400'], ['latin']),
  spec('montserrat', 'Montserrat', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('pt-sans', 'PT Sans', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('pt-serif', 'PT Serif', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('roboto-slab', 'Roboto Slab', ['n400', 'n700'], ['latin', 'cyrillic']),
  spec('roboto-mono', 'Roboto Mono', ['n400', 'n700'], ['latin']),
  spec('source-sans-3', 'Source Sans 3', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('noto-sans', 'Noto Sans', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('noto-serif', 'Noto Serif', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('inter', 'Inter', ['n400', 'n700'], ['latin', 'cyrillic']),
  spec('playfair-display', 'Playfair Display', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('merriweather', 'Merriweather', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('oswald', 'Oswald', ['n400', 'n700'], ['latin', 'cyrillic']),
  spec('raleway', 'Raleway', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  spec('poppins', 'Poppins', ['n400', 'n700', 'i400'], ['latin']),
  spec('caveat', 'Caveat', ['n400', 'n700'], ['latin', 'cyrillic']),
  spec('pacifico', 'Pacifico', ['n400'], ['latin', 'cyrillic']),
  spec('jetbrains-mono', 'JetBrains Mono', ['n400', 'n700'], ['latin', 'cyrillic']),
];

// Помощник для краткой записи списка (n400 = normal/400, i400 = italic/400).
function spec(
  slug: string,
  family: string,
  variants: string[],
  subsets: Array<'latin' | 'cyrillic'>,
): FontSpec {
  return {
    fontsourceSlug: slug,
    family,
    variants: variants.map((v) => {
      const style = v[0] === 'i' ? 'italic' : 'normal';
      const weight = Number(v.slice(1)) as 400 | 500 | 700;
      return { weight, style };
    }),
    subsets,
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'resources', 'fonts');

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(
  slug: string,
  family: string,
  subset: 'latin' | 'cyrillic',
  weight: number,
  style: 'normal' | 'italic',
): Promise<void> {
  // Fontsource CDN формат: <slug>-<subset>-<weight>-<style>.woff2
  const fileName = `${slug}-${subset}-${weight}-${style}.woff2`;
  const url = `https://r2.fontsource.org/fonts/${slug}@latest/${subset}-${weight}-${style}.woff2`;
  const outName = `${family.replace(/\s+/g, '_')}-${weight}-${style}-${subset}.woff2`;
  const outPath = join(OUTPUT_DIR, outName);

  if (await fileExists(outPath)) {
    console.log(`  skip (exists): ${outName}`);
    return;
  }

  // Retry с экспоненциальным backoff — CDN иногда роняет TLS-сессию
  // (особенно через антивирусы / провайдеров с DPI). До 4 попыток: 1s, 2s, 4s, 8s.
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`  fetch (try ${attempt}): ${fileName}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`    !! HTTP ${response.status} ${response.statusText} — ${url}`);
        return;
      }
      const buf = Buffer.from(await response.arrayBuffer());
      await writeFile(outPath, buf);
      console.log(`    ok: ${outName} (${buf.length} bytes)`);
      return;
    } catch (err) {
      const isLast = attempt === MAX_ATTEMPTS;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`    !! attempt ${attempt} failed: ${msg}`);
      if (isLast) {
        console.warn(`    !! giving up on ${outName} after ${MAX_ATTEMPTS} attempts`);
        return;
      }
      const wait = 1000 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Downloading ${FONTS.length} font families to ${OUTPUT_DIR}`);
  for (const font of FONTS) {
    console.log(`\n${font.family} (${font.fontsourceSlug})`);
    for (const subset of font.subsets) {
      for (const variant of font.variants) {
        await downloadOne(
          font.fontsourceSlug,
          font.family,
          subset,
          variant.weight,
          variant.style,
        );
      }
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
