# Технический документ: Offline-клон Google Slides для Windows (.exe)

> **Назначение документа.** Этот файл — полная техническая спецификация и пошаговый план для Claude Code, чтобы автономно разработать Windows-приложение `.exe` — полнофункциональный offline-клон Google Slides. Документ самодостаточен: Claude Code должен идти по нему линейно, без уточняющих вопросов у пользователя.
>
> **Целевая платформа:** Windows 10/11 x64 (опционально arm64).
> **Стек:** Electron 42 + React 19 + TypeScript 6 + Konva 10 + TipTap 3 + Zustand 5 + Immer 10 + PptxGenJS 4 + KaTeX 0.16 + nspell.
> **Язык интерфейса приложения:** русский + английский. Язык кода — английский, комментарии в коде — на русском.
> **Лицензионная модель:** все библиотеки в стеке — MIT/Apache-2.0/BSD; запрещено использовать AGPL-зависимости (OnlyOffice, PPTist) и tldraw 4.x (платная лицензия).

---

## 0. TL;DR для Claude Code

1. Создай проект `slides-clone/` со структурой из §8.
2. Установи зависимости из §9 (точные версии).
3. Реализуй фазы 1–8 по roadmap (§11) и TODO-листу (§12), коммить после каждой подзадачи.
4. Тестируй: Vitest для модулей, Playwright (Electron-launcher) для E2E.
5. Финальный билд: `npm run build:win` → NSIS-установщик `.exe`.
6. Если что-то ломается — см. секцию Troubleshooting (§14).
7. Полный аудит того, что **не реализуется** (по сравнению с Google Slides) — §15.

---

## 1. Полный аудит функций Google Slides (2026), которые реализуем

### 1.1. Управление слайдами
- Создание, дублирование, удаление, переупорядочивание (drag в filmstrip), скрытие («Skip slide»).
- Layouts: Title slide, Section header, Title and body, Title and two columns, Title only, One column text, Main point, Big number, Caption, Blank.
- Master slides (Slide → Edit theme): редактирование мастера и каждого layout, шрифты, цвета, фон, плейсхолдеры.
- Темы: галерея встроенных тем, импорт темы из `.pptx`.
- Фон слайда: цвет / изображение / сброс к теме.
- Размер слайда: 4:3, 16:9, 16:10, кастом в дюймах/см/pt/px.

### 1.2. Текст
- Шрифты — bundled набор (см. §5.8): Roboto, Open Sans, Lato, Montserrat, PT Sans, PT Serif, Roboto Slab, Roboto Mono, Source Sans 3, Noto Sans/Serif, Inter, Playfair Display, Merriweather, Oswald, Raleway, Poppins, Caveat, Pacifico, JetBrains Mono. Все — с кириллическими сабсетами.
- Размер 1–400 pt, шаг произвольный.
- B / I / U / Strikethrough, sub/superscript.
- Цвет текста, highlight (background).
- Выравнивание: left/center/right/justify; вертикальное (top/middle/bottom) для текстового блока.
- Межстрочный интервал: single/1.15/1.5/double/custom; before/after параграфа.
- Списки: маркированные (●, ○, ■, кастом via Special chars), нумерованные (1, A, a, I, i), вложенность до 8 уровней; Tab/Shift+Tab.
- Indentation: left/right/first-line через ruler.
- LTR/RTL.
- Hyperlinks: URL, на слайд, на закладку, email.
- Format painter, Clear formatting (Ctrl+\).
- Word Art (базовый: outline+fill).

### 1.3. Фигуры
- Все ECMA-376 `ST_ShapeType` (~187 пресетов): базовые, стрелки, callouts, equation shapes, flowchart, stars & banners. Полный список — см. отчёт OOXML (PptxGenJS экспортирует `pres.ShapeType.*`).
- Линии, стрелки, elbow/curved connectors с auto-snap к точкам соединения, scribble (свободное перо), polyline, arc.
- Group/Ungroup (Ctrl+Alt+G / Ctrl+Alt+Shift+G).
- Align (L/C/R/T/M/B), Distribute (H/V), Center on page.
- Rotate 90° CW/CCW, Flip H/V, free rotate, custom angle.
- Z-order (Bring to front/forward, Send to back/backward).
- Fill: solid, gradient (linear/radial multi-stop), image fill, transparent.
- Border: цвет, weight 1–24, dash patterns.
- Shadow (drop), Reflection.

### 1.4. Изображения
- Insert: upload, URL, drag-n-drop. (Без Drive/Photos/web search — offline.)
- Crop (rect), Mask / Crop-to-shape (любая фигура из галереи).
- Border, Recolor (sepia, grayscale, theme tints), Transparency, Brightness, Contrast, Reset, Replace image, Alt text.
- Поддерживаемые форматы: PNG, JPG, GIF (anim), SVG, WEBP.

### 1.5. Таблицы
- Insert N×M (до 20×20 первоначально, далее расширяемо).
- Add/Delete row/col, Merge/Unmerge, Distribute rows/cols evenly.
- Cell background, border per cell, padding, H+V align.
- Import из CSV (через drag-n-drop CSV-файла в редактор → диалог «Insert as table»).

### 1.6. Диаграммы
- Bar, Column, Line, Area, Pie, Scatter (6 типов, как в Slides).
- Редактирование данных в встроенной таблице (мини-таблица в боковой панели; данные хранятся в `.gslx` как JSON).
- Кастомные цвета, легенда, заголовки осей, gridlines.

### 1.7. Видео и аудио
- Insert: только из локального файла (offline). Форматы: MP4 (H.264/AAC), WebM (VP9/Opus), MP3, WAV, M4A.
- Playback options: autoplay, mute, start/end time (trim), loop, hide icon, volume.
- Видео и аудио позиционируются как HTML5-overlay над Konva (см. §6.5).

### 1.8. Анимации
- 15 базовых, как в Google Slides (Appear, Fade in/out, Fly in/out from L/R/T/B, Zoom in/out, Spin in/out, Disappear, Pulse, Grow/shrink, Spin emphasis).
- Trigger: On click / After previous / With previous.
- Duration: 0.1–5.0 с.
- By paragraph (для текстовых блоков).
- Animation pane: drag-reorder, multiple animations per object.
- **Motion paths — НЕ реализуем** (как и в Slides; см. §15).

### 1.9. Переходы между слайдами
- 8 типов: None, Fade, Slide from right, Slide from left, Flip, Cube, Gallery, Dissolve.
- Длительность slow ↔ fast. Apply to all.

### 1.10. Спикерские заметки, Presenter View
- Speaker notes panel снизу.
- Presenter View — отдельное окно Electron на втором мониторе: текущий слайд + заметки + превью следующего + таймер (count-up, pause, reset).
- Laser pointer (hold mouse), keyboard nav.

### 1.11. Word Art, спецсимволы, формулы
- Word Art: текст с fill+outline+font (как в Slides).
- Special characters: Unicode picker (Math, Symbols, Emoji, Latin/Cyrillic), поиск по имени.
- **LaTeX-формулы — ДОБАВЛЯЕМ (расширение поверх Slides)** через KaTeX: `Insert → Equation` (вводится LaTeX, рендерится KaTeX-overlay поверх Konva).

### 1.12. Линейки, направляющие, сетка
- Ruler (top + left), Guides (add H/V, edit position, clear), Grid (snap to grid), Snap to other objects (smart guides).

