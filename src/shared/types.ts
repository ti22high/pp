// Общие типы, разделяемые между main, preload и renderer.
// Полная модель документа живёт в src/renderer/lib/model/schema.ts (zod-схемы),
// здесь — только базовые идентификаторы и payloads для IPC.

export type SlideId = string;
export type ShapeId = string;

// Payload для events меню → renderer.
export interface MenuCommandPayload {
  command: string;
}
