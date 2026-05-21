// Фабрики моделей: создание пустого Deck, пустого слайда и базовых фигур.
// Используется при File → New, Open Recent → fallback, и в тестах.

import { v4 as uuid } from 'uuid';
import Konva from 'konva';
import { DEFAULT_SLIDE_WIDTH, DEFAULT_SLIDE_HEIGHT } from '@shared/constants';
import { measureWordArt } from '@renderer/lib/wordart';
import type {
  Deck,
  Slide,
  Shape,
  RectShape,
  EllipseShape,
  LineShape,
  PathShape,
  TextShape,
  WordArtShape,
  ImageShape,
  TableShape,
  ChartShape,
  ChartType,
  ConnectorShape,
} from './schema';

// Палитра по умолчанию для серий диаграмм (Google-подобная).
export const CHART_PALETTE = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01', '#46bdc6'];

// Пустой Deck с одним пустым слайдом 1920×1080 (16:9).
export function createEmptyDeck(title = 'Untitled Presentation'): Deck {
  const now = new Date().toISOString();
  const firstSlide = createEmptySlide();
  return {
    id: uuid(),
    title,
    format: 'gslx',
    version: 1,
    size: { w: DEFAULT_SLIDE_WIDTH, h: DEFAULT_SLIDE_HEIGHT },
    slideOrder: [firstSlide.id],
    slides: { [firstSlide.id]: firstSlide },
    guides: [],
    createdAt: now,
    modifiedAt: now,
  };
}

// Пустой слайд без layout-привязки. Background = theme (наследует от мастера).
export function createEmptySlide(): Slide {
  return {
    id: uuid(),
    shapes: [],
    background: { type: 'theme' },
  };
}

// Дубль слайда: глубокая копия со свежими id у самого слайда и всех фигур.
// (Используется в 2.25 Duplicate slide.)
export function cloneSlide(src: Slide): Slide {
  return {
    ...src,
    id: uuid(),
    shapes: src.shapes.map((sh) => ({ ...sh, id: uuid() })),
  };
}

// Базовые фабрики фигур (используются toolbar-кнопками в 2.9).

export function createRect(x = 100, y = 100, w = 320, h = 200): RectShape {
  return {
    id: uuid(),
    type: 'rect',
    x,
    y,
    w,
    h,
    fill: { kind: 'solid', color: '#4a9eff' },
    stroke: { color: '#1a73e8', width: 1 },
  };
}

export function createEllipse(x = 100, y = 100, w = 240, h = 240): EllipseShape {
  return {
    id: uuid(),
    type: 'ellipse',
    x,
    y,
    w,
    h,
    fill: { kind: 'solid', color: '#fbbc04' },
    stroke: { color: '#f29900', width: 1 },
  };
}

export function createLine(
  x = 100,
  y = 100,
  dx = 240,
  dy = 0,
  arrow = false,
): LineShape {
  // bbox должен быть достаточно «толстым», чтобы линию было удобно кликать
  // и чтобы Transformer показал видимую рамку. Минимум 20 px по обеим осям.
  const w = Math.max(20, Math.abs(dx));
  const h = Math.max(20, Math.abs(dy));
  // Точки центрируем по вертикали/горизонтали внутри bbox, чтобы линия
  // визуально лежала по средней линии хитбокса.
  const cx = w / 2;
  const cy = h / 2;
  return {
    id: uuid(),
    type: 'line',
    x,
    y,
    w,
    h,
    points: [cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2],
    stroke: { color: '#1a73e8', width: 2 },
    arrowEnd: arrow,
  };
}

export function createPath(
  x = 100,
  y = 100,
  pathData = 'M0,80 Q40,0 80,80 T160,80',
): PathShape {
  // Считаем натуральный bbox SVG-данных, чтобы Group сразу имел корректный
  // размер и Transformer обтягивал фигуру вплотную (без зазоров).
  const tmp = new Konva.Path({ data: pathData });
  const rect = tmp.getSelfRect();
  return {
    id: uuid(),
    type: 'path',
    x,
    y,
    w: Math.max(2, rect.width),
    h: Math.max(2, rect.height),
    pathData,
    stroke: { color: '#1a73e8', width: 2 },
  };
}

export function createText(
  x = 100,
  y = 100,
  w = 480,
  h = 80,
  text = 'Click to edit',
): TextShape {
  // Минимальный TipTap-документ: один параграф с одной строкой текста.
  // На пункте 2.10 enable double-click → TipTap editor.
  const tiptapDoc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
  return {
    id: uuid(),
    type: 'text',
    x,
    y,
    w,
    h,
    tiptapDoc,
    verticalAlign: 'top',
    autoFit: 'none',
  };
}