### 1.13. Номера слайдов, header/footer, дата
- Slide numbers: on/off, skip title slides, apply to selected.
- Header/Footer: через master slide (текстовые блоки-плейсхолдеры, как в Slides).
- Date insertion: auto-update placeholder.

### 1.14. Гиперссылки и закладки
- На URL, на слайд (по индексу/имени/next/prev/first/last), на email, **на закладку внутри слайда** (расширение).

### 1.15. Импорт / Экспорт
| Формат | Импорт | Экспорт | Реализация |
|---|---|---|---|
| `.pptx` | ✅ (lossy ~75-85%) | ✅ | fast-xml-parser + JSZip / PptxGenJS |
| `.gslx` (native) | ✅ | ✅ | JSZip + JSON |
| `.pdf` | ❌ | ✅ | `webContents.printToPDF` |
| `.odp` | ❌ | ❌ | — (см. §15) |
| `.png` / `.jpeg` per slide | ❌ | ✅ | Konva `stage.toDataURL` |
| `.svg` per slide | ❌ | ✅ | Konva `stage.toJSON` → SVG converter |
| `.txt` outline | ❌ | ✅ | walk slide model |
| `.csv` (для таблиц) | ✅ | ❌ | drag-n-drop |

### 1.16. Темы и шаблоны
- Theme builder, color palette (6 accent + 2 text + 2 bg), font set (heading + body).
- Template gallery — 10–20 встроенных шаблонов как `.gslx`-файлы в `resources/templates/`.
- Import theme из другого файла (`.pptx` или `.gslx`).

### 1.17. История версий (локальная)
- Snapshot каждые 5 минут активной работы + при manual save.
- Хранение в `userData/<projectId>/history/<timestamp>.json.gz` (gzip + JSON-patch diff от предыдущего).
- UI: File → Version history → list snapshots → restore / preview / name version.

### 1.18. Find & Replace, Spell check
- Find & Replace (Ctrl+H): match case, regex.
- Spell check (Ctrl+Alt+X): offline через nspell + dictionary-en-us + dictionary-ru, в Web Worker, ProseMirror Decorations underline в TipTap.
- Personal dictionary в SQLite.

### 1.19. Комментарии (локальные)
- Insert → Comment (Ctrl+Alt+M) — threaded, привязка к объекту/слайду.
- Хранение в `comments.json` внутри `.gslx`.

### 1.20. Автосейв и crash recovery
- Debounced autosave каждые 5 с после изменения + жёсткий save каждые 30 с.
- Crash recovery dialog при запуске (sentinel-file pattern).

---

## 2. OOXML / .pptx — что нужно знать

Полная структура zip-архива `.pptx` (OPC, ISO 29500-2):

```
mypres.pptx (zip)
├── [Content_Types].xml
├── _rels/.rels
├── docProps/{app,core,custom}.xml
└── ppt/
    ├── presentation.xml          ← корневой
    ├── presProps.xml, viewProps.xml, tableStyles.xml
    ├── _rels/presentation.xml.rels
    ├── slides/slideN.xml + _rels/
    ├── slideLayouts/slideLayoutN.xml + _rels/
    ├── slideMasters/slideMasterN.xml + _rels/
    ├── notesSlides/, notesMasters/, handoutMasters/
    ├── theme/themeN.xml
    ├── media/                    ← imageN.png, videoN.mp4 …
    ├── embeddings/               ← xlsx для чартов
    ├── charts/chartN.xml + _rels/
    ├── comments/, commentAuthors.xml
    └── customXml/
```

**Ключевые элементы:** `p:sld → p:cSld → p:spTree → {p:sp | p:pic | p:cxnSp | p:graphicFrame | p:grpSp}`, текст в `p:txBody → a:p → a:r` с `a:rPr` (формат рана). Анимации — `p:timing` (SMIL-подобное дерево). Темы — `theme1.xml` с `a:clrScheme`, `a:fontScheme`, `a:fmtScheme`.

**Конвертация координат:**
- EMU → px: `px = EMU / 9525` (при 96 DPI).
- Размер шрифта: `pt = sz/100` (в `a:rPr sz="2400"` это 24pt).

**Namespaces:** `p:` = presentationml, `a:` = drawingml, `r:` = relationships, `c:` = chart.

---

## 3. Анализ open-source альтернатив — вердикты

| Проект | Лицензия | Вердикт |
|---|---|---|
| **LibreOffice Impress** | MPL-2.0 | ❌ Не встраиваем. Опционально — sidecar `soffice --headless --convert-to pdf` для fallback-конверсии сложных `.pptx`. |
| **OnlyOffice DocServer** | AGPL-3.0 | ❌ AGPL = «заражение» закрытого кода. Избегать. |
| **Reveal.js** | MIT | ⚠️ Не используем как основной runtime (своя реализация presenter mode на React). Изучить для inspiration. |
| **Spectacle** | MIT | ⚠️ Inspiration only — модель React-deck. |
| **Impress.js** | MIT | ❌ Не подходит. |
| **PptxGenJS** | MIT | ✅ **USE-AS-COMPONENT** — экспорт `.pptx`. |
| **officegen** | MIT, заброшен | ❌ Не использовать. |
| **pptxtojson** (pipipi-pikachu) | MIT | ⚠️ Опционально как baseline для импорта; **основной парсер — свой** на fast-xml-parser. |
| **pptx-automizer** | MIT | ⚠️ Опционально для template-based export. |
| **SheetJS CE** | Apache-2.0 | ✅ Импорт CSV/XLSX для данных диаграмм. |
| **Fabric.js v7** | MIT | ⚠️ Альтернатива Konva; сильнее в on-canvas text editing. **Не используем** — выбираем Konva из-за лучшей React-интеграции. |
| **Konva.js** | MIT | ✅ **PRIMARY** — canvas-движок. |
| **tldraw 4.x** | Proprietary | ❌ Платная лицензия в продакшене. Запрещено. |
| **Excalidraw** | MIT | ⚠️ Inspiration only. |
| **Penpot** | MPL-2.0 (ClojureScript) | ❌ Несовместимый стек. |
| **PPTist** | AGPL-3.0 (Vue) | ❌ AGPL + Vue. Только inspiration. |
| **drawio-desktop** | Apache-2.0 | ✅ **Эталон архитектуры** offline Electron-приложения. Изучить CSP и установщик. |
| **TipTap** | MIT | ✅ **PRIMARY** — rich text. |
| **Lexical / Slate / Quill** | MIT/BSD | ⚠️ Альтернативы TipTap, не используем. |
| **KaTeX** | MIT | ✅ Формулы. |
| **GSAP 3.13** | Free commercial с апр. 2025 | ✅ Анимации. |

---

## 4. Технический стек — обоснование

### 4.1. Платформа: **Electron 42** (а не Tauri / Wails)
- Tim знает JS/Python — Rust в Tauri = новый язык.
- Нужны native-модули (`better-sqlite3`, опционально `nodehun`) — first-class в Electron, мучительно в Tauri.
- `webContents.printToPDF` встроен — бесплатный высококачественный PDF-экспорт.
- Multi-window для presenter mode — тривиально через `BrowserWindow`.
- Размер инсталлятора ~120 МБ — приемлемо.

