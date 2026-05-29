// Парсер ppt/theme/themeN.xml (Спринт B.3): цветовая схема и шрифт-схема.
//
// Цветовая схема нужна для разрешения `<a:schemeClr val="accent1"/>` →
// конкретный hex при чтении свойств фигуры/текста. Шрифт-схема даёт major/minor
// fontFamily для текста с `+mj-lt`/`+mn-lt` ссылками.

import type { PptxArchive } from './zip';
import { parseXml } from './xml';

export interface PptxTheme {
  // schemeName ('accent1', 'tx1', 'bg1', 'hlink', …) → hex без '#'.
  colors: Map<string, string>;
  // Основной шрифт темы (заголовки). По умолчанию 'Calibri Light'.
  majorFont: string;
  // Доп. шрифт темы (тело). По умолчанию 'Calibri'.
  minorFont: string;
}

// Дефолты как в чистой Office-теме — на случай если в .pptx тема пустая/сбита.
const FALLBACK_FONT_MAJOR = 'Calibri Light';
const FALLBACK_FONT_MINOR = 'Calibri';

// Маппинг XML-тегов внутри clrScheme в каноничные имена. В OOXML dk1/lt1/dk2/lt2
// одновременно «text1/bg1/text2/bg2» (см. ECMA-376 §20.1.6.2). Маппим оба
// варианта для прозрачности дальнейшего резолвинга.
const SCHEME_TAG_ALIASES: Record<string, string[]> = {
  'a:dk1': ['dk1', 'tx1'],
  'a:lt1': ['lt1', 'bg1'],
  'a:dk2': ['dk2', 'tx2'],
  'a:lt2': ['lt2', 'bg2'],
  'a:accent1': ['accent1'],
  'a:accent2': ['accent2'],
  'a:accent3': ['accent3'],
  'a:accent4': ['accent4'],
  'a:accent5': ['accent5'],
  'a:accent6': ['accent6'],
  'a:hlink': ['hlink'],
  'a:folHlink': ['folHlink'],
};

interface ColorVal {
  'a:srgbClr'?: { '@_val'?: string };
  'a:sysClr'?: { '@_val'?: string; '@_lastClr'?: string };
}

interface RawTheme {
  'a:theme'?: {
    'a:themeElements'?: {
      'a:clrScheme'?: Record<string, ColorVal>;
      'a:fontScheme'?: {
        'a:majorFont'?: { 'a:latin'?: { '@_typeface'?: string } };
        'a:minorFont'?: { 'a:latin'?: { '@_typeface'?: string } };
      };
    };
  };
}

// Извлекает hex (без '#') из `<a:srgbClr val="..."/>` или
// `<a:sysClr val="windowText" lastClr="000000"/>`. null если не нашли.
function extractHex(node: ColorVal | undefined): string | null {
  if (!node) return null;
  const srgb = node['a:srgbClr']?.['@_val'];
  if (srgb) return srgb.toLowerCase();
  const sys = node['a:sysClr']?.['@_lastClr'];
  if (sys) return sys.toLowerCase();
  return null;
}

export async function parseTheme(zip: PptxArchive, themePath: string): Promise<PptxTheme> {
  const xml = await zip.getText(themePath);
  const colors = new Map<string, string>();
  let majorFont = FALLBACK_FONT_MAJOR;
  let minorFont = FALLBACK_FONT_MINOR;

  if (!xml) return { colors, majorFont, minorFont };

  const root = parseXml(xml) as RawTheme;
  const elem = root['a:theme']?.['a:themeElements'];
  if (!elem) return { colors, majorFont, minorFont };

  const clrScheme = elem['a:clrScheme'];
  if (clrScheme) {
    for (const [tag, aliases] of Object.entries(SCHEME_TAG_ALIASES)) {
      const hex = extractHex(clrScheme[tag]);
      if (hex) {
        for (const a of aliases) colors.set(a, hex);
      }
    }
  }

  const fs = elem['a:fontScheme'];
  if (fs) {
    const major = fs['a:majorFont']?.['a:latin']?.['@_typeface'];
    const minor = fs['a:minorFont']?.['a:latin']?.['@_typeface'];
    if (major) majorFont = major;
    if (minor) minorFont = minor;
  }
  return { colors, majorFont, minorFont };
}

// Резолвит `<a:schemeClr val="accent1"/>` → hex (без '#'). Возвращает fallback
// (чёрный) если схема не содержит такого имени — лучше видимый чёрный, чем
// «прозрачный» / undefined, ломающий рендер.
export function resolveSchemeColor(theme: PptxTheme, val: string): string {
  return theme.colors.get(val) ?? '000000';
}
