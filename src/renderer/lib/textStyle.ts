// Извлечение «единого» стиля текста из tiptapDoc для Konva-превью.
// Konva.Text одностилевой, поэтому для статичного рендера берём стиль первого
// text-run (шрифт/размер/цвет/жирный/курсив/подчёркивание) и выравнивание
// первого параграфа. Это точно для равномерно отформатированного блока (частый
// случай); смешанное форматирование рендерится по первому run — точный rich-
// рендер живёт в DOM-оверлее при правке (TextOverlay).

export interface TextRenderStyle {
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontStyle: string; // Konva: 'normal' | 'bold' | 'italic' | 'italic bold'
  textDecoration: string; // '' | 'underline'
  align: 'left' | 'center' | 'right' | 'justify';
}

export const DEFAULT_TEXT_STYLE: TextRenderStyle = {
  fontFamily: 'Roboto',
  fontSize: 20,
  fill: '#202124',
  fontStyle: 'normal',
  textDecoration: '',
  align: 'left',
};

interface PmNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: PmNode[];
}

// Первый параграф (для выравнивания) и первый text-узел (для марок).
function firstParagraph(doc: PmNode): PmNode | null {
  if (!Array.isArray(doc.content)) return null;
  return doc.content.find((n) => n.type === 'paragraph' || n.type === 'heading') ?? null;
}
function firstTextNode(node: PmNode | null): PmNode | null {
  if (!node) return null;
  if (node.type === 'text' && typeof node.text === 'string') return node;
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const found = firstTextNode(child);
      if (found) return found;
    }
  }
  return null;
}

// "28px" | "28" | 28 → 28. Некорректное → undefined.
function parsePx(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function extractTextStyle(doc: unknown): TextRenderStyle {
  const style: TextRenderStyle = { ...DEFAULT_TEXT_STYLE };
  if (!doc || typeof doc !== 'object') return style;
  const root = doc as PmNode;

  const para = firstParagraph(root);
  const align = para?.attrs?.textAlign;
  if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') {
    style.align = align;
  }

  const textNode = firstTextNode(para) ?? firstTextNode(root);
  if (!textNode?.marks) return style;

  let bold = false;
  let italic = false;
  for (const mark of textNode.marks) {
    if (mark.type === 'bold') bold = true;
    else if (mark.type === 'italic') italic = true;
    else if (mark.type === 'underline') style.textDecoration = 'underline';
    else if (mark.type === 'textStyle' && mark.attrs) {
      const { fontFamily, fontSize, color } = mark.attrs;
      if (typeof fontFamily === 'string' && fontFamily) style.fontFamily = fontFamily;
      const size = parsePx(fontSize);
      if (size && size > 0) style.fontSize = size;
      if (typeof color === 'string' && color) style.fill = color;
    }
  }
  style.fontStyle = [italic ? 'italic' : '', bold ? 'bold' : ''].filter(Boolean).join(' ') || 'normal';
  return style;
}
