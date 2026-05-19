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
  // Space зажат → режим pan. Все фигуры становятся non-draggable, чтобы
  // клик/drag шёл в стейдж, а не в Konva native drag фигуры.
  panMode: boolean;
  setActiveSlide: (id: SlideId | null) => void;
  setEditingShape: (id: ShapeId | null) => void;
  setPanMode: (on: boolean) => void;
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
    panMode: false,
    setActiveSlide: (id) =>
      set((s) => {
        s.activeSlideId = id;
      }),
    setEditingShape: (id) =>
      set((s) => {
        s.editingShapeId = id;
      }),
    setPanMode: (on) =>
      set((s) => {
        s.panMode = on;
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
