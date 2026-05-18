import { useMemo } from 'react';
import { Text } from 'react-konva';
import type { TextShape } from '@renderer/lib/model/schema';
import { useUiStore } from '@renderer/stores/ui';
import { ShapeNode } from './ShapeNode';
import { resolveShadow } from './paint';

interface TextShapeViewProps {
  shape: TextShape;
  slideId: string;
}

// Извлекаем plain-text из ProseMirror JSON (TipTap doc).
// Только узлы text + переводы строк между параграфами.
// Полный rich-text рендер живёт в DOM-оверлее (TextOverlay), а Konva.Text
// здесь — read-only превью, чтобы текст был виден до double-click.
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

export function TextShapeView({ shape, slideId }: TextShapeViewProps) {
  const editingShapeId = useUiStore((s) => s.editingShapeId);
  const setEditingShape = useUiStore((s) => s.setEditingShape);
  const plain = useMemo(() => extractPlainText(shape.tiptapDoc), [shape.tiptapDoc]);
  const shadow = resolveShadow(shape.shadow);
  const isEditing = editingShapeId === shape.id;

  // Подгоняем выравнивание по вертикали через padding-y у Konva.Text:
  // верх — 0; середина и низ — сдвиг через offsetY, но проще через y-параметр
  // самого Text-узла внутри Group (Group уже сдвинут на shape.x/y).
  // Точное вертикальное центрирование без знания высоты текста сложно сделать
  // 1-в-1 как в TipTap, поэтому пока поддерживаем только top.

  return (
    <ShapeNode
      id={shape.id}
      slideId={slideId}
      x={shape.x}
      y={shape.y}
      w={Math.max(2, shape.w)}
      h={Math.max(2, shape.h)}
      rotation={shape.rotation}
      opacity={shape.opacity}
      locked={shape.locked}
    >
      <Text
        x={0}
        y={0}
        width={shape.w}
        height={shape.h}
        text={isEditing ? '' : plain}
        fontSize={20}
        fontFamily="Roboto, Arial, sans-serif"
        fill="#202124"
        wrap="word"
        listening
        onDblClick={() => setEditingShape(shape.id)}
        onDblTap={() => setEditingShape(shape.id)}
        {...shadow}
      />
    </ShapeNode>
  );
}
