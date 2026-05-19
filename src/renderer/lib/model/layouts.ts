// 10 встроенных layout-ов слайдов (SPEC §1.1). Layout — это набор
// плейсхолдеров (фигур с предопределёнными позициями), которые подставляются
// при применении layout-а к слайду (`applyLayout`, пункт 2.27).
//
// Координаты — в slide-units (1920×1080 по умолчанию). Пропорционально
// масштабируются под deck.size в applyLayout.

import { v4 as uuid } from 'uuid';
import type { Shape, TextShape } from './schema';
import type { ShapeId } from '@shared/types';

export type LayoutKey =
  | 'title-slide'
  | 'section-header'
  | 'title-body'
  | 'title-two-columns'
  | 'title-only'
  | 'one-column'
  | 'main-point'
  | 'big-number'
  | 'caption'
  | 'blank';

export interface LayoutDef {
  key: LayoutKey;
  label: string;
  // Фабрика placeholder-фигур для нового слайда. Размеры базируются на
  // 1920×1080; вызывающий код масштабирует под актуальный deck.size.
  build: () => Shape[];
}

const W = 1920;
const H = 1080;

// Хелпер: TextShape с заданным контентом (один параграф).
function text(
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
): TextShape {
  return {
    id: uuid() as ShapeId,
    type: 'text',
    x,
    y,
    w,
    h,
    tiptapDoc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: content }],
        },
      ],
    },
  };
}

export const LAYOUTS: LayoutDef[] = [
  {
    key: 'title-slide',
    label: 'Титульный',
    build: () => [
      text(160, 380, W - 320, 200, 'Заголовок'),
      text(160, 600, W - 320, 120, 'Подзаголовок'),
    ],
  },
  {
    key: 'section-header',
    label: 'Раздел',
    build: () => [
      text(160, 440, W - 320, 220, 'Название раздела'),
    ],
  },
  {
    key: 'title-body',
    label: 'Заголовок и текст',
    build: () => [
      text(120, 80, W - 240, 140, 'Заголовок'),
      text(120, 260, W - 240, H - 340, 'Основной текст слайда'),
    ],
  },
  {
    key: 'title-two-columns',
    label: 'Заголовок и две колонки',
    build: () => {
      const colW = (W - 360) / 2; // 120 пад, 120 пад, 120 между
      return [
        text(120, 80, W - 240, 140, 'Заголовок'),
        text(120, 260, colW, H - 340, 'Колонка 1'),
        text(120 + colW + 120, 260, colW, H - 340, 'Колонка 2'),
      ];
    },
  },
  {
    key: 'title-only',
    label: 'Только заголовок',
    build: () => [text(120, 80, W - 240, 180, 'Заголовок')],
  },
  {
    key: 'one-column',
    label: 'Один столбец',
    build: () => [text(360, 120, W - 720, H - 240, 'Текст')],
  },
  {
    key: 'main-point',
    label: 'Главная мысль',
    build: () => [text(120, 420, W - 240, 240, 'Главная мысль слайда')],
  },
  {
    key: 'big-number',
    label: 'Большое число',
    build: () => [
      text(120, 340, W - 240, 320, '42'),
      text(120, 700, W - 240, 120, 'Подпись'),
    ],
  },
  {
    key: 'caption',
    label: 'Подпись',
    build: () => [
      text(120, H - 280, W - 240, 80, 'Заголовок'),
      text(120, H - 180, W - 240, 100, 'Подпись или цитата'),
    ],
  },
  {
    key: 'blank',
    label: 'Пустой',
    build: () => [],
  },
];

export function getLayout(key: LayoutKey): LayoutDef | undefined {
  return LAYOUTS.find((l) => l.key === key);
}
