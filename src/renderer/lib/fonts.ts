// Загрузка bundled woff2-шрифтов через FontFace API.
// Источник: app://fonts/<file>.woff2 (см. main/protocol.ts).
// Имена файлов соответствуют scripts/download-fonts.ts:
//   <Family>-<weight>-<style>-<subset>.woff2
//
// Критично: вызывать `await loadFonts()` ДО первого Konva-render-цикла,
// иначе Konva.Text замерит ширину строки fallback-шрифтом и будет рассинхрон
// при последующей перерисовке (SPEC §14.2).

interface FontEntry {
  family: string;
  weight: 400 | 700;
  style: 'normal' | 'italic';
  // Подсет нужен только для unicode-range hint; FontFace объединит сам.
  subset: 'latin' | 'cyrillic';
}

// Полный список — должен совпадать с тем, что качает scripts/download-fonts.ts.
const FONTS: FontEntry[] = [
  ...family('Roboto', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Open Sans', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Lato', ['n400', 'n700', 'i400'], ['latin']),
  ...family('Montserrat', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('PT Sans', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('PT Serif', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Roboto Slab', ['n400', 'n700'], ['latin', 'cyrillic']),
  ...family('Roboto Mono', ['n400', 'n700'], ['latin']),
  ...family('Source Sans 3', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Noto Sans', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Noto Serif', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Inter', ['n400', 'n700'], ['latin', 'cyrillic']),
  ...family('Playfair Display', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Merriweather', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Oswald', ['n400', 'n700'], ['latin', 'cyrillic']),
  ...family('Raleway', ['n400', 'n700', 'i400'], ['latin', 'cyrillic']),
  ...family('Poppins', ['n400', 'n700', 'i400'], ['latin']),
  ...family('Caveat', ['n400', 'n700'], ['latin', 'cyrillic']),
  ...family('Pacifico', ['n400'], ['latin', 'cyrillic']),
  ...family('JetBrains Mono', ['n400', 'n700'], ['latin', 'cyrillic']),
];

function family(
  name: string,
  variants: string[],
  subsets: Array<'latin' | 'cyrillic'>,
): FontEntry[] {
  const entries: FontEntry[] = [];
  for (const v of variants) {
    const style = (v[0] === 'i' ? 'italic' : 'normal') as 'normal' | 'italic';
    const weight = Number(v.slice(1)) as 400 | 700;
    for (const subset of subsets) {
      entries.push({ family: name, weight, style, subset });
    }
  }
  return entries;
}

// Unicode-range подсказки помогают браузеру лениво грузить нужный набор.
// latin покрывает базовую латиницу + расширенную; cyrillic — основной кириллический блок.
const UNICODE_RANGES: Record<'latin' | 'cyrillic', string> = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  cyrillic: 'U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
};

function fileNameFor(entry: FontEntry): string {
  const familySlug = entry.family.replace(/\s+/g, '_');
  return `${familySlug}-${entry.weight}-${entry.style}-${entry.subset}.woff2`;
}

// Загружает все шрифты параллельно. Если отдельный файл не нашёлся
// (404 от app:// при отсутствующем resources/fonts/) — продолжаем,
// просто пишем warning в консоль (Phase 1 dev-сценарий — шрифтов может ещё не быть).
export async function loadFonts(): Promise<void> {
  await Promise.all(
    FONTS.map(async (entry) => {
      const url = `app://fonts/${fileNameFor(entry)}`;
      try {
        const face = new FontFace(entry.family, `url(${url}) format('woff2')`, {
          weight: String(entry.weight),
          style: entry.style,
          unicodeRange: UNICODE_RANGES[entry.subset],
          display: 'swap',
        });
        const loaded = await face.load();
        document.fonts.add(loaded);
      } catch (err) {
        console.warn(`Failed to load font ${entry.family} ${entry.weight} ${entry.style}:`, err);
      }
    }),
  );
  // Гарантируем, что браузер закончил применение метрик ко всем зарегистрированным faces.
  await document.fonts.ready;
}

// Уникальные семейства шрифтов (для селектов, напр. WordArt — Phase 3.21).
export const FONT_FAMILIES: string[] = [...new Set(FONTS.map((f) => f.family))];