### 4.2. UI: **React 19.2 + TypeScript 6.0**
- React Compiler стабилен в 19.x — авто-мемоизация без `useMemo`/`useCallback`.
- Лучшая экосистема для редакторов: `@tiptap/react`, `react-konva`, `react-katex`, `react-virtuoso`.
- TS 6.0 strict by default.

### 4.3. Рендеринг: **Konva 10.3 + react-konva 19.2 + HTML-overlay для текста**
- Каждый слайд = `Stage` 1920×1080 + слои (background, content, selection, guides).
- Текст: вне фокуса — Konva `Text`; в фокусе — TipTap в абсолютно позиционированном `<div>` поверх канваса.
- Видео и формулы — HTML-overlay над Konva (transform: scale при зуме стейджа).

### 4.4. Rich text: **TipTap 3.23** (ProseMirror)
- Расширения: StarterKit, TextStyle, Color, FontFamily, FontSize, LineHeight, BulletList, OrderedList, Link, Highlight, Underline, Subscript, Superscript.

### 4.5. State: **Zustand 5.0 + immer middleware**
- Сторы: `deckStore`, `uiStore`, `selectionStore`, `clipboardStore`, `historyStore`.

### 4.6. Undo/Redo: **Immer `produceWithPatches` + bounded stack (100 записей)**
- Coalescing: текстовый ввод объединяется при `now - last.ts < 500 ms`.
- Хранятся `patches` + `inversePatches` для каждой записи.

### 4.7. Хранилище:
- **Документ:** свой ZIP-формат `.gslx` (см. §5.14) — мирра OOXML, упрощает экспорт в `.pptx`.
- **App data:** `better-sqlite3 12.10` (recents, preferences, personal dictionary).

### 4.8. .pptx I/O:
- **Экспорт:** PptxGenJS 4.0.1.
- **Импорт:** свой парсер на `jszip 3.10` + `fast-xml-parser 5.8` (preserveOrder, `isArray` для повторяемых элементов).

### 4.9. PDF: **`webContents.printToPDF`** в hidden BrowserWindow.

### 4.10. Spell check: **nspell 2.1.5 + dictionary-en-us 3.0 + dictionary-ru 3.0** в Web Worker.

### 4.11. Формулы: **KaTeX 0.16.46** + bundled `.woff2` шрифты.

### 4.12. Анимации: **GSAP 3.13** (free commercial с апр. 2025) для timeline; fallback `Konva.Tween`.

### 4.13. Билд: **electron-builder 26.8 + NSIS**; code signing — Azure Trusted Signing ($9.99/мес) опционально.

### 4.14. Тесты: **Vitest 4.1 + Playwright 1.60** (Electron-launcher).

---

## 5. Архитектура приложения

### 5.1. Главные модули

```
src/
├── main/                      # Electron main process
│   ├── index.ts               # bootstrap, app lifecycle
│   ├── windows.ts             # createMainWindow, createPresenterWindow
│   ├── ipc/                   # IPC handlers
│   │   ├── file.ts            # open/save/saveAs, dialogs
│   │   ├── media.ts           # save/load media files
│   │   ├── export.ts          # pdf, pptx, png
│   │   ├── recent.ts          # recent files
│   │   └── recovery.ts        # crash recovery, autosave
│   ├── protocol.ts            # custom app:// protocol
│   ├── menu.ts                # native menu
│   └── store.ts               # better-sqlite3 wrapper
│
├── preload/
│   ├── index.ts               # contextBridge.exposeInMainWorld('api', …)
│   └── types.ts
│
├── renderer/                  # React UI
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── editor/            # main editor view
│   │   │   ├── Canvas.tsx     # Konva Stage host
│   │   │   ├── Slide.tsx      # single slide renderer
│   │   │   ├── shapes/        # Rect, Ellipse, Path, …
│   │   │   ├── TextEditor.tsx # TipTap overlay
│   │   │   ├── MediaOverlay.tsx
│   │   │   ├── EquationOverlay.tsx
│   │   │   ├── SelectionFrame.tsx
│   │   │   ├── SmartGuides.tsx
│   │   │   └── Rulers.tsx
│   │   ├── filmstrip/         # slide thumbnails sidebar
│   │   ├── toolbar/
│   │   ├── panels/            # right-side property panels
│   │   ├── dialogs/           # modal dialogs
│   │   ├── presenter/         # presenter window UI
│   │   └── theme-editor/
│   ├── hooks/
│   ├── stores/                # zustand stores
│   │   ├── deck.ts
│   │   ├── ui.ts
│   │   ├── selection.ts
│   │   ├── history.ts
│   │   └── clipboard.ts
│   ├── lib/
│   │   ├── model/             # data model + zod schemas
│   │   ├── pptx/              # import/export
│   │   │   ├── parser/
│   │   │   ├── writer/
│   │   │   └── shapes-map.ts  # ECMA-376 → internal type
│   │   ├── pdf/
│   │   ├── png-export.ts
│   │   ├── animation/         # timeline controller (GSAP)
│   │   ├── spellcheck/        # nspell worker
│   │   ├── fonts.ts           # FontFace loader
│   │   ├── katex.ts
│   │   ├── snap.ts            # smart guides algorithm
│   │   ├── undo.ts            # Immer patch history
│   │   └── format/            # .gslx zip read/write
│   ├── workers/
│   │   ├── spellcheck.worker.ts
│   │   └── thumbnail.worker.ts
│   └── styles/
│
└── shared/                    # код, общий для main и renderer
    ├── ipc-channels.ts
    ├── types.ts
    └── constants.ts
```

### 5.2. Модель данных (TypeScript)

```ts
// src/shared/types.ts
export type SlideId = string;        // UUID v4
export type ShapeId = string;

export interface Deck {
  id: string;
  title: string;
  format: 'gslx'; version: 1;
  size: { w: number; h: number };    // в px (по умолч. 1920×1080)
  theme: Theme;
  slideOrder: SlideId[];
  slides: Record<SlideId, Slide>;
  masters: SlideMaster[];
  comments: Comment[];
  createdAt: string; modifiedAt: string;
}

export interface Slide {
  id: SlideId;
  layoutId: string;                  // ссылка на layout мастера
  background?: Background;
  shapes: Shape[];                   // z-order = индекс массива
  notes: string;                     // TipTap JSON-string
  transition?: Transition;
  hidden?: boolean;
}

export type Shape =
  | TextShape | RectShape | EllipseShape | PathShape
  | LineShape | ConnectorShape | ImageShape | VideoShape
  | AudioShape | TableShape | ChartShape | EquationShape
  | GroupShape | PlaceholderShape;

export interface BaseShape {
  id: ShapeId; type: string;
  x: number; y: number; w: number; h: number;
  rotation?: number; flipH?: boolean; flipV?: boolean;
  opacity?: number; zIndex?: number;
  fill?: Fill; stroke?: Stroke; shadow?: Shadow; reflection?: Reflection;
  hyperlink?: Hyperlink; altText?: string;
  animations?: Animation[];
  locked?: boolean;
}

export interface TextShape extends BaseShape {
  type: 'text';
  tiptapDoc: object;                 // TipTap JSON
  verticalAlign?: 'top' | 'middle' | 'bottom';
  autoFit?: 'none' | 'shrink' | 'resize';
}

export interface Animation {
  id: string;
  preset: AnimationPreset;           // 'fadeIn', 'flyInLeft', 'zoomIn', …
  trigger: 'onClick' | 'withPrev' | 'afterPrev';
  duration: number;                  // ms
  delay?: number;
  byParagraph?: boolean;
}
```