// WordArt (Phase 3.21): декоративный текст с заливкой + контуром. Размер
// фигуры подгоняем под натуральный размер текста (как pathShape, дальше
// растягивается при resize). Дефолт — крупный жирный текст с тёмным контуром.
export function createWordArt(
  x = 100,
  y = 100,
  text = 'WordArt',
  fontFamily = 'Montserrat',
  fontSize = 96,
): WordArtShape {
  const { w, h } = measureWordArt(text, fontFamily, fontSize, true, false);
  return {
    id: uuid(),
    type: 'wordart',
    x,
    y,
    w,
    h,
    text,
    fontFamily,
    fontSize,
    bold: true,
    fill: { kind: 'solid', color: '#1a73e8' },
    stroke: { color: '#0a2a66', width: 2 },
  };
}

// Универсальный «добавить фигуру в слайд» — обновляет дату модификации deck.
export function createImage(
  x: number,
  y: number,
  w: number,
  h: number,
  src: string,
  naturalW?: number,
  naturalH?: number,
): ImageShape {
  return {
    id: uuid(),
    type: 'image',
    x,
    y,
    w,
    h,
    src,
    naturalW,
    naturalH,
  };
}

// Таблица rows×cols (Phase 3.8). Колонки и строки распределены равномерно;
// все ячейки пустые. Размер фигуры задаётся вызывающим (см. вставку в тулбаре).
export function createTable(
  x: number,
  y: number,
  w: number,
  h: number,
  rows: number,
  cols: number,
): TableShape {
  const colFractions = Array.from({ length: cols }, () => 1 / cols);
  const rowFractions = Array.from({ length: rows }, () => 1 / rows);
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ text: '' })),
  );
  return { id: uuid(), type: 'table', x, y, w, h, rows, cols, colFractions, rowFractions, cells };
}

// Диаграмма с демо-данными (Phase 3.12). 2 серии × 4 категории.
export function createChart(
  x: number,
  y: number,
  w: number,
  h: number,
  chartType: ChartType = 'column',
): ChartShape {
  return {
    id: uuid(),
    type: 'chart',
    x,
    y,
    w,
    h,
    chartType,
    categories: ['Кат. 1', 'Кат. 2', 'Кат. 3', 'Кат. 4'],
    series: [
      { name: 'Серия 1', color: CHART_PALETTE[0], data: [10, 24, 16, 30] },
      { name: 'Серия 2', color: CHART_PALETTE[1], data: [18, 12, 28, 14] },
    ],
    showLegend: true,
    showGridlines: true,
  };
}

// Коннектор между двумя свободными точками (Phase 3.15). bbox = по концам.
export function createConnector(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  connectorType: ConnectorShape['connectorType'] = 'straight',
): ConnectorShape {
  return {
    id: uuid(),
    type: 'connector',
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
    connectorType,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    arrowEnd: true,
    stroke: { color: '#202124', width: 2 },
  };
}

// Freeform-кривая из карандаша (Phase 3.16): pathData в абсолютных slide-
// координатах, bbox считаем из неё. PathShapeView сам нормализует офсет.
export function createFreeform(pathData: string): PathShape {
  const rect = new Konva.Path({ data: pathData }).getSelfRect();
  return {
    id: uuid(),
    type: 'path',
    x: rect.x,
    y: rect.y,
    w: Math.max(2, rect.width),
    h: Math.max(2, rect.height),
    pathData,
    stroke: { color: '#1a73e8', width: 2 },
  };
}

// Preset-фигура из Shape library (Phase 3.20): pathData в коробке 0..100.
// Размер вставки масштабируем так, чтобы большая сторона = target, сохраняя
// пропорции natural-bbox; даём заливку + обводку (как у rect/ellipse).
export function createPreset(x = 100, y = 100, pathData: string, target = 240): PathShape {
  const rect = new Konva.Path({ data: pathData }).getSelfRect();
  const nw = Math.max(1, rect.width);
  const nh = Math.max(1, rect.height);
  const scale = target / Math.max(nw, nh);
  return {
    id: uuid(),
    type: 'path',
    x,
    y,
    w: Math.round(nw * scale),
    h: Math.round(nh * scale),
    pathData,
    fill: { kind: 'solid', color: '#4a9eff' },
    stroke: { color: '#1a73e8', width: 1 },
  };
}

export function appendShape(deck: Deck, slideId: string, shape: Shape): Deck {
  const slide = deck.slides[slideId];
  if (!slide) return deck;
  return {
    ...deck,
    modifiedAt: new Date().toISOString(),
    slides: {
      ...deck.slides,
      [slideId]: { ...slide, shapes: [...slide.shapes, shape] },
    },
  };
}
