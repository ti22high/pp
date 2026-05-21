import { memo, useMemo } from 'react';
import { Text } from 'react-konva';
import Konva from 'konva';
import type { WordArtShape } from '@renderer/lib/model/schema';
import { ShapeNode } from './ShapeNode';
import { resolveFill, resolveStroke, resolveShadow } from './paint';
import { wordArtFontStyle, WORDART_LINE_HEIGHT } from '@renderer/lib/wordart';
import { useImageElement } from './useImageElement';

interface WordArtShapeViewProps {
  shape: WordArtShape;
  slideId: string;
}

// Рендер WordArt (Phase 3.21): Konva.Text с заливкой (fill) и контуром
// (stroke). Текст рисуется в натуральном размере и масштабируется под bbox
// фигуры (sx/sy) — как pathShape, поэтому resize «тянет» буквы.
// fillAfterStrokeEnabled — заливка поверх обводки (чистый контур по краю);
// strokeScaleEnabled=false — толщина контура не растёт при scale.
// memo: см. RectShapeView — мемоизация для group-drag.
export const WordArtShapeView = memo(function WordArtShapeViewBase({
  shape,
  slideId,
}: WordArtShapeViewProps) {
  const fontStyle = wordArtFontStyle(shape.bold, shape.italic);
  const natural = useMemo(() => {
    const node = new Konva.Text({
      text: shape.text.length > 0 ? shape.text : ' ',
      fontFamily: shape.fontFamily,
      fontSize: shape.fontSize,
      fontStyle,
      lineHeight: WORDART_LINE_HEIGHT,
    });
    return { w: Math.max(1, node.width()), h: Math.max(1, node.height()) };
  }, [shape.text, shape.fontFamily, shape.fontSize, fontStyle]);

  const sx = shape.w / natural.w;
  const sy = shape.h / natural.h;
  const fillImage = useImageElement(shape.fill?.kind === 'image' ? shape.fill.src : null);
  const fill = resolveFill(shape.fill, natural.w, natural.h, natural.w / 2, natural.h / 2, fillImage);
  const stroke = resolveStroke(shape.stroke);
  const shadow = resolveShadow(shape.shadow);

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
        scaleX={sx}
        scaleY={sy}
        text={shape.text}
        fontFamily={shape.fontFamily}
        fontSize={shape.fontSize}
        fontStyle={fontStyle}
        lineHeight={WORDART_LINE_HEIGHT}
        align="center"
        strokeScaleEnabled={false}
        fillAfterStrokeEnabled
        listening={false}
        {...fill}
        {...stroke}
        {...shadow}
      />
    </ShapeNode>
  );
});