Полные определения — в финальном коде проекта; `zod`-схемы для валидации при load (`src/renderer/lib/model/schema.ts`).

### 5.3. Render pipeline
1. Активный слайд — `Stage` 1920×1080 в `<Canvas>`.
2. Layers: `bg` → `content` → `overlay` (selection/guides).
3. Каждая фигура — Konva-нода с подпиской на свой shape-state через Zustand selector.
4. Dirty rendering: `layer.batchDraw()` после изменений (Konva сам батчит).
5. Текст: вне фокуса — `Konva.Text`; в фокусе — DOM-overlay с TipTap, совпадает по bounding box (с учётом rotation/scale).
6. Превью слайдов в filmstrip — кэш PNG (см. §5.10).

### 5.4. Command pattern + Immer patches для undo/redo

```ts
// src/renderer/lib/undo.ts
import { produceWithPatches, applyPatches, enablePatches, type Patch } from 'immer';
enablePatches();
type Entry = { patches: Patch[]; inverse: Patch[]; ts: number; kind: string; targetId?: string };
const MAX = 100; const COALESCE_MS = 500;
let stack: Entry[] = []; let ptr = -1;

export function commit<S>(state: S, kind: string, targetId: string | undefined,
                          recipe: (draft: S) => void): S {
  const [next, patches, inverse] = produceWithPatches(state, recipe);
  const now = performance.now(); const top = stack[ptr];
  if (top && top.kind === kind && top.targetId === targetId && now - top.ts < COALESCE_MS) {
    top.patches.push(...patches); top.inverse = [...inverse, ...top.inverse]; top.ts = now;
  } else {
    stack.splice(ptr + 1);
    stack.push({ patches, inverse, ts: now, kind, targetId });
    if (stack.length > MAX) stack.shift(); else ptr++;
  }
  return next;
}
export function undo<S>(state: S): S { if (ptr < 0) return state; const e = stack[ptr--]; return applyPatches(state, e.inverse); }
export function redo<S>(state: S): S { if (ptr >= stack.length - 1) return state; return applyPatches(state, stack[++ptr].patches); }
```

### 5.5. Plugin architecture (опционально, Phase 8+)
- JSON-manifest (`plugin.json`: id, name, entry, permissions) + JS-sandbox в Web Worker.
- Hook API: `onSlideRender`, `onExport`, `registerShapeType`, `registerMenuItem`.

### 5.6. Presenter mode — отдельное окно
- `BrowserWindow` через `screen.getAllDisplays()` → выбор non-primary; `fullscreen: true`.
- Sync state через IPC: единый источник в main, broadcast `webContents.send('presenter:slide', idx)`.
- Hot-plug: `screen.on('display-added' | 'display-removed')`.

---

## 6. Сложные технические вызовы — решения

### 6.1. .pptx import

```ts
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
const EMU = 9525; const emu = (v: any) => Number(v) / EMU;
const ALWAYS_ARRAY = new Set(['p:sp','p:pic','p:cxnSp','p:graphicFrame','a:p','a:r','a:t']);
const parser = new XMLParser({ ignoreAttributes:false, attributeNamePrefix:'',
  preserveOrder:false, isArray:(n)=>ALWAYS_ARRAY.has(n) });

export async function importPptx(buf: ArrayBuffer): Promise<Deck> {
  const zip = await JSZip.loadAsync(buf);
  const pres = parser.parse(await zip.file('ppt/presentation.xml')!.async('string'));
  const theme = parser.parse(await zip.file('ppt/theme/theme1.xml')!.async('string'));
  const slideFiles = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
  const slides: Slide[] = [];
  for (const f of slideFiles) {
    const xml = parser.parse(await zip.file(f)!.async('string'));
    slides.push(parseSlide(xml, zip, theme));
  }
  return buildDeck(pres, theme, slides);
}
```
Маппинг фигур (`a:prstGeom prst="…"`) → internal `type` через `shapes-map.ts`. Цвета `a:schemeClr val="accent1"` → ресолв через `a:clrScheme` темы. Inheritance цепочка: slide → layout → master.

**Что НЕ парсим (стартовая версия):** SmartArt, OLE-embedded, custom XML, full `p:timing` (только entrance presets). Сохраняем «raw» XML для неподдерживаемых частей — при экспорте обратно отдаём byte-identically.

### 6.2. .pptx export через PptxGenJS

```ts
import pptxgen from 'pptxgenjs';
export async function exportPptx(deck: Deck, outPath: string) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; pres.title = deck.title;
  for (const sid of deck.slideOrder) {
    const s = deck.slides[sid]; const slide = pres.addSlide();
    for (const sh of s.shapes) writeShape(slide, sh, deck);
  }
  await pres.writeFile({ fileName: outPath });
}
```
Для анимаций (которые PptxGenJS не умеет) — post-process: распаковать сгенерированный `.pptx` через JSZip, инжектить `<p:timing>` в `slideN.xml`, перепаковать.

### 6.3. PDF через `webContents.printToPDF`

```ts
// main/ipc/export.ts
const W_IN = 13.333, H_IN = 7.5;
const win = new BrowserWindow({ show:false, webPreferences:{ offscreen:true, preload }});
await win.loadURL(`app://print/${projectId}`);  // отдельный route, рендерящий все слайды в @page
await win.webContents.executeJavaScript('document.fonts.ready');
const buf = await win.webContents.printToPDF({
  pageSize: { width: Math.round(W_IN*25400), height: Math.round(H_IN*25400) },
  printBackground: true, margins: { top:0, bottom:0, left:0, right:0 },
});
await fs.writeFile(outPath, buf); win.destroy();
```
CSS: `@page { margin:0 } .slide { page-break-after: always; width: 1920px; height: 1080px }`.

### 6.4. Animation engine (GSAP)

```ts
import gsap from 'gsap';
export function buildTimeline(slide: Slide, getNode: (id: string) => Konva.Node) {
  const tl = gsap.timeline({ paused: true });
  let stepIdx = 0;
  for (const sh of slide.shapes) {
    for (const a of sh.animations ?? []) {
      const node = getNode(sh.id);
      const pos = a.trigger === 'withPrev' ? '<' : a.trigger === 'afterPrev' ? '>' : `step${++stepIdx}`;
      if (a.trigger === 'onClick') tl.addLabel(`step${stepIdx}`);
      const { from, to } = presetToTween(a.preset, node);
      tl.fromTo(node, from, { ...to, duration: a.duration/1000,
        onUpdate: () => node.getLayer()?.batchDraw() }, pos);
    }
  }
  return tl;
}
```

### 6.5. Видео/аудио — HTML overlay

```tsx
const Overlay = ({ shape }: { shape: VideoShape }) => {
  const { scale, ox, oy } = useStageTransform();
  return (
    <div style={{ position:'absolute', left: ox + shape.x*scale, top: oy + shape.y*scale,
                  width: shape.w*scale, height: shape.h*scale, zIndex: shape.zIndex }}>
      <video src={`app://media/${shape.src}`} controls={presenting} preload="metadata"
             style={{ width:'100%', height:'100%', objectFit:'contain' }} />
    </div>
  );
};
```
Custom protocol `app://` зарегистрировать в main через `protocol.handle` — обходим CORS file://.

### 6.6. KaTeX overlay

