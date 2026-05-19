import { useMemo } from 'react';
import { Text } from 'react-konva';
import { useUiStore } from '@renderer/stores/ui';

interface ShapeTextLabelProps {
  shapeId: string;
  tiptapDoc: unknown;
  w: number;
  h: number;
}

// Plain-text оверлей внутри rect/ellipse/path-фигуры — показывает текст
// фигуры (shape.text) в режиме просмотра. В режиме редактирования
// (editingShapeId === shapeId) скрывается, потому что DOM-overlay TipTap
// рисует то же содержимое сверху. Полный rich-text — в TipTap при double-click.
export function ShapeTextLabel({ shapeId, tiptapDoc, w, h }: ShapeTextLabelProps) {
  const editingShapeId = useUiStore((s) => s.editingShapeId);
  const plain = useMemo(() => extractPlainText(tiptapDoc), [tiptapDoc]);
  if (editingShapeId === shapeId) return null;
  if (!plain) return null;
  return (
    <Text
      x={0}
      y={0}
      width={w}
      height={h}
      text={plain}
      fontSize={20}
      fontFamily="Roboto, Arial, sans-serif"
      fill="#202124"
      align="center"
      verticalAlign="middle"
      wrap="word"
      listening={false}
    />
  );
}

function extractPlainText(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') {
      out.push(n.text);
      return;
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
      if (n.type === 'paragraph' || n.type === 'heading') out.push('\n');
    }
  };
  walk(doc);
  return out.join('').replace(/\n$/, '');
}
