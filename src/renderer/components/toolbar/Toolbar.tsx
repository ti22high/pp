import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import {
  appendShape,
  createRect,
  createEllipse,
  createLine,
  createPath,
  createText,
} from '@renderer/lib/model/factory';
import type { Shape } from '@renderer/lib/model/schema';

// Главный тулбар над канвасом. На Phase 2.9 — только кнопки вставки фигур;
// иконки шрифта/выравнивания добавятся, когда дойдём до TextShape (2.10/2.11),
// а align/distribute/z-order — в 2.18/2.19.
//
// После вставки фигура автоматически выделяется, чтобы пользователь сразу
// видел transformer и мог её двигать/масштабировать.

export function Toolbar() {
  const deck = useDeckStore((s) => s.deck);
  const setDeck = useDeckStore((s) => s.setDeck);
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const select = useSelectionStore((s) => s.select);

  const insert = (shape: Shape) => {
    if (!deck || !activeSlideId) return;
    setDeck(appendShape(deck, activeSlideId, shape));
    select([shape.id]);
  };

  // Координаты вставки: примерный центр слайда 1920×1080 → сдвиг под bbox фигуры.
  const center = (w: number, h: number) => ({
    x: Math.round((deck?.size.w ?? 1920) / 2 - w / 2),
    y: Math.round((deck?.size.h ?? 1080) / 2 - h / 2),
  });

  return (
    <div className="toolbar">
      <ToolbarButton
        label="Rect"
        onClick={() => {
          const c = center(320, 200);
          insert(createRect(c.x, c.y, 320, 200));
        }}
      />
      <ToolbarButton
        label="Ellipse"
        onClick={() => {
          const c = center(240, 240);
          insert(createEllipse(c.x, c.y, 240, 240));
        }}
      />
      <ToolbarButton
        label="Line"
        onClick={() => {
          const c = center(240, 20);
          insert(createLine(c.x, c.y, 240, 0));
        }}
      />
      <ToolbarButton
        label="Arrow"
        onClick={() => {
          const c = center(240, 20);
          insert(createLine(c.x, c.y, 240, 0, true));
        }}
      />
      <ToolbarButton
        label="Path"
        onClick={() => {
          const c = center(160, 40);
          insert(createPath(c.x, c.y));
        }}
      />
      <span className="toolbar-sep" />
      <ToolbarButton
        label="Text"
        onClick={() => {
          const c = center(480, 80);
          insert(createText(c.x, c.y, 480, 80, 'Click to edit'));
        }}
      />
    </div>
  );
}

function ToolbarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="toolbar-btn" onClick={onClick}>
      {label}
    </button>
  );
}
