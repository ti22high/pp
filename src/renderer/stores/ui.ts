import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SlideId, ShapeId } from '@shared/types';

// UI-стор: zoom стейджа, активный слайд, видимость панелей и переключатели View.
// Не имеет отношения к данным документа — переживёт open/close файла.

interface UiState {
  activeSlideId: SlideId | null;
  zoom: number; // множитель масштаба стейджа, 1.0 = 100 %.
  stagePan: { x: number; y: number }; // смещение стейджа (Space+drag в 2.5)
  showRuler: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  showFilmstrip: boolean;
  showInspector: boolean;
  // id текстовой фигуры, открытой в TipTap-оверлее (null = режим просмотра).
  editingShapeId: ShapeId | null;
  // id изображения в режиме обрезки (crop). null = не обрезаем.
  croppingShapeId: ShapeId | null;
  // id фигуры, для которой открыт диалог Alt-текста (Phase 3.7). null = закрыт.
  altTextShapeId: ShapeId | null;
  // Редактируемая ячейка таблицы (Phase 3.8). null = не редактируем.
  editingTableCell: { shapeId: ShapeId; row: number; col: number } | null;
  // Глобально показывать alt-текст при наведении на фигуру (Phase 3.7).
  showAltOnHover: boolean;
  // id фигуры под курсором, у которой есть alt-текст (для оверлея-подсказки).
  hoveredAltShapeId: ShapeId | null;
  // Зажат пробел → режим панорамирования холста. Фигуры в это время не
  // перетаскиваются (Konva native drag отключается), чтобы Space+drag по
  // фигуре панорамировал, а не двигал её.
  spaceHeld: boolean;
  setActiveSlide: (id: SlideId | null) => void;
  setEditingShape: (id: ShapeId | null) => void;
  setCroppingShape: (id: ShapeId | null) => void;
  setAltTextShape: (id: ShapeId | null) => void;
  setEditingTableCell: (cell: { shapeId: ShapeId; row: number; col: number } | null) => void;
  toggleAltOnHover: () => void;
  setHoveredAltShape: (id: ShapeId | null) => void;
  setSpaceHeld: (held: boolean) => void;
  setZoom: (zoom: number) => void;
  setStagePan: (pan: { x: number; y: number }) => void;
  toggleRuler: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleFilmstrip: () => void;
  toggleInspector: () => void;
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    activeSlideId: null,
    zoom: 1,
    stagePan: { x: 0, y: 0 },
    showRuler: true,
    showGrid: false,
    snapToGrid: false,
    showFilmstrip: true,
    showInspector: true,
    editingShapeId: null,
    croppingShapeId: null,
    altTextShapeId: null,
    editingTableCell: null,
    showAltOnHover: false,
    hoveredAltShapeId: null,
    spaceHeld: false,
    setActiveSlide: (id) =>
      set((s) => {
        s.activeSlideId = id;
      }),
    setEditingShape: (id) =>
      set((s) => {
        s.editingShapeId = id;
      }),
    setCroppingShape: (id) =>
      set((s) => {
        s.croppingShapeId = id;
      }),
    setAltTextShape: (id) =>
      set((s) => {
        s.altTextShapeId = id;
      }),
    setEditingTableCell: (cell) =>
      set((s) => {
        s.editingTableCell = cell;
      }),
    toggleAltOnHover: () =>
      set((s) => {
        s.showAltOnHover = !s.showAltOnHover;
        if (!s.showAltOnHover) s.hoveredAltShapeId = null;
      }),
    setHoveredAltShape: (id) =>
      set((s) => {
        s.hoveredAltShapeId = id;
      }),
    setSpaceHeld: (held) =>
      set((s) => {
        s.spaceHeld = held;
      }),
    setZoom: (zoom) =>
      set((s) => {
        s.zoom = Math.max(0.1, Math.min(8, zoom));
      }),
    setStagePan: (pan) =>
      set((s) => {
        s.stagePan = pan;
      }),
    toggleRuler: () =>
      set((s) => {
        s.showRuler = !s.showRuler;
      }),
    toggleGrid: () =>
      set((s) => {
        s.showGrid = !s.showGrid;
      }),
    toggleSnapToGrid: () =>
      set((s) => {
        s.snapToGrid = !s.snapToGrid;
      }),
    toggleFilmstrip: () =>
      set((s) => {
        s.showFilmstrip = !s.showFilmstrip;
      }),
    toggleInspector: () =>
      set((s) => {
        s.showInspector = !s.showInspector;
      }),
  })),
);
