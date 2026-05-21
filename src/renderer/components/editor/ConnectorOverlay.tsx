import { useState } from 'react';
import { Group, Circle } from 'react-konva';
import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { connectionPoints, resolveEndpoint, elbowHorizontalFirst } from '@renderer/lib/connector';
import type { ConnectorAnchor } from '@renderer/lib/model/schema';

interface ConnectorOverlayProps {
  slideId: string;
}

const ANCHORS: ConnectorAnchor[] = ['tl', 'tc', 'tr', 'ml', 'c', 'mr', 'bl', 'bc', 'br'];

// Ручки концов выделенного коннектора + видимые точки привязки фигур (Phase
// 3.15a). Тянешь конец → линия перестраивается; рядом с точкой фигуры конец
// магнитно прилипает и привязывается (shapeId+anchor → следует за фигурой).
export function ConnectorOverlay({ slideId }: ConnectorOverlayProps) {
  const zoom = useUiStore((s) => s.zoom);
  const selectedIds = useSelectionStore((s) => s.selectedShapeIds);
  const shapes = useDeckStore((s) => s.deck?.slides[slideId]?.shapes ?? []);
  const [dragging, setDragging] = useState<null | 'start' | 'end'>(null);

  const connector =
    selectedIds.length === 1
      ? shapes.find((s) => s.id === selectedIds[0] && s.type === 'connector')
      : undefined;
  if (!connector || connector.type !== 'connector') return null;

  const a = resolveEndpoint(connector.start, shapes);
  const b = resolveEndpoint(connector.end, shapes);
  const threshold = 12 / zoom;

  // Ищет ближайшую точку привязки среди фигур (кроме самого коннектора).
  const findSnap = (x: number, y: number): { shapeId: string; anchor: ConnectorAnchor; x: number; y: number } | null => {
    let best: { shapeId: string; anchor: ConnectorAnchor; x: number; y: number; d: number } | null = null;
    for (const sh of shapes) {
      if (sh.id === connector.id || sh.type === 'connector') continue;
      const pts = connectionPoints(sh);
      for (const anchor of ANCHORS) {
        const p = pts[anchor];
        const d = Math.hypot(p.x - x, p.y - y);
        if (d <= threshold && (!best || d < best.d)) best = { shapeId: sh.id, anchor, x: p.x, y: p.y, d };
      }
    }
    return best;
  };

  const onMove = (which: 'start' | 'end') => (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const snap = findSnap(node.x(), node.y());
    if (snap) node.position({ x: snap.x, y: snap.y });
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const sh = state.deck.slides[slideId]?.shapes.find((s) => s.id === connector.id);
      if (!sh || sh.type !== 'connector') return;
      const ep = which === 'start' ? sh.start : sh.end;
      ep.x = node.x();
      ep.y = node.y();
      ep.shapeId = snap?.shapeId;
      ep.anchor = snap?.anchor;
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  // Точки привязки всех фигур — показываем во время перетаскивания конца.
  const glue: { x: number; y: number }[] = [];
  if (dragging) {
    for (const sh of shapes) {
      if (sh.id === connector.id || sh.type === 'connector') continue;
      const pts = connectionPoints(sh);
      for (const anchor of ANCHORS) glue.push(pts[anchor]);
    }
  }

  // Мид-ручка изгиба elbow: тянем колено по перпендикулярной оси.
  let midHandle: { x: number; y: number; axis: 'x' | 'y' } | null = null;
  if (connector.connectorType === 'elbow') {
    if (elbowHorizontalFirst(a, b)) {
      const mx = connector.midX ?? (a.x + b.x) / 2;
      midHandle = { x: mx, y: (a.y + b.y) / 2, axis: 'x' };
    } else {
      const my = connector.midY ?? (a.y + b.y) / 2;
      midHandle = { x: (a.x + b.x) / 2, y: my, axis: 'y' };
    }
  }
  const onMidMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    useDeckStore.setState((state) => {
      if (!state.deck) return;
      const sh = state.deck.slides[slideId]?.shapes.find((s) => s.id === connector.id);
      if (!sh || sh.type !== 'connector') return;
      if (midHandle!.axis === 'x') sh.midX = node.x();
      else sh.midY = node.y();
      state.deck.modifiedAt = new Date().toISOString();
    });
  };

  return (
    <Group>
      {glue.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={4 / zoom}
          fill="#fff"
          stroke="#1a73e8"
          strokeWidth={1 / zoom}
          listening={false}
        />
      ))}
      {midHandle && (
        <Circle
          x={midHandle.x}
          y={midHandle.y}
          radius={5 / zoom}
          fill="#fbbc04"
          stroke="#1a73e8"
          strokeWidth={1.5 / zoom}
          draggable
          dragBoundFunc={function (this: Konva.Node, pos) {
            // Двигаем только по перпендикулярной оси колена.
            const abs = this.absolutePosition();
            return midHandle!.axis === 'x' ? { x: pos.x, y: abs.y } : { x: abs.x, y: pos.y };
          }}
          onMouseDown={(e) => {
            e.cancelBubble = true;
          }}
          onDragMove={onMidMove}
        />
      )}
      {(['start', 'end'] as const).map((which) => {
        const p = which === 'start' ? a : b;
        return (
          <Circle
            key={which}
            x={p.x}
            y={p.y}
            radius={6 / zoom}
            fill="#ffffff"
            stroke="#1a73e8"
            strokeWidth={2 / zoom}
            draggable
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragStart={() => setDragging(which)}
            onDragMove={onMove(which)}
            onDragEnd={() => setDragging(null)}
          />
        );
      })}
    </Group>
  );
}