```tsx
import katex from 'katex'; import 'katex/dist/katex.min.css';
const html = katex.renderToString(shape.latex, { throwOnError:false, output:'htmlAndMathml', displayMode:true });
<div style={{ position:'absolute', left, top, transform:`scale(${scale})`, transformOrigin:'0 0' }}
     dangerouslySetInnerHTML={{ __html: html }} />
```
Шрифты KaTeX bundled через Vite — копируются в `dist/katex-fonts/`.

### 6.7. Spell check worker

```ts
// workers/spellcheck.worker.ts
import nspell from 'nspell';
let spell: any;
self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    const aff = await (await fetch(e.data.affUrl)).text();
    const dic = await (await fetch(e.data.dicUrl)).text();
    spell = nspell({ aff, dic });
    self.postMessage({ type: 'ready' });
  } else if (e.data.type === 'check') {
    const ok = spell.correct(e.data.word);
    self.postMessage({ type:'result', word: e.data.word, ok,
      suggestions: ok ? [] : spell.suggest(e.data.word).slice(0, 5) });
  }
};
```
В TipTap — `prosemirror-spellcheck`-style плагин с `DecorationSet.inline(from, to, { class: 'misspell' })`.

### 6.8. Шрифты offline

```ts
async function loadFonts() {
  const fonts = [
    { f: 'Inter', w: '400', file: 'Inter-Regular.woff2' },
    { f: 'Inter', w: '700', file: 'Inter-Bold.woff2' },
    { f: 'Roboto', w: '400', file: 'Roboto-Regular.woff2' },
    /* … полный список из §1.2 */
  ];
  await Promise.all(fonts.map(async ({ f, w, file }) => {
    const ff = new FontFace(f, `url(app://fonts/${file})`,
                            { weight: w, unicodeRange: 'U+0000-024F, U+0400-04FF' });
    await ff.load(); document.fonts.add(ff);
  }));
  await document.fonts.ready;
}
```
Вызывается в `App.tsx` до маунта Canvas — иначе Konva замерит текст fallback-шрифтом.

### 6.9. Performance для 1000+ слайдов
- `react-virtuoso` для filmstrip.
- Кэш thumbnail PNG в IndexedDB, ключ `${slideId}_${contentHash}`.
- Активный слайд = единственный мoнтированный Konva Stage.
- Thumbnail generation — Worker + OffscreenCanvas.

### 6.10. Snap-to-grid + smart guides
Алгоритм из секции 13 отчёта: 6 анкоров на объект (left/centerH/right/top/centerV/bottom), threshold = `6 / stage.scale()`, для N > 500 — spatial index `rbush`.

### 6.11. Code signing (опционально для релиза)
- Azure Trusted Signing $9.99/мес — рекомендация.
- electron-builder: `signtoolOptions.sign = './sign.js'`, вызывает AzureSignTool.
- Можно пропустить — SmartScreen warning приемлем для internal use.

---

## 7. Формат файла `.gslx`

ZIP без сжатия (для random-access медиа):
```
deck.gslx
├── manifest.json
├── presentation.json
├── slides/<uuid>.json
├── masters/<uuid>.json
├── media/<sha256>.<ext>
├── fonts/                      # опц.
├── thumbnails/<slideId>.png
├── comments.json
└── history/                    # последние N снапшотов
```

Zod-схема `manifest.json`:
```ts
const ManifestSchema = z.object({
  format: z.literal('gslx'),
  version: z.literal(1),
  app: z.string(),
  createdAt: z.string(), modifiedAt: z.string(),
  slideCount: z.number(),
});
```

Атомарный save: `*.tmp` → `fs.rename` (NTFS гарантирует atomicity).

---

## 8. Структура папок проекта (создать сразу)

```
slides-clone/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── electron.vite.config.ts
├── electron-builder.yml
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── README.md
├── build/                     # icons, installer assets
│   ├── icon.ico
│   ├── gslx.ico
│   └── installerSidebar.bmp
├── resources/                 # extraResources в asarUnpack
│   ├── fonts/                 # *.woff2 (см. §1.2)
│   ├── dictionaries/
│   │   ├── en_US.aff
│   │   ├── en_US.dic
│   │   ├── ru_RU.aff
│   │   └── ru_RU.dic
│   ├── katex-fonts/
│   └── templates/             # *.gslx стартовые шаблоны
├── src/                       # см. §5.1
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── fixtures/              # тестовые .pptx
└── scripts/
    ├── download-fonts.ts
    └── sign.js                # опц.
