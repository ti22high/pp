import { useEffect } from 'react';
import { Group, Circle, Rect, Line } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { parsePath, serializePath, pathHandles, type Pt, type Seg } from '@renderer/lib/pathEdit';

interface PathEditOverlayProps {
  slideId: string;
}

// Правка точек path-фигуры (Phase 3.17): опорные точки (квадраты) и контрольные
// (кружки с «усами»). Тянешь — кривая изгибается. Координаты pathData мапим в
// slide через текущий transform фигуры; после правки нормализуем путь в
// абсолютные координаты + пересчитываем bbox.
export function PathEditOverlay({ slideId }: PathEditOverlayProps) {
  const zoom = useUiStore((s) => s.zoom);
  const editId = useUiStore((s) => s.editPointsShapeId);
  const setEdit = useUiStore((s) => s.setEditPointsShape);
  const shape = useDeckStore((s) => {
    if (!editId) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === editId);
    return sh?.type === 'path' ? sh : null;
  });
  useEffect(() => {
    if (!editId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEdit(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editId, setEdit]);
  if (!shape) return null;

  const segs = parsePath(shape.pathData);
  if (segs.length === 0) return null;
  const natural = new Konva.Path({ data: shape.pathData }).getSelfRect();
  const sx = shape.w / Math.max(1, natural.width);
  const sy = shape.h / Math.max(1, natural.height);
  const toSlide = (p: Pt): Pt => ({
    x: shape.x + (p.x - natural.x) * sx,
    y: shape.y + (p.y - natural.y) * sy,
  });

  const handles = pathHandles(segs);

  const commit = (hIndex: number, nx: number, ny: number) => {
    // Все точки → slide, заменяем перетаскиваемую, сериализуем абсолютно.
    const slideSegs: Seg[] = segs.map((s) => ({
      cmd: s.cmd,
      control: s.control ? toSlide(s.control) : undefined,
      end: toSlide(s.end),
    }));
    const h = handles[hIndex];
    if (h.kind === 'control' && slideSegs[h.segIndex].control) {
      slideSegs[h.segIndex].control = { x: nx, y: ny };
    } else {
      slideSegs[h.segIndex].end = { x: nx, y: ny };
    }
    const data = serializePath(slideSegs);
    const bbox = new Konva.Path({ data }).getSelfRect();
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const sh = state.deck.slides[slideId]?.shapes.find((x) => x.id === shape.id);
      if (!sh || sh.type !== 'path') return;
      sh.pathData = data;
      sh.x = bbox.x;
      sh.y = bbox.y;
      sh.w = Math.max(2, bbox.width);
      sh.h = Math.max(2, bbox.height);
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  // «Усы»: линия от опорной точки сегмента к его контрольной точке.
  const whiskers: Pt[][] = [];
  segs.forEach((s, i) => {
    if (s.cmd === 'Q' && s.control) {
      const start = i > 0 ? segs[i - 1].end : s.end;
      whiskers.push([toSlide(start), toSlide(s.control)]);
      whiskers.push([toSlide(s.control), toSlide(s.end)]);
    }
  });

  const r = 5 / zoom;
  return (
    <Group>
      {whiskers.map((w, i) => (
        <Line key={`w${i}`} points={[w[0].x, w[0].y, w[1].x, w[1].y]} stroke="#1a73e8" strokeWidth={1 / zoom} dash={[4 / zoom, 3 / zoom]} listening={false} />
      ))}
      {handles.map((h, i) => {
        const p = toSlide({ x: h.x, y: h.y });
        const onDrag = (e: KonvaEventObject<DragEvent>) => commit(i, e.target.x(), e.target.y());
        return h.kind === 'control' ? (
          <Circle key={i} x={p.x} y={p.y} radius={r} fill="#fbbc04" stroke="#1a73e8" strokeWidth={1 / zoom} draggable onMouseDown={(e) => { e.cancelBubble = true; }} onDragMove={onDrag} />
        ) : (
          <Rect key={i} x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} fill="#fff" stroke="#1a73e8" strokeWidth={1.5 / zoom} draggable onMouseDown={(e) => { e.cancelBubble = true; }} onDragMove={(e) => commit(i, e.target.x() + r, e.target.y() + r)} />
        );
      })}
    </Group>
  );
}
