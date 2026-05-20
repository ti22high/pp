// Zod-схемы модели данных. Используются:
// 1) для валидации десериализованного .gslx (Phase 5),
// 2) для парсера .pptx — после маппинга OOXML в нашу модель проверяем,
//    что результат соответствует схеме (Phase 5),
// 3) как источник истины TS-типов (через z.infer) — переопределение типов
//    из @shared/types на более строгие.

import { z } from 'zod';

// Идентификаторы — UUID v4 (SPEC §5.2).
export const slideIdSchema = z.string().min(1);
export const shapeIdSchema = z.string().min(1);

// Цвета: hex (#RRGGBB или #RRGGBBAA) либо CSS-имена.
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$|^[a-zA-Z]+$/);

// Hyperlink — на URL, на слайд (по id или относительный), на email, на закладку
// (SPEC §1.14). В Phase 2 UI поддерживает только `slide` и `slide-rel` —
// см. DECISIONS.md 2026-05-19 (Phase 2.33). `url` / `email` остаются в схеме
// для round-trip импорта .pptx (Phase 5).
export const hyperlinkSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('url'), url: z.string().url() }),
  z.object({ kind: z.literal('slide'), slideId: slideIdSchema }),
  z.object({
    kind: z.literal('slide-rel'),
    rel: z.enum(['next', 'prev', 'first', 'last']),
  }),
  z.object({ kind: z.literal('email'), email: z.string().email() }),
  z.object({ kind: z.literal('bookmark'), bookmarkId: z.string() }),
]);

// Заливка: solid / gradient / image / transparent (SPEC §1.3).
export const gradientStopSchema = z.object({
  pos: z.number().min(0).max(1),
  color: colorSchema,
});

export const fillSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('solid'), color: colorSchema }),
  z.object({
    kind: z.literal('gradient'),
    type: z.enum(['linear', 'radial']),
    angle: z.number().optional(), // только для linear
    stops: z.array(gradientStopSchema).min(2),
  }),
  z.object({
    kind: z.literal('image'),
    src: z.string(), // путь внутри media/ (Phase 3)
  }),
]);

// Обводка.
export const strokeSchema = z.object({
  color: colorSchema,
  width: z.number().min(0).max(24),
  dash: z.array(z.number()).optional(), // [4,2] и т.п.
});

// Тень.
export const shadowSchema = z.object({
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().min(0),
  color: colorSchema,
  // alpha хранится отдельным полем — Konva принимает shadowOpacity отдельно
  // от shadowColor. Если undefined — берётся alpha из самого colorSchema
  // (либо 1, если color без alpha).
  opacity: z.number().min(0).max(1).optional(),
});

// Отражение под фигурой (Slides «Reflection»). UI-секция — Phase 2.14;
// сам рендер на Konva — Phase 3 (требует клонирования ноды с masked gradient).
// До Phase 3 поле сохраняется в модели, но визуально не отображается.
export const reflectionSchema = z.object({
  alpha: z.number().min(0).max(1), // насколько яркое (0..1)
  distance: z.number().min(0),     // отступ в px от низа фигуры
  size: z.number().min(0).max(1),  // высота отражения в долях h фигуры
  blur: z.number().min(0).optional(),
});

// Анимация (SPEC §1.8). На Phase 2 — заглушка, реализуется в Phase 4.
export const animationPresetSchema = z.enum([
  'appear',
  'fadeIn',
  'fadeOut',
  'flyInLeft',
  'flyInRight',
  'flyInTop',
  'flyInBottom',
  'flyOutLeft',
  'flyOutRight',
  'flyOutTop',
  'flyOutBottom',
  'zoomIn',
  'zoomOut',
  'spinIn',
  'spinOut',
  'disappear',
  'pulse',
  'grow',
  'shrink',
  'spinEmphasis',
]);

export const animationSchema = z.object({
  id: z.string(),
  preset: animationPresetSchema,
  trigger: z.enum(['onClick', 'withPrev', 'afterPrev']),
  duration: z.number().min(50).max(10_000),
  delay: z.number().min(0).optional(),
  byParagraph: z.boolean().optional(),
});

// Base shape: общие поля всех фигур (SPEC §5.2).
const baseShape = {
  id: shapeIdSchema,
  x: z.number(),
  y: z.number(),
  w: z.number().min(0),
  h: z.number().min(0),
  rotation: z.number().optional(),
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fill: fillSchema.optional(),
  stroke: strokeSchema.optional(),
  shadow: shadowSchema.optional(),
  reflection: reflectionSchema.optional(),
  hyperlink: hyperlinkSchema.optional(),
  altText: z.string().optional(),
  animations: z.array(animationSchema).optional(),
  locked: z.boolean().optional(),
  // Идентификатор группы. Фигуры с одним groupId трактуются как единое
  // целое при выделении (клик по любой → выделяются все).
  groupId: z.string().optional(),
  // Опциональный TipTap-doc внутри фигуры. У TextShape основной контент —
  // tiptapDoc; у остальных (rect/ellipse/path) это «текст в фигуре» как в
  // Slides: double-click → редактируем поверх фигуры.
  text: z.unknown().optional(),
};