```

---

## 9. Зависимости (package.json — точные версии)

```jsonc
{
  "name": "slides-clone",
  "version": "0.1.0",
  "type": "module",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "tsc --noEmit && electron-vite build",
    "build:win": "npm run build && electron-builder --win --x64",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "postinstall": "electron-builder install-app-deps"
  },
  "dependencies": {
    "better-sqlite3": "12.10.0",
    "electron-updater": "6.3.9",
    "fast-xml-parser": "5.8.0",
    "jszip": "3.10.1",
    "katex": "0.16.46",
    "mathlive": "0.109.2",
    "nspell": "2.1.5",
    "dictionary-en-us": "3.0.0",
    "dictionary-ru": "3.0.0",
    "pptxgenjs": "4.0.1",
    "gsap": "3.13.0",
    "uuid": "10.0.0",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "electron": "42.1.0",
    "electron-builder": "26.8.2",
    "electron-vite": "5.0.0",
    "vite": "8.0.0",
    "typescript": "6.0.0",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "@types/react": "19.2.0",
    "@types/react-dom": "19.2.0",
    "react-konva": "19.2.4",
    "konva": "10.3.0",
    "@tiptap/core": "3.23.4",
    "@tiptap/react": "3.23.4",
    "@tiptap/pm": "3.23.4",
    "@tiptap/starter-kit": "3.23.4",
    "@tiptap/extension-text-style": "3.23.4",
    "@tiptap/extension-color": "3.23.4",
    "@tiptap/extension-font-family": "3.23.4",
    "@tiptap/extension-font-size": "3.23.4",
    "@tiptap/extension-line-height": "3.23.4",
    "@tiptap/extension-underline": "3.23.4",
    "@tiptap/extension-highlight": "3.23.4",
    "@tiptap/extension-link": "3.23.4",
    "@tiptap/extension-subscript": "3.23.4",
    "@tiptap/extension-superscript": "3.23.4",
    "@tiptap/extension-text-align": "3.23.4",
    "zustand": "5.0.13",
    "immer": "10.1.1",
    "react-virtuoso": "4.13.0",
    "react-dropzone": "14.3.5",
    "rbush": "4.0.1",
    "xlsx": "0.20.3",
    "vitest": "4.1.6",
    "@playwright/test": "1.60.0",
    "happy-dom": "16.0.0",
    "@testing-library/react": "16.1.0",
    "@vitejs/plugin-react": "5.0.0",
    "eslint": "9.16.0",
    "@typescript-eslint/eslint-plugin": "8.18.0",
    "@typescript-eslint/parser": "8.18.0",
    "eslint-plugin-react": "7.37.2",
    "eslint-plugin-react-hooks": "5.1.0",
    "prettier": "3.4.2"
  }
}
```

**Команды установки:**
```bash
mkdir slides-clone && cd slides-clone
git init
npm init -y
# Скопировать package.json выше, затем:
npm install
npx electron-builder install-app-deps
```

---

## 10. Конфигурационные файлы

### 10.1. `tsconfig.json`
```jsonc
{
  "compilerOptions": {
    "target": "ES2023", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
    "esModuleInterop": true, "skipLibCheck": true,
    "jsx": "react-jsx", "resolveJsonModule": true, "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### 10.2. `electron.vite.config.ts`
```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()],
          build: { outDir: 'out/main' } },
  preload: { plugins: [externalizeDepsPlugin()],
             build: { outDir: 'out/preload' } },
  renderer: {
    plugins: [react()],
    resolve: { alias: {
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/shared') } },
    build: { outDir: 'out/renderer' },
  },
});
```

### 10.3. `electron-builder.yml`
```yaml
appId: com.tim.slidesclone
productName: SlidesClone
directories: { output: dist, buildResources: build }
files:
  - out/**
  - package.json
asarUnpack:
  - resources/**
extraResources:
  - { from: resources/fonts, to: fonts }
  - { from: resources/dictionaries, to: dictionaries }
  - { from: resources/katex-fonts, to: katex-fonts }
  - { from: resources/templates, to: templates }
win:
  target:
    - { target: nsis, arch: [x64] }
  icon: build/icon.ico
  publisherName: Tim
  fileAssociations:
    - { ext: gslx, name: SlidesClone Presentation, icon: build/gslx.ico, role: Editor }
    - { ext: pptx, name: PowerPoint Presentation, icon: build/pptx.ico, role: Editor }
nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: always
  createStartMenuShortcut: true
  shortcutName: SlidesClone
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
  runAfterFinish: true
  deleteAppDataOnUninstall: false
```

### 10.4. `.eslintrc.cjs` — стандартный flat config с `@typescript-eslint`, `react`, `react-hooks`. `.prettierrc`: `{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }`.

---

## 11. Roadmap (8 фаз, 12–16 недель)

| Фаза | Длительность | Содержание |
|---|---|---|
| 1. Foundation | 1 нед | Скелет, Electron+Vite+React+TS, hello-window, IPC bridge, app:// protocol, FontFace loader, базовый layout (filmstrip / canvas / right panel) |
| 2. Core editor | 3 нед | Stage+layers, shape types (text/rect/ellipse/line), drag/resize/rotate, TipTap text overlay, selection, undo/redo, smart guides, snap to grid, group/ungroup, z-order, copy/paste/duplicate, hotkeys |
| 3. Advanced editing | 3 нед | Images (crop, mask, recolor), tables, charts (6 типов), connectors с auto-snap, freeform path, polyline, scribble, fill (gradient/image), shadow, reflection, alt text, гиперссылки, закладки |
| 4. Animations & transitions | 2 нед | Animation pane, 15 анимаций через GSAP, transitions между слайдами, presenter timeline controller |
| 5. Import/Export | 2 нед | .pptx import (JSZip+fast-xml-parser), .pptx export (PptxGenJS + animation post-process), PDF (printToPDF), PNG/SVG, TXT outline, CSV→table, .gslx save/load |
| 6. Presentation mode | 1 нед | Presenter window на 2-м мониторе, sync via IPC, timer, next-slide preview, laser pointer, keyboard nav, hot-plug displays |
| 7. Polish | 2 нед | Themes, theme builder, templates gallery, find & replace, spell check (nspell worker + decorations), comments (local), KaTeX equations, video/audio overlay, autosave + crash recovery, version history, accessibility, локализация UI (RU/EN) |
| 8. Build & distribute | 1 нед | electron-builder NSIS, file associations, icon assets, code signing (опц.), installer testing, troubleshooting build pitfalls |

---

## 12. Детальный TODO-лист

> Каждый пункт — actionable; критерий готовности указан после двоеточия. Группы коммитов: 1 пункт = 1 коммит, prefix по фазе (`feat(p2): …`).

### Phase 1 — Foundation (15 пунктов)
1. `git init`, `npm init`; добавить `.gitignore` (node_modules, out, dist, *.log) — критерий: чистый `git status`.
2. Скопировать `package.json` из §9, `npm install` — критерий: 0 vulnerabilities high.
3. Создать структуру папок (§8).
4. `electron.vite.config.ts` + `tsconfig.json` + `tsconfig.node.json` — критерий: `npm run typecheck` зелёный.
5. `src/main/index.ts`: создать `BrowserWindow`, загрузить renderer URL/файл — критерий: `npm run dev` открывает окно.
6. `src/preload/index.ts`: `contextBridge.exposeInMainWorld('api', {...})` с типизацией.
7. `src/renderer/main.tsx` + `App.tsx` + базовый CSS layout (header/filmstrip/canvas/inspector).
8. IPC channels enum в `src/shared/ipc-channels.ts`.
9. Custom protocol `app://` в main (`protocol.handle`) — для шрифтов и медиа.
10. Скрипт `scripts/download-fonts.ts` — скачать ~20 woff2 шрифтов в `resources/fonts/`.
11. `src/renderer/lib/fonts.ts`: FontFace loader; вызвать до маунта Canvas.
12. ESLint + Prettier + EditorConfig — критерий: `npm run lint` чистый.
13. Vitest + Playwright skeleton; добавить тест «main window opens».
14. `README.md` с инструкциями dev/build.
15. Native menu (`src/main/menu.ts`) с File/Edit/View/Insert/Slide/Format/Help.

### Phase 2 — Core editor (35 пунктов)
1. Zustand stores: `deckStore`, `uiStore`, `selectionStore`, `historyStore`.
2. Zod-схемы модели (`src/renderer/lib/model/schema.ts`).
3. Создать пустую `Deck` factory (1 слайд 1920×1080).
4. `Canvas.tsx`: Konva `Stage` + layers; зум колесом мыши + Ctrl+0 reset.
5. Пан стейджа Space+drag.
6. `RectShape` Konva renderer + drag.
7. `Transformer` (Konva) для resize/rotate.
8. `EllipseShape`, `LineShape`, `PathShape` renderers.
9. Toolbar: insert shape buttons.
10. `TextShape` renderer + double-click → TipTap overlay.
11. TipTap setup: StarterKit + 12 расширений (см. §4.4).
12. Inspector panel: позиция/размер/rotation поля.
13. Inspector: fill (solid + gradient picker), stroke, opacity.
14. Inspector: shadow, reflection.
15. Selection: single click; Shift+click multi-select; rubber band.
16. Smart guides algorithm (`src/renderer/lib/snap.ts`).
17. Snap to grid (toggle in View menu).
18. Align/Distribute commands.
19. Z-order commands (`bringToFront`, etc).
20. Group/Ungroup.
21. Copy/Paste/Cut/Duplicate (Ctrl+C/V/X/D).
22. Delete (Del).
23. Undo/Redo (`src/renderer/lib/undo.ts`) + Ctrl+Z/Ctrl+Y.
24. Filmstrip с `react-virtuoso`, drag-reorder слайдов.
25. New slide, Duplicate, Delete, Hide commands.
26. Layouts: 10 встроенных layout-ов из §1.1.
27. Apply layout command.
28. Background editor (color/image/reset).
29. Slide size dialog (4:3, 16:9, custom).
30. Rulers (top + left).
31. Guides (add/edit/clear, snap to guides).
32. Page numbers (insert + on/off в master).
33. Hyperlink dialog (URL/slide/email/bookmark).
34. Special characters picker.
35. Keyboard shortcuts полный набор (Ctrl+M new, Ctrl+/ help, …).
- Тесты: unit для `snap.ts`, `undo.ts`, schema parsing; E2E «create slide, add shape, undo».

### Phase 3 — Advanced editing (30 пунктов)
1. Image insert (drag-n-drop + file dialog + paste from clipboard).
2. Image crop tool (handles внутри bbox).
3. Crop-to-shape (mask picker из shape gallery).
4. Image recolor (sepia/grayscale/tints).
5. Brightness/Contrast/Transparency sliders.
6. Replace image, Reset image.
7. Alt text dialog.
8. Table shape (Konva Group рендерит ячейки как Konva.Rect+Text).
9. Add/Delete row/col; merge/split cells; distribute evenly.
10. Cell formatting (bg, border, padding, align).
11. CSV drag-n-drop → Insert as table dialog (через SheetJS).
12. Chart shape: editor с встроенной мини-таблицей данных.
13. 6 chart types: bar, column, line, area, pie, scatter (рендер через Konva primitives либо `chart.js` headless → image).
14. Custom colors, legend, axis titles.
15. Connector shape: straight/elbow/curved с auto-snap к connection points фигур.
16. Freeform pen (scribble) — Konva.Line с tension.
17. Polyline, arc.
18. Gradient fill editor (multi-stop).
19. Image-fill для фигур.
20. Shape library panel: ~187 ECMA-376 preset shapes (SVG-paths).
21. WordArt mini-editor (text c outline+fill+font).
22. Bookmarks: добавить anchor на фигуру/текст; ссылка на bookmark в hyperlink dialog.
23. Speaker notes panel (TipTap).
24. KaTeX equation insert: dialog с LaTeX-полем + live preview; рендер как overlay (§6.6).
25. Group hyperlink propagation.
26. Lock/Unlock object.
27. Format painter.
28. Clear formatting.
29. Replace image preserves crop region.
30. Tests: chart rendering, equation rendering, connector auto-snap.

### Phase 4 — Animations & transitions (15 пунктов)
1. Animation data model в `Shape.animations`.
2. Animation panel UI (список, drag-reorder, add/remove).
3. 15 пресетов в `presetToTween` (`src/renderer/lib/animation/presets.ts`).
4. Trigger picker (onClick/withPrev/afterPrev).
5. Duration slider.
6. By-paragraph option для текстовых блоков.
7. GSAP timeline controller (§6.4).
8. Preview animation на текущем слайде (Play button).
9. 8 transitions: None, Fade, Slide L/R, Flip, Cube, Gallery, Dissolve.
10. Transition picker per slide + Apply to all.
11. Transition duration slider.
12. Sync timeline state в presenter window via IPC.
13. Animation export (post-process .pptx — инжект `<p:timing>`).
14. Animation import из .pptx (parse `<p:timing>`, map presetID).
15. Tests: timeline build, preset → tween correctness.

### Phase 5 — Import/Export (25 пунктов)
1. `.gslx` writer (`src/renderer/lib/format/gslx-writer.ts`).
2. `.gslx` reader.
3. Atomic save (tmp + rename).
4. `lib/pptx/parser/`: unzip, parse `[Content_Types].xml`, rels, theme.
5. Parse `presentation.xml` (slide list, size).
6. Parse `theme1.xml` (clrScheme, fontScheme).
7. Parse `slideMasterN.xml` + `slideLayoutN.xml`.
8. Parse `slideN.xml`: spTree walk, `<p:sp>` (rect, ellipse, custGeom, prstGeom).
9. Parse `<p:pic>` (extract `r:embed` → unzip media).
10. Parse `<p:cxnSp>` (connectors).
11. Parse `<p:graphicFrame>` tables/charts.
12. Parse `<p:txBody>` runs + `<a:rPr>` (font, size, bold, color).
13. Parse hyperlinks, transitions, basic animations.
14. Color resolution через theme (`schemeClr` → hex).
15. EMU→px utility.
16. `lib/pptx/shapes-map.ts`: 187 prstGeom → internal type fallback.
17. `lib/pptx/writer/`: PptxGenJS wrapper.
18. Map internal shape → `slide.addShape` calls.
19. Map text runs → `addText` options array.
20. Map images → `addImage` (data URL or path).
21. Map tables → `addTable`.
22. Map charts → `addChart`.
23. Post-process для animation timing XML.
24. PDF export (§6.3) с hidden print window.
25. PNG/JPEG per slide (Konva `stage.toDataURL`), SVG export, TXT outline. CSV import для chart data.
- Тесты: round-trip 5 reference `.pptx` файлов; визуальный diff PDF.

### Phase 6 — Presentation mode (10 пунктов)
1. `createPresenterWindow` в main с выбором display.
2. `presenter.html` route — fullscreen `Stage` без UI.
3. IPC channels: `presenter:start`, `presenter:next`, `presenter:prev`, `presenter:slide`.
4. Audience view (на presenter мониторе) — текущий слайд fullscreen.
5. Speaker view (на main мониторе) — текущий + заметки + next preview + timer.
6. Timer (count-up, pause, reset).
7. Laser pointer (hold mouse → красная точка через CSS cursor / Konva.Circle overlay).
8. Keyboard nav: ←/→/Space/Esc/B (black)/W (white).
9. Animation timeline sync через IPC.
10. Display hot-plug (`screen.on('display-added' | 'display-removed')`).

### Phase 7 — Polish (25 пунктов)
1. Theme builder dialog: color palette editor (6 accents + 2 text + 2 bg).
2. Font set editor (heading + body).
3. Master slide editor mode (Slide → Edit theme).
4. Templates gallery с 10 встроенными `.gslx` в `resources/templates/`.
5. New from template flow.
6. Find & Replace dialog (match case, regex).
7. Spell check worker (§6.7) + dictionary loading.
8. TipTap spellcheck plugin с decorations.
9. Personal dictionary (better-sqlite3): add word, remove word.
10. Comments: add/edit/resolve, привязка к shape/slide.
11. Comments panel.
12. Autosave loop (§6.x): debounced 5s + жёсткий 30s.
13. Crash recovery dialog: sentinel-file pattern.
14. Version history: snapshot каждые 5 мин активной работы.
15. Version history dialog: list, preview, restore, name.
16. Recents (better-sqlite3).
17. Preferences dialog (default font, autosave interval, theme).
18. RU/EN UI локализация (i18next).
19. Accessibility: alt text всех изображений, ARIA labels на UI, keyboard nav для всех кнопок.
20. High-DPI testing.
21. App icon, splash screen.
22. About dialog с лицензиями.
23. First-run welcome tutorial.
24. Telemetry — **НЕТ** (offline-first, no network).
25. Финальная вычитка hotkey list — Ctrl+/ показывает.

### Phase 8 — Build & distribute (10 пунктов)
1. Сгенерировать `.ico` иконки (16/32/48/256) из 1024px PNG.
2. `electron-builder.yml` финализировать (§10.3).
3. `npm run build:win` — критерий: `dist/SlidesClone Setup x.y.z.exe` создан.
4. Запустить инсталлятор на чистой Win10 VM — критерий: app запускается.
5. Тест file association: двойной клик по `.gslx` открывает приложение с файлом.
6. Тест file association `.pptx`.
7. Single-instance lock + open-file forwarding.
8. (Опц.) Code signing через Azure Trusted Signing.
9. Smoke E2E на собранном `.exe` через Playwright `_electron.launch`.
10. Release notes в `RELEASES.md`; tag в git.

---

## 13. Стратегия коммитов и git

- Branch model: `main` (релизы) + `dev` (рабочая) + feature branches `phase{N}/<short-name>`.
- Conventional commits: `feat(p2): add Konva transformer`, `fix(p5): EMU rounding off-by-one`, `test(p4): timeline build`, `chore: update deps`.
- 1 пункт TODO = 1 коммит (atomic).
- В конце каждой фазы — `git tag phase{N}-complete`.
- В CI (опц., GitHub Actions): typecheck + lint + vitest + playwright на windows-latest.

---

## 14. Troubleshooting (типичные проблемы)

### 14.1. `electron-rebuild` падает на `better-sqlite3`
Запустить вручную: `npx @electron/rebuild -f -w better-sqlite3`. На Windows нужен Visual Studio Build Tools 2022 + Python 3.11+. Альтернатива: `npm install better-sqlite3 --build-from-source --runtime=electron --target=$(node -p "process.versions.electron")`.

### 14.2. Konva: текст рендерится в fallback-шрифте
Шрифты не успели загрузиться. Решение: `await document.fonts.ready` перед первым `stage.draw()`. Также — добавить `node.cache(); node.draw()` после `document.fonts.ready`.

### 14.3. `printToPDF` возвращает пустой PDF
Чаще всего — рендер не успел; добавить `await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))` + `await document.fonts.ready` перед `printToPDF`.

### 14.4. fast-xml-parser выдаёт строки вместо массивов
Указать `isArray: (n) => ALWAYS_ARRAY.has(n)` в опциях (§6.1).

### 14.5. PptxGenJS ломает форматирование при export
Передавать **новый** объект options для каждого `addText` — библиотека мутирует. Использовать `{...defaults, ...override}`.

### 14.6. file:// blocks fonts / media
Зарегистрировать custom protocol `app://` через `protocol.handle` в main и обращаться `app://fonts/Inter-Regular.woff2`.

### 14.7. electron-builder: NSIS installer >2 GB ошибка
Уменьшить медиа в `resources/` или включить `customNsisBinary` с NSISBI fork.

### 14.8. fileAssociations не работают
Требуется `perMachine: true` и elevation; для per-user — кастомный `.nsh` скрипт с записью в HKCU.

### 14.9. SmartScreen «Unknown publisher»
Подписать Azure Trusted Signing ($9.99/мес) или EV cert. В dev — игнорировать.

### 14.10. Memory leak при переключении слайдов
Убедиться, что `stage.destroy()` вызывается при unmount; снимать listeners; ограничить undo-стек 100 записями.

### 14.11. Spell check блокирует typing
Запускать в Web Worker (§6.7); debounce проверки по 300 ms.

### 14.12. Видео не воспроизводится в `.pptx`-импорте
Кодек HEVC требует системных кодеков Windows; для офлайн-надёжности транскодировать в H.264 через `ffmpeg` (опционально bundled).

### 14.13. TypeScript 6 strict ругается на refs
Использовать `useRef<T>(null)` + non-null assertion после mount; либо обновить типы через `react-19` codemod.

### 14.14. GSAP onUpdate не перерисовывает Konva
Явно вызывать `node.getLayer()?.batchDraw()` в каждом `onUpdate`.

### 14.15. PowerPoint открывает экспортированный `.pptx` с потерями
Это ожидаемо для анимаций/transitions. Документировать в README. Для критичных кейсов — sidecar LibreOffice конвертация.

---

## 15. Что НЕ реализуем (чтобы пользователь не удивлялся)

Эти функции отсутствуют **и в Google Slides**, и в нашем клоне:
- Motion paths (есть в PowerPoint, нет в Slides).
- Morph transition / Smart animate.
- 3D models.
- Background removal у изображений.
- Edit shape points (custom geometry editing).
- Triggers (on-click of object X).
- Audio/screen recording в приложении.
- Расширенный WordArt (PowerPoint-уровень).
- Custom slide shows (subset of slides).
- Branched навигация.

Дополнительно НЕ реализуем относительно Slides:
- **Облачные функции:** real-time collaboration, sharing, cloud comments, version history в облаке, Q&A audience link, live captions с микрофона. Replacement: локальная история, локальные комментарии.
- **Google Workspace интеграции:** Drive picker, Photos, web search images, Sheets-linked charts. Replacement: локальный files dialog, локальный chart data editor.
- **Add-ons marketplace.** Опционально позже — plugin SDK (§5.5).
- **AI features** (Gemini suggestions, auto-design, image gen).
- **Live presenter Q&A.**

Реализуем как **расширение** относительно Slides:
- LaTeX-формулы (KaTeX) — Slides этого не имеет нативно.
- Закладки внутри слайда (Slides не имеет).
- Bundled custom-fonts upload — отсутствует в Slides (там только Google Fonts онлайн).

---

## 16. Чеклист «готово к релизу»

- [ ] `npm run typecheck` — 0 ошибок.
- [ ] `npm run lint` — 0 warnings.
- [ ] `npm test` — 100% зелёный, coverage > 70% для `lib/`.
- [ ] `npm run test:e2e` — все E2E зелёные.
- [ ] Round-trip тест: 5 reference `.pptx` → импорт → экспорт → визуально идентичны (или допустимая деградация задокументирована).
- [ ] PDF export даёт корректные размеры страниц.
- [ ] Spell check работает на русском и английском.
- [ ] Presenter mode корректно выводится на 2-й монитор.
- [ ] Autosave/crash recovery протестированы (kill процесса → restart → recover).
- [ ] File associations `.gslx` и `.pptx` работают на чистой Windows VM.
- [ ] Installer запускается с правами обычного пользователя.
- [ ] Uninstall удаляет app, оставляет user data.
- [ ] Память: открыт 100-слайдовый файл, после 30 мин работы heap < 1 GB.
- [ ] Производительность: drag фигуры в 100-слайдовом деке — стабильные 60 FPS.
- [ ] Шрифты загружаются за < 500 ms на cold start.
- [ ] Все лицензии зависимостей перечислены в About dialog.
- [ ] README обновлён; release notes есть.
- [ ] Tag в git: `vX.Y.Z`.

---

## 17. Финальные инструкции для Claude Code

1. **Не задавай уточняющих вопросов** — все решения зафиксированы в этом документе.
2. **Иди по фазам линейно** (1 → 8). В каждой фазе — выполняй TODO-пункты по порядку, коммить atomically.
3. **Если библиотека недоступна в указанной версии** — взять ближайшую более раннюю стабильную и записать в `CHANGELOG.md`.
4. **Любая ошибка в build** — сначала смотри §14 Troubleshooting.
5. **Тесты пиши вместе с фичей**, не откладывай.
6. **Не используй AGPL-зависимости** и tldraw — лицензионные риски.
7. **Комментарии в коде — на русском**, идентификаторы — на английском.
8. **После каждой фазы** запускай `npm run typecheck && npm run lint && npm test && npm run build` — если зелёное, тегни `phase{N}-complete` и переходи дальше.
9. **Финальный артефакт** — `dist/SlidesClone Setup 0.1.0.exe` (NSIS-инсталлятор).
10. **Если упрёшься в принципиальную невозможность** какой-то фичи — отметь её в `KNOWN-LIMITATIONS.md` и продолжай; не блокируйся.

Удачи, Claude Code. Поехали.
