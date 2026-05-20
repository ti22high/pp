// Фабрики моделей: создание пустого Deck, пустого слайда и базовых фигур.
// Используется при File → New, Open Recent → fallback, и в тестах.

import { v4 as uuid } from 'uuid';
import Konva from 'konva';
import { DEFAULT_SLIDE_WIDTH, DEFAULT_SLIDE_HEIGHT } from '@shared/constants';
import type {
  Deck,
  Slide,
  Shape,
  RectShape,
  EllipseShape,
  LineShape,
  PathShape,
  TextShape,
  ImageShape,
} from './schema';

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
