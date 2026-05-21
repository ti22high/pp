// Утилиты WordArt (Phase 3.21): стиль шрифта и измерение натурального размера
// текста. Измерение через временный Konva.Text — те же метрики, что и при
// рендере (важно: шрифты должны быть уже загружены, см. lib/fonts.loadFonts).

import Konva from 'konva';

// Konva fontStyle: 'normal' | 'bold' | 'italic' | 'italic bold'.
export function wordArtFontStyle(bold?: boolean, italic?: boolean): string {
  const parts: string[] = [];
  if (italic) parts.push('italic');
  if (bold) parts.push('bold');
  return parts.length > 0 ? parts.join(' ') : 'normal';
}

const LINE_HEIGHT = 1.1;

// Натуральный размер строки(строк) WordArt при заданном шрифте/размере.
export function measureWordArt(
  text: string,
  fontFamily: string,
  fontSize: number,
  bold?: boolean,
  italic?: boolean,
): { w: number; h: number } {
  const node = new Konva.Text({
    text: text.length > 0 ? text : ' ',
    fontFamily,
    fontSize,
    fontStyle: wordArtFontStyle(bold, italic),
    lineHeight: LINE_HEIGHT,
  });
  return {
    w: Math.max(2, Math.ceil(node.width())),
    h: Math.max(2, Math.ceil(node.height())),
  };
}

export const WORDART_LINE_HEIGHT = LINE_HEIGHT;
