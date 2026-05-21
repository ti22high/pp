import { useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import {
  appendShape,
  createRect,
  createEllipse,
  createLine,
  createPath,
  createPreset,
  createText,
  createTable,
  createChart,
  createConnector,
} from '@renderer/lib/model/factory';
import type { Shape } from '@renderer/lib/model/schema';
import { openImageFileDialog } from '@renderer/lib/insertImage';
import { TablePicker } from './TablePicker';
import { ShapeLibrary } from './ShapeLibrary';

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
  const penMode = useUiStore((s) => s.penMode);
  const setPenMode = useUiStore((s) => s.setPenMode);
  const polylineMode = useUiStore((s) => s.polylineMode);
  const setPolylineMode = useUiStore((s) => s.setPolylineMode);
  const arcMode = useUiStore((s) => s.arcMode);
  const setArcMode = useUiStore((s) => s.setArcMode);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [shapeLibraryOpen, setShapeLibraryOpen] = useState(false);

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
        label="Прямоугольник"
        onClick={() => {
          const c = center(320, 200);
          insert(createRect(c.x, c.y, 320, 200));
        }}
      />
      <ToolbarButton
        label="Эллипс"
        onClick={() => {
          const c = center(240, 240);
          insert(createEllipse(c.x, c.y, 240, 240));
        }}
      />
      <ToolbarButton
        label="Линия"
        onClick={() => {
          const c = center(240, 20);
          insert(createLine(c.x, c.y, 240, 0));
        }}
      />
      <ToolbarButton
        label="Стрелка"
        onClick={() => {
          const c = center(240, 20);
          insert(createLine(c.x, c.y, 240, 0, true));
        }}
      />
      <ToolbarButton
        label="Кривая"
        onClick={() => {
          const c = center(160, 40);
          insert(createPath(c.x, c.y));
        }}
      />
      <span className="toolbar-shapes">
        <ToolbarButton label="Фигуры" onClick={() => setShapeLibraryOpen((v) => !v)} />
        {shapeLibraryOpen && (
          <ShapeLibrary
            onClose={() => setShapeLibraryOpen(false)}
            onPick={(path) => {
              setShapeLibraryOpen(false);
              const shape = createPreset(0, 0, path);
              const c = center(shape.w, shape.h);
              shape.x = c.x;
              shape.y = c.y;
              insert(shape);
            }}
          />
        )}
      </span>
      <ToolbarButton
        label="Коннектор"
        onClick={() => {
          const cx = (deck?.size.w ?? 1920) / 2;
          const cy = (deck?.size.h ?? 1080) / 2;
          insert(createConnector(cx - 150, cy, cx + 150, cy, 'elbow'));
        }}
      />
      <button
        type="button"
        className={`toolbar-btn${penMode ? ' toolbar-btn--active' : ''}`}
        onClick={() => setPenMode(!penMode)}
      >
        Карандаш
      </button>
      <button
        type="button"
        className={`toolbar-btn${polylineMode ? ' toolbar-btn--active' : ''}`}
        onClick={() => setPolylineMode(!polylineMode)}
      >
        Ломаная
      </button>
      <button
        type="button"
        className={`toolbar-btn${arcMode ? ' toolbar-btn--active' : ''}`}
        onClick={() => setArcMode(!arcMode)}
      >
        Дуга
      </button>
      <span className="toolbar-sep" />
      <ToolbarButton
        label="Текст"
        onClick={() => {
          const c = center(480, 80);
          insert(createText(c.x, c.y, 480, 80, 'Введите текст'));
        }}
      />
      <span className="toolbar-sep" />
      <ToolbarButton label="Изображение" onClick={openImageFileDialog} />
      <span className="toolbar-table">
        <ToolbarButton label="Таблица" onClick={() => setTablePickerOpen((v) => !v)} />
        {tablePickerOpen && (
          <TablePicker
            onClose={() => setTablePickerOpen(false)}
            onPick={(rows, cols) => {
              setTablePickerOpen(false);
              const slideW = deck?.size.w ?? 1920;
              const slideH = deck?.size.h ?? 1080;
              // Желаемый размер ячейки, с зажимом всей таблицы в 0.85 слайда.
              const w = Math.min(cols * 220, slideW * 0.85);
              const h = Math.min(rows * 72, slideH * 0.85);
              const c = center(w, h);
              insert(createTable(c.x, c.y, w, h, rows, cols));
            }}
          />
        )}
      </span>
      <ToolbarButton
        label="Диаграмма"
        onClick={() => {
          const c = center(640, 400);
          insert(createChart(c.x, c.y, 640, 400));
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
