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
  createWordArt,
  createTable,
  createChart,
  createConnector,
} from '@renderer/lib/model/factory';
import type { Shape } from '@renderer/lib/model/schema';
import type { PresetShape } from '@renderer/lib/presetShapes';
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
  const setEditingShape = useUiStore((s) => s.setEditingShape);
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

  // Вставка фигуры из библиотеки: rect/ellipse/line — нативные примитивы
  // (сохраняем семантику типа), остальные — pathShape из SVG-пресета.
  const insertPreset = (preset: PresetShape) => {
    let shape: Shape;
    if (preset.native === 'rect') {
      const c = center(320, 200);
      shape = createRect(c.x, c.y, 320, 200);
    } else if (preset.native === 'ellipse') {
      const c = center(240, 240);
      shape = createEllipse(c.x, c.y, 240, 240);
    } else if (preset.native === 'line') {
      const c = center(240, 20);
      shape = createLine(c.x, c.y, 240, 0);
    } else if (preset.native === 'arrowLine') {
      const c = center(240, 20);
      shape = createLine(c.x, c.y, 240, 0, true);
    } else {
      shape = createPreset(0, 0, preset.path);
      const c = center(shape.w, shape.h);
      shape.x = c.x;
      shape.y = c.y;
    }
    insert(shape);
  };

  return (
    <div className="toolbar">
      <span className="toolbar-shapes">
        <ToolbarButton label="Фигуры" onClick={() => setShapeLibraryOpen((v) => !v)} />
        {shapeLibraryOpen && (
          <ShapeLibrary
            onClose={() => setShapeLibraryOpen(false)}
            onPick={(preset) => {
              setShapeLibraryOpen(false);
              insertPreset(preset);
            }}
          />
        )}
      </span>
      <ToolbarButton
        label="Кривая"
        onClick={() => {
          const c = center(160, 40);
          insert(createPath(c.x, c.y));
        }}
      />
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
      <ToolbarButton
        label="WordArt"
        onClick={() => {
          const wa = createWordArt(0, 0);
          const c = center(wa.w, wa.h);
          wa.x = c.x;
          wa.y = c.y;
          insert(wa);
          // Сразу открываем инлайн-правку текста (как вставка надписи в PP).
          setEditingShape(wa.id);
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
