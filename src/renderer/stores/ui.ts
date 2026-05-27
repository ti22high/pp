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
  // Панель заметок докладчика снизу (Phase 3.23). false = свёрнута в полоску.
  showNotes: boolean;
  // id текстовой фигуры, открытой в TipTap-оверлее (null = режим просмотра).
  editingShapeId: ShapeId | null;
  // id изображения в режиме обрезки (crop). null = не обрезаем.
  croppingShapeId: ShapeId | null;
  // id фигуры, для которой открыт диалог Alt-текста (Phase 3.7). null = закрыт.
  altTextShapeId: ShapeId | null;
  // Редактируемая ячейка таблицы (Phase 3.8). null = не редактируем.
  editingTableCell: { shapeId: ShapeId; row: number; col: number } | null;
  // Выбранный прямоугольный диапазон ячеек таблицы (Phase 3.9) — для операций
  // строк/столбцов и объединения. null = ничего не выбрано.
  tableSelection: { shapeId: ShapeId; r0: number; c0: number; r1: number; c1: number } | null;
  // Открыт ли диалог форматирования ячеек таблицы (Phase 3.10).
  tableFormatOpen: boolean;
  // Режим рисования карандашом (freeform, Phase 3.16). true = тянем линию.
  penMode: boolean;
  // Режим рисования ломаной (Phase 3.17): клики добавляют вершины.
  polylineMode: boolean;
  // Режим рисования дуги (Phase 3.17): протяжка от начала к концу.
  arcMode: boolean;
  // id path-фигуры в режиме правки точек (Phase 3.17). null = не редактируем.
  editPointsShapeId: ShapeId | null;
  // id диаграммы с открытым редактором данных (Phase 3.12). null = закрыт.
  chartEditorId: ShapeId | null;
  // Распарсенные строки CSV для диалога «Вставить как таблицу» (Phase 3.11).
  // null = диалог закрыт.
  csvImportRows: string[][] | null;
  // Распарсенная книга .xlsx для диалога импорта (Phase 3.11b/3.14c). null = закрыт.
  xlsxImport: {
    fileName: string;
    sheets: { name: string; rows: string[][] }[];
    charts?: { chartType: string; categories: string[]; series: { name: string; data: number[] }[] }[];
  } | null;
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
  setTableSelection: (
    sel: { shapeId: ShapeId; r0: number; c0: number; r1: number; c1: number } | null,
  ) => void;
  setTableFormatOpen: (open: boolean) => void;
  setChartEditor: (id: ShapeId | null) => void;
  setPenMode: (on: boolean) => void;
  setPolylineMode: (on: boolean) => void;
  setArcMode: (on: boolean) => void;
  setEditPointsShape: (id: ShapeId | null) => void;
  setCsvImportRows: (rows: string[][] | null) => void;
  setXlsxImport: (
    data: {
      fileName: string;
      sheets: { name: string; rows: string[][] }[];
      charts?: { chartType: string; categories: string[]; series: { name: string; data: number[] }[] }[];
    } | null,
  ) => void;
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
  toggleNotes: () => void;
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
    showNotes: false,
    editingShapeId: null,
    croppingShapeId: null,
    altTextShapeId: null,
    editingTableCell: null,
    tableSelection: null,
    tableFormatOpen: false,
    chartEditorId: null,
    penMode: false,
    polylineMode: false,
    arcMode: false,
    editPointsShapeId: null,
    csvImportRows: null,
    xlsxImport: null,
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
    setTableSelection: (sel) =>
      set((s) => {
        s.tableSelection = sel;
      }),
    setTableFormatOpen: (open) =>
      set((s) => {
        s.tableFormatOpen = open;
      }),
    setChartEditor: (id) =>
      set((s) => {
        s.chartEditorId = id;
      }),
    setPenMode: (on) =>
      set((s) => {
        s.penMode = on;
        if (on) {
          s.polylineMode = false;
          s.arcMode = false;
        }
      }),
    setPolylineMode: (on) =>
      set((s) => {
        s.polylineMode = on;
        if (on) {
          s.penMode = false;
          s.arcMode = false;
        }
      }),
    setArcMode: (on) =>
      set((s) => {
        s.arcMode = on;
        if (on) {
          s.penMode = false;
          s.polylineMode = false;
        }
      }),
    setEditPointsShape: (id) =>
      set((s) => {
        s.editPointsShapeId = id;
      }),
    setCsvImportRows: (rows) =>
      set((s) => {
        s.csvImportRows = rows;
      }),
    setXlsxImport: (data) =>
      set((s) => {
        s.xlsxImport = data;
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
    toggleNotes: () =>
      set((s) => {
        s.showNotes = !s.showNotes;
      }),
  })),
);