// Конкретные типы фигур (Phase 2: rect, ellipse, line, path, text;
// table/chart/image/video/audio/equation/group/placeholder — Phase 3+).
export const rectShapeSchema = z.object({ ...baseShape, type: z.literal('rect'), cornerRadius: z.number().min(0).optional() });
export const ellipseShapeSchema = z.object({ ...baseShape, type: z.literal('ellipse') });
export const lineShapeSchema = z.object({
  ...baseShape,
  type: z.literal('line'),
  points: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
});
export const pathShapeSchema = z.object({
  ...baseShape,
  type: z.literal('path'),
  pathData: z.string(),
});
export const textShapeSchema = z.object({
  ...baseShape,
  type: z.literal('text'),
  tiptapDoc: z.unknown(), // ProseMirror JSON
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  autoFit: z.enum(['none', 'shrink', 'resize']).optional(),
});
// Изображение. `src` — data URL (Phase 3.1) либо путь внутри media/ после
// внедрения MediaManager (миграция меняет только значение src, не схему).
// naturalW/naturalH — исходные пиксельные размеры (для сохранения пропорций
// и crop). crop — нормализованный прямоугольник видимой области [0..1].
export const imageShapeSchema = z.object({
  ...baseShape,
  type: z.literal('image'),
  src: z.string(),
  naturalW: z.number().positive().optional(),
  naturalH: z.number().positive().optional(),
  crop: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      w: z.number().min(0).max(1),
      h: z.number().min(0).max(1),
    })
    .optional(),
  // Маска обрезки-по-форме (Phase 3.3): ключ из imageMasks.ts. undefined =
  // прямоугольник (без маски).
  maskShape: z
    .enum([
      'roundRect',
      'circle',
      'triangle',
      'diamond',
      'pentagon',
      'hexagon',
      'star5',
      'heart',
    ])
    .optional(),
  // Перекраска (Phase 3.4): ключ из imageFilters.ts.
  recolor: z
    .enum(['none', 'grayscale', 'sepia', 'tintBlue', 'tintGreen', 'tintRed', 'tintPurple'])
    .optional(),
  // Коррекция (Phase 3.5): яркость [-1..1], контраст [-100..100]. 0 = норма.
  brightness: z.number().min(-1).max(1).optional(),
  contrast: z.number().min(-100).max(100).optional(),
});

// Ячейка таблицы (Phase 3.8). text — содержимое. colSpan/rowSpan (Phase 3.9) —
// объединение ячеек (по умолчанию 1). merged=true помечает ячейку, накрытую
// объединением соседней (не рендерится, но хранится для сохранения сетки).
// Форматирование (Phase 3.10): фон, граница, padding, выравнивание.
export const tableCellSchema = z.object({
  text: z.string(),
  colSpan: z.number().int().min(1).optional(),
  rowSpan: z.number().int().min(1).optional(),
  merged: z.boolean().optional(),
  fill: colorSchema.optional(),
  borderColor: colorSchema.optional(),
  borderWidth: z.number().min(0).optional(),
  padding: z.number().min(0).optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  valign: z.enum(['top', 'middle', 'bottom']).optional(),
  // Стили текста ячейки (Phase 3.11e) — единые для всей ячейки.
  color: colorSchema.optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
});
// Таблица (Phase 3.8): сетка rows×cols. Ширины колонок и высоты строк хранятся
// как доли ширины/высоты фигуры (сумма ≈ 1) — так resize фигуры тянет сетку
// пропорционально. Ячейки построчно: cells[row][col].
export const tableShapeSchema = z.object({
  ...baseShape,
  type: z.literal('table'),
  rows: z.number().int().min(1).max(50),
  cols: z.number().int().min(1).max(50),
  colFractions: z.array(z.number().positive()),
  rowFractions: z.array(z.number().positive()),
  cells: z.array(z.array(tableCellSchema)),
});

// Диаграмма (Phase 3.12–3.14). Данные хранятся как JSON: категории (ось X /
// подписи) + серии (имя, цвет, числа). Тип графика — один из 6.
export const chartSeriesSchema = z.object({
  name: z.string(),
  color: colorSchema.optional(),
  data: z.array(z.number()),
});
export const chartShapeSchema = z.object({
  ...baseShape,
  type: z.literal('chart'),
  chartType: z.enum([
    'column',
    'bar',
    'line',
    'area',
    'pie',
    'scatter',
    // Расширенные типы (Phase 3.14a).
    'doughnut',
    'radar',
    'stackedColumn',
    'stackedBar',
    'stackedArea',
    'combo',
    'bubble',
    'scatterLine',
  ]),
  categories: z.array(z.string()),
  series: z.array(chartSeriesSchema),
  showLegend: z.boolean().optional(),
  showGridlines: z.boolean().optional(),
  axisXTitle: z.string().optional(),
  axisYTitle: z.string().optional(),
  // Phase 3.14b.
  title: z.string().optional(),
  titlePosition: z.enum(['top', 'bottom']).optional(),
  legendPosition: z.enum(['top', 'bottom', 'left', 'right']).optional(),
  dataLabels: z.boolean().optional(),
  numberFormat: z.enum(['auto', 'integer', 'percent', 'thousands']).optional(),
});

