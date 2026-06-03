// Парсер одного slideN.xml (Спринт B.10). Обходит p:spTree, рекурсивно
// разворачивает p:grpSp (группы) в плоский список фигур, вызывает
// соответствующие подпарсеры (sp/pic/table/chart).

import { createEmptySlide } from '../../model/factory';
import type { Slide, Shape, SlideBackground } from '../../model/schema';
import type { PptxArchive } from './zip';
import type { PptxTheme } from './theme';
import { resolveSchemeColor } from './theme';
import { parseXml, asArray } from './xml';
import { parseRels, resolveRelTarget, type PptxRelationship } from './rels';
import { parseSp, type RawSp } from './sp';
import { parsePic, type RawPic } from './pic';
import { parseGraphicFrameTable, type RawGraphicFrame } from './table';
import { parseGraphicFrameChart, type RawGraphicFrameChart } from './chart';
import {
  parsePlaceholdersXml,
  mergePlaceholders,
  type PlaceholderXfrms,
} from './placeholders';

export interface SlideContext {
  archive: PptxArchive;
  theme: PptxTheme;
}

interface RawSpTree {
  'p:sp'?: RawSp[];
  'p:pic'?: RawPic[];
  'p:graphicFrame'?: (RawGraphicFrame & RawGraphicFrameChart)[];
  'p:cxnSp'?: unknown[]; // connectors — обрабатываются отдельной веткой (B.11+)
  'p:grpSp'?: RawSpTree[]; // вложенные группы
}
interface RawBgPr {
  'a:solidFill'?: {
    'a:srgbClr'?: { '@_val'?: string };
    'a:schemeClr'?: { '@_val'?: string };
  };
}
interface RawSld {
  'p:sld'?: {
    'p:cSld'?: {
      'p:bg'?: { 'p:bgPr'?: RawBgPr };
      'p:spTree'?: RawSpTree;
    };
  };
}

// Путь к .rels-файлу слайда: ppt/slides/_rels/slideN.xml.rels.
function relsPathFor(slidePath: string): string {
  return slidePath.replace(/([^/]+)$/, '_rels/$1.rels');
}

function bgFromXml(bg: RawBgPr | undefined, theme: PptxTheme): SlideBackground | undefined {
  const fill = bg?.['a:solidFill'];
  if (!fill) return undefined;
  const srgb = fill['a:srgbClr']?.['@_val'];
  if (srgb) return { type: 'color', color: `#${srgb.toLowerCase()}` };
  const scheme = fill['a:schemeClr']?.['@_val'];
  if (scheme) return { type: 'color', color: `#${resolveSchemeColor(theme, scheme)}` };
  return undefined;
}

// Рекурсивно обходит spTree (включая p:grpSp), собирая Shape-ы в порядке появления.
async function walkSpTree(
  tree: RawSpTree | undefined,
  ctx: SlideContext & {
    rels: Map<string, PptxRelationship>;
    slideRelsPath: string;
    placeholders: PlaceholderXfrms;
  },
): Promise<Shape[]> {
  if (!tree) return [];
  const shapes: Shape[] = [];

  for (const sp of asArray(tree['p:sp'])) {
    try {
      const s = parseSp(sp, ctx.theme, ctx.placeholders);
      if (s) shapes.push(s);
    } catch {
      /* пропускаем сбойную фигуру, не теряем весь слайд */
    }
  }
  for (const pic of asArray(tree['p:pic'])) {
    try {
      const s = await parsePic(pic, {
        archive: ctx.archive,
        slideRelsPath: ctx.slideRelsPath,
        rels: ctx.rels,
      });
      if (s) shapes.push(s);
    } catch {
      /* пропуск */
    }
  }
  for (const gf of asArray(tree['p:graphicFrame'])) {
    try {
      // graphicFrame может быть таблицей ИЛИ графиком (uri различается).
      const t = parseGraphicFrameTable(gf, ctx.theme);
      if (t) {
        shapes.push(t);
        continue;
      }
      const c = await parseGraphicFrameChart(gf, {
        archive: ctx.archive,
        slideRelsPath: ctx.slideRelsPath,
        rels: ctx.rels,
      });
      if (c) shapes.push(c);
      // Иначе — пропускаем (SmartArt, OLE — пока не парсим).
    } catch {
      /* пропуск */
    }
  }
  // Группы — рекурсия. groupId пока не выставляем (плоско); добавим в полировке.
  for (const grp of asArray(tree['p:grpSp'])) {
    const nested = await walkSpTree(grp, ctx);
    shapes.push(...nested);
  }
  return shapes;
}

// Resolves slideLayout path → slideMaster path → placeholders for inherited xfrm.
async function loadPlaceholders(
  archive: PptxArchive,
  slideRels: Map<string, PptxRelationship>,
  slideRelsPath: string,
): Promise<PlaceholderXfrms> {
  const layoutRel = [...slideRels.values()].find((r) => r.type.endsWith('/slideLayout'));
  if (!layoutRel) return new Map();
  const layoutPath = resolveRelTarget(slideRelsPath, layoutRel.target);
  const layoutXml = await archive.getText(layoutPath);
  const layoutPh = parsePlaceholdersXml(layoutXml);

  // Из layout-rels достаём slideMaster.
  const layoutRelsPath = relsPathFor(layoutPath);
  const layoutRelsXml = await archive.getText(layoutRelsPath);
  if (!layoutRelsXml) return layoutPh;
  const layoutRels = parseRels(layoutRelsXml);
  const masterRel = [...layoutRels.values()].find((r) => r.type.endsWith('/slideMaster'));
  if (!masterRel) return layoutPh;
  const masterPath = resolveRelTarget(layoutRelsPath, masterRel.target);
  const masterXml = await archive.getText(masterPath);
  const masterPh = parsePlaceholdersXml(masterXml);
  // Master — база, layout перебивает (более специфичный уровень).
  return mergePlaceholders(masterPh, layoutPh);
}

export async function parseSlide(slidePath: string, ctx: SlideContext): Promise<Slide> {
  const xml = await ctx.archive.getText(slidePath);
  if (!xml) {
    // Файл слайда отсутствует — возвращаем пустой, чтобы не ломать всю презентацию.
    return createEmptySlide();
  }

  const root = parseXml(xml) as RawSld;
  const cSld = root['p:sld']?.['p:cSld'];

  // Слайд-rels (для p:pic blip и c:chart r:id, плюс slideLayout).
  const slideRelsPath = relsPathFor(slidePath);
  const relsXml = await ctx.archive.getText(slideRelsPath);
  const rels = relsXml ? parseRels(relsXml) : new Map();

  // Сборка placeholder-карт (Спринт B.6-fix): без неё у плейсхолдеров без
  // явного xfrm не будет размеров и они выпадут из рендера.
  const placeholders = await loadPlaceholders(ctx.archive, rels, slideRelsPath);

  const shapes = await walkSpTree(cSld?.['p:spTree'], {
    ...ctx,
    rels,
    slideRelsPath,
    placeholders,
  });

  const slide = createEmptySlide();
  slide.shapes = shapes;
  const bg = bgFromXml(cSld?.['p:bg']?.['p:bgPr'], ctx.theme);
  if (bg) slide.background = bg;
  return slide;
}
