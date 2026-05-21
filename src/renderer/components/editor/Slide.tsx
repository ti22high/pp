import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { Slide as SlideModel } from '@renderer/lib/model/schema';
import { useDeckStore } from '@renderer/stores/deck';
import { RectShapeView } from './shapes/RectShapeView';
import { EllipseShapeView } from './shapes/EllipseShapeView';
import { LineShapeView } from './shapes/LineShapeView';
import { PathShapeView } from './shapes/PathShapeView';
import { TextShapeView } from './shapes/TextShapeView';
import { WordArtShapeView } from './shapes/WordArtShapeView';
import { ImageShapeView } from './shapes/ImageShapeView';
import { TableShapeView } from './shapes/TableShapeView';
import { ChartShapeView } from './shapes/ChartShapeView';
import { ConnectorShapeView } from './shapes/ConnectorShapeView';
import { useImageElement } from './shapes/useImageElement';

// Рендер одного слайда внутри Stage: фон + все фигуры в z-order.
// Каждый ShapeView сам подписан на свой кусок deckStore через id.

interface SlideProps {
  slide: SlideModel;
  width: number;
  height: number;
}

export function Slide({ slide, width, height }: SlideProps) {
  const bgColor =
    slide.background?.type === 'color' && slide.background.color
      ? slide.background.color
      : '#ffffff';
  const bgImageSrc =
    slide.background?.type === 'image' ? slide.background.src : null;
  const bgImage = useImageElement(bgImageSrc);

  // Номер слайда (§1.13). Показываем в правом нижнем углу. Skip-first
  // — стандартный UX «не нумеровать титульный слайд».
  const pageNumbers = useDeckStore((s) => s.deck?.pageNumbers);
  const slideIndex = useDeckStore((s) => s.deck?.slideOrder.indexOf(slide.id) ?? -1);
  const showNumber =
    pageNumbers?.enabled &&
    slideIndex >= 0 &&
    !(pageNumbers.skipFirst && slideIndex === 0);
  const pageLabel = showNumber ? String(slideIndex + 1) : '';

  return (
    <Group>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={bgColor}
        shadowColor="#000"
        shadowBlur={12}
        shadowOpacity={0.18}
        shadowOffset={{ x: 0, y: 2 }}
        listening={false}
      />
      {bgImage && (
        <KonvaImage
          x={0}
          y={0}
          width={width}
          height={height}
          image={bgImage}
          listening={false}
        />
      )}
      {slide.shapes.map((shape) => {
        switch (shape.type) {
          case 'rect':
            return <RectShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'ellipse':
            return <EllipseShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'line':
            return <LineShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'path':
            return <PathShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'text':
            return <TextShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'wordart':
            return <WordArtShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'image':
            return <ImageShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'table':
            return <TableShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'chart':
            return <ChartShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          case 'connector':
            return <ConnectorShapeView key={shape.id} shape={shape} slideId={slide.id} />;
          default:
            // equation/video — Phase 3+.
            return null;
        }
      })}
      {pageLabel && (
        <Text
          x={width - 80}
          y={height - 36}
          width={60}
          height={20}
          text={pageLabel}
          fontSize={16}
          fontFamily="Roboto, Arial, sans-serif"
          fill="#5f6368"
          align="right"
          listening={false}
        />
      )}
    </Group>
  );
}