export const shapeSchema = z.discriminatedUnion('type', [
  rectShapeSchema,
  ellipseShapeSchema,
  lineShapeSchema,
  pathShapeSchema,
  textShapeSchema,
  imageShapeSchema,
  tableShapeSchema,
  chartShapeSchema,
]);

// Фон слайда.
export const slideBackgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('color'), color: colorSchema }),
  z.object({ type: z.literal('image'), src: z.string() }),
  z.object({ type: z.literal('theme') }),
]);

// Переход (Phase 4).
export const transitionSchema = z.object({
  preset: z.enum(['none', 'fade', 'slideLeft', 'slideRight', 'flip', 'cube', 'gallery', 'dissolve']),
  duration: z.number().min(50).max(5_000),
});

// Слайд.
export const slideSchema = z.object({
  id: slideIdSchema,
  layoutId: z.string().optional(),
  background: slideBackgroundSchema.optional(),
  shapes: z.array(shapeSchema),
  notes: z.string().optional(),
  transition: transitionSchema.optional(),
  hidden: z.boolean().optional(),
});

// Тема (Phase 7).
export const themeSchema = z.object({
  name: z.string(),
  colorScheme: z.object({
    accent1: colorSchema,
    accent2: colorSchema,
    accent3: colorSchema,
    accent4: colorSchema,
    accent5: colorSchema,
    accent6: colorSchema,
    text1: colorSchema,
    text2: colorSchema,
    bg1: colorSchema,
    bg2: colorSchema,
  }),
  fontScheme: z.object({
    heading: z.string(),
    body: z.string(),
  }),
});

// Пользовательская направляющая (горизонтальная или вертикальная).
// Хранится на уровне деки (как в Slides — guides общие для всей презентации).
// pos — координата в slide-coords: x для 'v', y для 'h'.
export const userGuideSchema = z.object({
  id: z.string(),
  kind: z.enum(['h', 'v']),
  pos: z.number(),
});
export type UserGuide = z.infer<typeof userGuideSchema>;

// Настройки номеров слайдов (§1.13). Хранятся на уровне деки — общие
// для всей презентации. Положение фиксировано (правый нижний угол слайда);
// расширения (выбор позиции, шрифт, формат «1/10») — за рамки MVP.
export const pageNumbersSchema = z.object({
  enabled: z.boolean(),
  skipFirst: z.boolean(),
});
export type PageNumbersConfig = z.infer<typeof pageNumbersSchema>;

// Корневой документ.
export const deckSchema = z.object({
  id: z.string(),
  title: z.string(),
  format: z.literal('gslx'),
  version: z.literal(1),
  size: z.object({ w: z.number().positive(), h: z.number().positive() }),
  theme: themeSchema.optional(),
  slideOrder: z.array(slideIdSchema),
  slides: z.record(slideIdSchema, slideSchema),
  guides: z.array(userGuideSchema).optional(),
  pageNumbers: pageNumbersSchema.optional(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

// Выводимые TS-типы.
export type Deck = z.infer<typeof deckSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type RectShape = z.infer<typeof rectShapeSchema>;
export type EllipseShape = z.infer<typeof ellipseShapeSchema>;
export type LineShape = z.infer<typeof lineShapeSchema>;
export type PathShape = z.infer<typeof pathShapeSchema>;
export type TextShape = z.infer<typeof textShapeSchema>;
export type ImageShape = z.infer<typeof imageShapeSchema>;
export type TableShape = z.infer<typeof tableShapeSchema>;
export type TableCell = z.infer<typeof tableCellSchema>;
export type ChartShape = z.infer<typeof chartShapeSchema>;
export type ChartSeries = z.infer<typeof chartSeriesSchema>;
export type ChartType = ChartShape['chartType'];
export type Fill = z.infer<typeof fillSchema>;
export type Stroke = z.infer<typeof strokeSchema>;
export type Shadow = z.infer<typeof shadowSchema>;
export type Reflection = z.infer<typeof reflectionSchema>;
export type Hyperlink = z.infer<typeof hyperlinkSchema>;
export type Animation = z.infer<typeof animationSchema>;
export type AnimationPreset = z.infer<typeof animationPresetSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type SlideBackground = z.infer<typeof slideBackgroundSchema>;
