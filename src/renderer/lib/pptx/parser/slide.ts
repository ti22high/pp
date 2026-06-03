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

// Рекурсивно обходит spTree, собирая Shape-ы. opts.skipPlaceholders=true пропускает
// `<p:sp>` с `<p:ph>` (это плейсхолдеры — у master/layout они уже учтены как карта
// xfrm; включать их в декор слайда не нужно, иначе дублирование).
async function walkSpTree(
  tree: RawSpTree | undefined,
  ctx: SlideContext & {
    rels: Map<string, PptxRelationship>;
    slideRelsPath: string;
    placeholders: PlaceholderXfrms;
  },
  opts: { skipPlaceholders?: boolean } = {},
): Promise<Shape[]> {
  if (!tree) return [];
  const shapes: Shape[] = [];

  for (const sp of asArray(tree['p:sp'])) {
    if (opts.skipPlaceholders && sp['p:nvSpPr']?.['p:nvPr']?.['p:ph']) continue;
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
    const nested = await walkSpTree(grp, ctx, opts);
    shapes.push(...nested);
  }
  return shapes;
}

// Загружает «дизайн-контекст» слайда: фигуры из slideMaster + slideLayout
// (логотипы, рамки, footer'ы — всё кроме placeholder-ов), фоновый цвет/картинка
// от master/layout, и карту placeholder-xfrm для наследования размеров.
//
// Без этого слайды выглядят пустыми — реальный визуальный «дизайн» в .pptx
// почти весь лежит в master/layout, а не в slideN.xml.
async function loadDesignContext(
  archive: PptxArchive,
  theme: PptxTheme,
  slideRels: Map<string, PptxRelationship>,
  slideRelsPath: string,
): Promise<{
  placeholders: PlaceholderXfrms;
  designShapes: Shape[];
  background?: SlideBackground;
}> {
  const layoutRel = [...slideRels.values()].find((r) => r.type.endsWith('/slideLayout'));
  if (!layoutRel) return { placeholders: new Map(), designShapes: [] };

  const layoutPath = resolveRelTarget(slideRelsPath, layoutRel.target);
  const layoutXml = await archive.getText(layoutPath);
  const layoutRelsPath = relsPathFor(layoutPath);
  const layoutRelsXmlText = await archive.getText(layoutRelsPath);
  const layoutRels = layoutRelsXmlText ? parseRels(layoutRelsXmlText) : new Map();

  let masterXml: string | null = null;
  let masterRels = new Map<string, PptxRelationship>();
  let masterRelsPath = '';
  const masterRel = [...layoutRels.values()].find((r) => r.type.endsWith('/slideMaster'));
  if (masterRel) {
    const masterPath = resolveRelTarget(layoutRelsPath, masterRel.target);
    masterXml = await archive.getText(masterPath);
    masterRelsPath = relsPathFor(masterPath);
    const mrXml = await archive.getText(masterRelsPath);
    if (mrXml) masterRels = parseRels(mrXml);
  }

  // Placeholder-карта для inherited xfrm.
  const placeholders = mergePlaceholders(parsePlaceholdersXml(masterXml), parsePlaceholdersXml(layoutXml));

  // Декоративные фигуры: master сначала (ниже по z), потом layout (выше).
  const designShapes: Shape[] = [];
  if (masterXml) {
    const root = parseXml(masterXml) as { 'p:sldMaster'?: { 'p:cSld'?: { 'p:spTree'?: RawSpTree } } };
    const tree = root['p:sldMaster']?.['p:cSld']?.['p:spTree'];
    if (tree) {
      const masterShapes = await walkSpTree(
        tree,
        { archive, theme, rels: masterRels, slideRelsPath: masterRelsPath, placeholders },
        { skipPlaceholders: true },
      );
      designShapes.push(...masterShapes);
    }
  }
  if (layoutXml) {
    const root = parseXml(layoutXml) as { 'p:sldLayout'?: { 'p:cSld'?: { 'p:spTree'?: RawSpTree } } };
    const tree = root['p:sldLayout']?.['p:cSld']?.['p:spTree'];
    if (tree) {
      const layoutShapes = await walkSpTree(
        tree,
        { archive, theme, rels: layoutRels, slideRelsPath: layoutRelsPath, placeholders },
        { skipPlaceholders: true },
      );
      designShapes.push(...layoutShapes);
    }
  }

  // Фон: layout (более специфичный) → master (фоллбэк).
  let background: SlideBackground | undefined;
  if (layoutXml) {
    const root = parseXml(layoutXml) as { 'p:sldLayout'?: { 'p:cSld'?: { 'p:bg'?: { 'p:bgPr'?: RawBgPr } } } };
    background = bgFromXml(root['p:sldLayout']?.['p:cSld']?.['p:bg']?.['p:bgPr'], theme);
  }
  if (!background && masterXml) {
    const root = parseXml(masterXml) as { 'p:sldMaster'?: { 'p:cSld'?: { 'p:bg'?: { 'p:bgPr'?: RawBgPr } } } };
    background = bgFromXml(root['p:sldMaster']?.['p:cSld']?.['p:bg']?.['p:bgPr'], theme);
  }

  return { placeholders, designShapes, background };
}

export async function parseSlide(slidePath: string, ctx: SlideContext): Promise<Slide> {
  const xml = await ctx.archive.getText(slidePath);
  if (!xml) {
    return createEmptySlide();
  }

  const root = parseXml(xml) as RawSld;
  const cSld = root['p:sld']?.['p:cSld'];

  const slideRelsPath = relsPathFor(slidePath);
  const relsXml = await ctx.archive.getText(slideRelsPath);
  const rels = relsXml ? parseRels(relsXml) : new Map();

  // Дизайн-контекст: фоны и декор от master+layout + placeholder-карта.
  const design = await loadDesignContext(ctx.archive, ctx.theme, rels, slideRelsPath);

  const slideShapes = await walkSpTree(cSld?.['p:spTree'], {
    ...ctx,
    rels,
    slideRelsPath,
    placeholders: design.placeholders,
  });

  const slide = createEmptySlide();
  // Декор от master/layout идёт ПЕРВЫМ → отрисуется под фигурами слайда (z-order).
  slide.shapes = [...design.designShapes, ...slideShapes];

  // Свой фон → layout-фон → master-фон.
  const ownBg = bgFromXml(cSld?.['p:bg']?.['p:bgPr'], ctx.theme);
  const bg = ownBg ?? design.background;
  if (bg) slide.background = bg;
  return slide;
}
