// Общие типы, разделяемые между main, preload и renderer.
// Полные определения с zod-валидацией — в src/renderer/lib/model/schema.ts (Phase 2.2).
// Здесь — минимально необходимое для строгой типизации сторов и IPC.

export type SlideId = string;
export type ShapeId = string;

// Полное определение Deck — в schema.ts; здесь — структурный alias.
// На Phase 2 поля будут расширяться по мере реализации пунктов.
export interface Deck {
  id: string;
  title: string;
  format: 'gslx';
  version: 1;
  size: { w: number; h: number };
  slideOrder: SlideId[];
  slides: Record<SlideId, Slide>;
  createdAt: string;
  modifiedAt: string;
}

export interface Slide {
  id: SlideId;
  layoutId?: string;
  background?: SlideBackground;
  shapes: Shape[];
  notes?: string;
  hidden?: boolean;
}

export interface SlideBackground {
  type: 'color' | 'image' | 'theme';
  color?: string;
  image?: string;
}

// На Phase 2.6+ Shape будет дискриминированным union (rect, ellipse, text, ...).
// Пока — базовый интерфейс с общими полями (SPEC §5.2 BaseShape).
export interface Shape {
  id: ShapeId;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
}
