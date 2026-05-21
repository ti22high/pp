# PROGRESS.md — чеклист по фазам

Источник: `SPEC.md` §11 (roadmap) + §12 (детальный TODO).
Правило: 1 пункт = 1 atomic commit. Отмечать `[x]` сразу после успешного коммита.

---

## Phase 1 — Foundation (1 неделя)

**Цель (§11):** Скелет, Electron + Vite + React + TS, hello-window, IPC bridge, app:// protocol, FontFace loader, базовый layout (filmstrip / canvas / right panel).

- [x] 1.1. `git init`, `npm init`; добавить `.gitignore` (node_modules, out, dist, *.log) — критерий: чистый `git status`.
- [x] 1.2. Скопировать `package.json` из §9, `npm install` — критерий: 0 vulnerabilities high. _(1 high у xlsx без апстрим-фикса, см. BUGS.md и DECISIONS.md; запланирована замена на papaparse в Phase 3.)_
- [x] 1.3. Создать структуру папок (§8).
- [x] 1.4. `electron.vite.config.ts` + `tsconfig.json` + `tsconfig.node.json` — критерий: `npm run typecheck` зелёный.
- [x] 1.5. `src/main/index.ts`: создать `BrowserWindow`, загрузить renderer URL/файл — критерий: `npm run dev` открывает окно.
- [x] 1.6. `src/preload/index.ts`: `contextBridge.exposeInMainWorld('api', {...})` с типизацией.
- [x] 1.7. `src/renderer/main.tsx` + `App.tsx` + базовый CSS layout (header / filmstrip / canvas / inspector).
- [x] 1.8. IPC channels enum в `src/shared/ipc-channels.ts`.
- [x] 1.9. Custom protocol `app://` в main (`protocol.handle`) — для шрифтов и медиа.
- [x] 1.10. Скрипт `scripts/download-fonts.ts` — скачать ~20 woff2 шрифтов в `resources/fonts/`. _(Скрипт коммитится; запуск — на машине пользователя через `npm run fonts:download`, в sandbox 403 от fontsource CDN.)_
- [x] 1.11. `src/renderer/lib/fonts.ts`: FontFace loader; вызвать до маунта Canvas.
- [x] 1.12. ESLint + Prettier + EditorConfig — критерий: `npm run lint` чистый.
- [x] 1.13. Vitest + Playwright skeleton; добавить тест «main window opens».
- [x] 1.14. `README.md` — обновить под фактический workflow (если нужно).
- [x] 1.15. Native menu (`src/main/menu.ts`) с File / Edit / View / Insert / Slide / Format / Help.

**Завершение фазы:** `npm run typecheck && npm run lint && npm test` зелёное → `git tag phase1-complete`.

---

## Phase 2 — Core editor (3 недели)

**Цель (§11):** Stage + layers, shape types (text/rect/ellipse/line), drag/resize/rotate, TipTap text overlay, selection, undo/redo, smart guides, snap to grid, group/ungroup, z-order, copy/paste/duplicate, hotkeys.

- [x] 2.1. Zustand stores: `deckStore`, `uiStore`, `selectionStore`, `historyStore`.
- [x] 2.2. Zod-схемы модели (`src/renderer/lib/model/schema.ts`).
- [x] 2.3. Создать пустую `Deck` factory (1 слайд 1920×1080).
- [x] 2.4. `Canvas.tsx`: Konva `Stage` + layers; зум колесом мыши + Ctrl+0 reset.
- [x] 2.5. Пан стейджа Space + drag.
- [x] 2.6. `RectShape` Konva renderer + drag.
- [x] 2.7. `Transformer` (Konva) для resize/rotate.
- [x] 2.8. `EllipseShape`, `LineShape`, `PathShape` renderers.
- [x] 2.9. Toolbar: insert shape buttons.
- [x] 2.10. `TextShape` renderer + double-click → TipTap overlay.
- [x] 2.11. TipTap setup: StarterKit + 12 расширений (см. §4.4).
- [x] 2.12. Inspector panel: позиция / размер / rotation поля.
- [x] 2.13. Inspector: fill (solid + gradient picker), stroke, opacity.
- [x] 2.14. Inspector: shadow, reflection.
- [x] 2.15. Selection: single click; Shift+click multi-select; rubber band.
- [x] 2.16. Smart guides algorithm (`src/renderer/lib/snap.ts`).
- [x] 2.17. Snap to grid (toggle в View menu).
- [x] 2.18. Align / Distribute commands.
- [x] 2.19. Z-order commands (`bringToFront`, etc).
- [x] 2.20. Group / Ungroup.
- [x] 2.21. Copy / Paste / Cut / Duplicate (Ctrl+C/V/X/D).
- [x] 2.22. Delete (Del).
- [x] 2.23. Undo / Redo (`src/renderer/lib/undo.ts`) + Ctrl+Z / Ctrl+Y.
- [x] 2.24. Filmstrip с `react-virtuoso`, drag-reorder слайдов.
- [x] 2.25. New slide, Duplicate, Delete, Hide commands.
- [x] 2.26. Layouts: 10 встроенных layout-ов из §1.1.
- [x] 2.27. Apply layout command.
- [x] 2.28. Background editor (color / image / reset).
- [x] 2.29. Slide size dialog (4:3, 16:9, custom).
- [x] 2.30. Rulers (top + left).
- [x] 2.31. Guides (add / edit / clear, snap to guides).
- [x] 2.32. Page numbers (insert + on/off в master).
- [x] 2.33. Hyperlink dialog (slide + bookmark stub; без URL/email — см. DECISIONS.md 2026-05-19).
- [x] 2.34. Special characters picker.
- [x] 2.35. Keyboard shortcuts — полный набор (Ctrl+M new, Ctrl+/ help, …).
- [x] 2.36. Context menu (правый клик по фигуре): z-order, copy/cut/paste, duplicate, group/ungroup, delete. (См. DECISIONS.md 2026-05-19.)
- [x] 2.T. Тесты: unit для `snap.ts`, `undo.ts`, schema parsing; E2E «create slide, add shape, undo».

**Завершение фазы:** `git tag phase2-complete`.

---

## Phase 3 — Advanced editing (3 недели)

**Цель (§11):** Images (crop, mask, recolor), tables, charts (6 типов), connectors с auto-snap, freeform path, polyline, scribble, fill (gradient/image), shadow, reflection, alt text, гиперссылки, закладки.

- [x] 3.1. Image insert (drag-n-drop + file dialog + paste from clipboard).
- [x] 3.2. Image crop tool (handles внутри bbox).
- [x] 3.3. Crop-to-shape (mask picker из shape gallery — базовый набор 8 масок; полная галерея 3.20).
- [x] 3.4. Image recolor (sepia / grayscale / tints).
- [x] 3.5. Brightness / Contrast / Transparency sliders.
- [x] 3.6. Replace image, Reset image.
- [x] 3.7. Alt text dialog.
- [x] 3.8. Table shape (Konva Group рендерит ячейки как Konva.Rect + Text).
- [x] 3.9. Add / Delete row / col; merge / split cells; distribute evenly.
- [x] 3.10. Cell formatting (bg, border, padding, align).
- [x] 3.11. CSV drag-n-drop → Insert as table dialog (через SheetJS).
- [x] 3.11a. Paste таблицы из Excel/Sheets: парсинг буфера (text/html + text/plain TSV) → таблица. Ctrl+V когда в буфере табличные данные. + переносится фон/выравнивание ячеек из HTML-буфера. (См. DECISIONS.md 2026-05-19.)
- [x] 3.11e. Стили текста ячейки: цвет, шрифт, размер, жирный/курсив (единые на ячейку, не per-символ). Переносятся при вставке из Excel/Sheets (HTML-буфер) + редактируются в панели «Формат ячеек». Per-символьный rich-текст в ячейке (разные стили внутри одной ячейки) — НЕ реализован, при необходимости отдельной задачей. (Запрос пользователя 2026-05-20.)
- [x] 3.11b. Импорт .xlsx (drag-n-drop файла) → выбор листа + диапазона → таблица (SheetJS). Примечание: free-SheetJS читает только значения, стили (цвета/шрифты) из файла НЕ переносятся.
- [x] 3.12. Chart shape: editor с встроенной мини-таблицей данных.
- [x] 3.13. 6 chart types: bar, column, line, area, pie, scatter (рендер через Konva primitives).
- [x] 3.14. Custom colors, legend, axis titles (+ gridlines toggle). Реализовано в панели данных диаграммы.
- [x] 3.14a. Расширенные типы графиков: doughnut, radar, stacked column/bar/area, combo, bubble, scatter+line. Рендер на Konva (не Chart.js — для единообразия/вектора, см. DECISIONS 2026-05-20).
- [x] 3.14b. Продвинутая настройка графиков: заголовок, позиция легенды (top/bottom/left/right), подписи данных, формат чисел осей (авто/целое/проценты/разряды), gridlines on/off.
- [x] 3.14c. Импорт графика из .xlsx: парсинг xl/charts/chartN.xml (JSZip + fast-xml-parser) → тип + категории + серии → наш редактируемый chart. Список графиков в диалоге импорта .xlsx. (.pptx-графики — при импорте .pptx, Phase 5.)
- [x] 3.14d. Paste графика из Excel как изображения: Excel при copy кладёт картинку — наш обработчик paste (image-ветка) вставляет её как Image. Работает существующим механизмом вставки картинок.
- [x] 3.14f. UX графика: контекстный тулбар СВЕРХУ при выделенной диаграмме (тип, легенда, сетка, подписи, «Данные…») — как контекстная вкладка в PP. Двойной клик по графику открывает панель данных. Инлайн-правка отдельных элементов прямо на графике (заголовок/ось/точка перетаскиванием) — дальнейшая доработка в рамках ленты B2.
- [x] 3.14g. Создать диаграмму из таблицы: правый клик по таблице → строит редактируемый график по её данным (1-я строка = серии, 1-й столбец = категории). Основной путь к редактируемому графику из данных Google Sheets (Sheets отдаёт график только картинкой).
- [ ] 3.14h. Windows: редактируемый график из буфера Excel. На Windows Excel кладёт в буфер формат `Embed Source` (OLE/CFB со встроенной книгой). Путь: clipboard.readBuffer('Embed Source') → CFB-парсер (есть в SheetJS) → встроенный .xlsx → парсер xl/charts (3.14c) → редактируемый график. На macOS НЕВОЗМОЖНО (в буфере только image/png — проверено 2026-05-20). Реализовать и отладить ТОЛЬКО на реальной Windows+Excel (вслепую рискованно: структура Embed Source варьируется).
- [x] 3.15. Connector shape: straight / elbow / curved + ручки концов, перетаскивание, выбор маршрута/стрелок (контекстное меню).
- [x] 3.15a. Визуальные точки привязки: при перетаскивании конца коннектора показываются 9 точек фигур (углы/середины/центр), магнитное прилипание + привязка (shapeId+anchor → коннектор следует за фигурой).
- [x] 3.16. Freeform pen (scribble): кнопка «Карандаш» (toggle) → рисование мышью на холсте, точки сглаживаются (квадратичные кривые) и запекаются в pathShape. Превью-линия во время рисования.
- [x] 3.17. Polyline (режим «Ломаная»: клики-вершины, Enter/двойной клик — завершить, Esc — отмена) + Arc (режим «Дуга»: протяжка от начала к концу → дуговой path). Обе — открытые линии (pathShape, обводка без заливки).
- [ ] 3.18. Gradient fill editor (multi-stop).
- [ ] 3.19. Image-fill для фигур.
- [ ] 3.20. Shape library panel: ~187 ECMA-376 preset shapes (SVG-paths).
- [ ] 3.21. WordArt mini-editor (text c outline + fill + font).
- [ ] 3.22. Bookmarks: добавить anchor на фигуру/текст; ссылка на bookmark в hyperlink dialog.
- [ ] 3.23. Speaker notes panel (TipTap).
- [ ] 3.24. KaTeX equation insert: dialog с LaTeX-полем + live preview; рендер как overlay (§6.6).
- [ ] 3.24a. Визуальный конструктор формул: палитра кнопок-шаблонов (дробь, корень, степень/индекс, сумма/интеграл, матрица, греческие) — вставляют LaTeX-сниппет с плейсхолдерами в поле 3.24. (См. DECISIONS.md 2026-05-19.)
- [ ] 3.24b. Рукописный ink-ввод формул: рисование стилусом/мышью → распознавание в LaTeX. ОБЯЗАТЕЛЬНО (запрос пользователя). Требует офлайн-движка распознавания — см. DECISIONS.md 2026-05-19 (варианты реализации, без cloud/платных по умолчанию).
- [ ] 3.25. Group hyperlink propagation.
- [ ] 3.26. Lock / Unlock object.
- [ ] 3.27. Format painter.
- [ ] 3.28. Clear formatting.
- [ ] 3.29. Replace image preserves crop region.
- [ ] 3.30. Tests: chart rendering, equation rendering, connector auto-snap.
- [ ] 3.31. Импорт пользовательских шрифтов (.ttf/.otf) — drag-n-drop или File → Шрифты…; хранение в `userData/fonts/<hash>.<ext>`, регистрация через FontFace. (См. DECISIONS.md 2026-05-19.)
- [ ] 3.32. Импорт пользовательских SVG-фигур в Shape library — парсинг `<path d>` → `pathShape`, кнопка «Добавить свою фигуру…» в Shape library panel (после 3.20).
- [ ] 3.33. «Мои символы и фигуры»: кнопка «Добавить свой…» в picker-е/библиотеке (вставить символ/эмодзи или выбрать картинку/SVG → имя → категория «Мои»); хранение per-user в userData; экспорт/импорт набора одним файлом для команды («корпоративные символы»). Простой UX без кодов и настроек. (См. DECISIONS.md 2026-05-19.)
- [ ] 3.34. **Панель форматирования текста (rich text toolbar). ВАЖНО — сейчас провисает.** Движок уже есть: TipTap c TextAlign/Bold/Italic/Underline/Strike/Color/FontFamily/FontSize/LineHeight/Bullet/Ordered/Link/Highlight/Sub/Sup (`lib/editor/extensions.ts`), но НЕТ UI для применения. Сделать контекстную плавающую панель над редактируемым текстом (bubble toolbar при активном TipTap-оверлее): bold/italic/underline/strike, шрифт+размер, цвет текста+выделение, выравнивание (L/C/R/justify), маркированный/нумерованный список, ссылка. Также применимо к «тексту в фигуре» и тексту ячейки таблицы. ПОЗЖЕ переезжает во вкладку «Главная» верхней ленты (Backlog B2). Приоритет: делать сразу после под-фазы таблиц (3.11), т.к. форматирование текста — базовая функция и не должно ждать полного редизайна ленты. (Решение по размещению/таймингу — см. DECISIONS.md 2026-05-20.)

**Завершение фазы:** `git tag phase3-complete`.

---

## Phase 4 — Animations & transitions (2 недели)

**Цель (§11):** Animation pane, 15 анимаций через GSAP, transitions между слайдами, presenter timeline controller.

- [ ] 4.1. Animation data model в `Shape.animations`.
- [ ] 4.2. Animation panel UI (список, drag-reorder, add/remove).
- [ ] 4.3. 15 пресетов в `presetToTween` (`src/renderer/lib/animation/presets.ts`).
- [ ] 4.4. Trigger picker (onClick / withPrev / afterPrev).
- [ ] 4.5. Duration slider.
- [ ] 4.6. By-paragraph option для текстовых блоков.
- [ ] 4.7. GSAP timeline controller (§6.4).
- [ ] 4.8. Preview animation на текущем слайде (Play button).
- [ ] 4.9. 8 transitions: None, Fade, Slide L/R, Flip, Cube, Gallery, Dissolve.
- [ ] 4.10. Transition picker per slide + Apply to all.
- [ ] 4.11. Transition duration slider.
- [ ] 4.12. Sync timeline state в presenter window via IPC.
- [ ] 4.13. Animation export (post-process .pptx — инжект `<p:timing>`).
- [ ] 4.14. Animation import из .pptx (parse `<p:timing>`, map presetID).
- [ ] 4.15. Tests: timeline build, preset → tween correctness.
- [ ] 4.16. **Таксономия анимаций (PP-уровень):** разделить пресеты на категории Вход / Выделение (emphasis) / Выход, плюс **пути движения (motion paths)** — преднабор (линия, дуга, фигура) + произвольный путь (рисование кривой). UI-панель группирует по категориям. Модель: `animation.kind: 'entrance'|'emphasis'|'exit'|'motion'`, для motion — `path` (точки/сегменты). Расширяет плоские 15 пресетов (4.3).
- [ ] 4.17. **Триггер «по клику на другой объект»** (interactive trigger): помимо onClick/withPrev/afterPrev — запуск анимации при клике на указанную фигуру (`trigger: {kind:'onShapeClick', shapeId}`). Нужно в Presenter-режиме (Phase 6) ловить клики по фигуре-триггеру.
- [ ] 4.18. **Переход Morph** (фирменная фича PP): сопоставление одинаковых/похожих объектов между соседними слайдами по id/имени → твин позиции/размера/поворота/цвета между ними при переходе. Алгоритм матчинга + интерполяция через GSAP. Самый сложный переход — отдельная проработка.

**Завершение фазы:** `git tag phase4-complete`.

---

## Phase 5 — Import / Export (2 недели)

**Цель (§11):** .pptx import (JSZip + fast-xml-parser), .pptx export (PptxGenJS + animation post-process), PDF (printToPDF), PNG/SVG, TXT outline, CSV→table, .gslx save/load.

- [ ] 5.1. `.gslx` writer (`src/renderer/lib/format/gslx-writer.ts`).
- [ ] 5.2. `.gslx` reader.
- [ ] 5.3. Atomic save (tmp + rename).
- [ ] 5.4. `lib/pptx/parser/`: unzip, parse `[Content_Types].xml`, rels, theme.
- [ ] 5.5. Parse `presentation.xml` (slide list, size).
- [ ] 5.6. Parse `theme1.xml` (clrScheme, fontScheme).
- [ ] 5.7. Parse `slideMasterN.xml` + `slideLayoutN.xml`.
- [ ] 5.8. Parse `slideN.xml`: spTree walk, `<p:sp>` (rect, ellipse, custGeom, prstGeom).
- [ ] 5.9. Parse `<p:pic>` (extract `r:embed` → unzip media).
- [ ] 5.10. Parse `<p:cxnSp>` (connectors).
- [ ] 5.11. Parse `<p:graphicFrame>` tables / charts.
- [ ] 5.12. Parse `<p:txBody>` runs + `<a:rPr>` (font, size, bold, color).
- [ ] 5.13. Parse hyperlinks, transitions, basic animations.
- [ ] 5.14. Color resolution через theme (`schemeClr` → hex).
- [ ] 5.15. EMU → px utility.
- [ ] 5.16. `lib/pptx/shapes-map.ts`: 187 prstGeom → internal type fallback.
- [ ] 5.17. `lib/pptx/writer/`: PptxGenJS wrapper.
- [ ] 5.18. Map internal shape → `slide.addShape` calls.
- [ ] 5.19. Map text runs → `addText` options array.
- [ ] 5.20. Map images → `addImage` (data URL or path).
- [ ] 5.21. Map tables → `addTable`.
- [ ] 5.22. Map charts → `addChart`.
- [ ] 5.23. Post-process для animation timing XML.
- [ ] 5.24. PDF export (§6.3) с hidden print window.
- [ ] 5.25. PNG/JPEG per slide (Konva `stage.toDataURL`), SVG export, TXT outline, CSV import для chart data.
- [ ] 5.26. Сохранить как шаблон (.gslx → `userData/templates/<id>.gslx`) + галерея пользовательских шаблонов в окне «Создать презентацию». (См. DECISIONS.md 2026-05-19.)
- [ ] 5.27. **Версионирование схемы .gslx + миграции.** В файле хранится `schemaVersion` (сейчас `version: 1`). Реестр миграций `migrate(deck, fromVersion)` — последовательные преобразования старых файлов к текущей схеме при чтении (5.2). Без него старые файлы будут падать на zod-валидации по мере эволюции модели. Тесты: загрузка фикстур старых версий → миграция → валидно.
- [ ] 5.28. **Встраивание шрифтов при экспорте/шеринге.** При экспорте `.pptx` и сохранении `.gslx` для шеринга — опционально встраивать использованные шрифты (особенно кастомные из 3.31), иначе на чужой машине «поедут». .pptx: `/ppt/fonts/` + `embeddedFontLst`. .gslx: складывать woff2 в media/fonts. Диалог «Встроить шрифты» (вкл/выкл, размер файла).
- [ ] 5.29. **Reuse Slides** — вставка слайдов из другой презентации (.gslx/.pptx): диалог-браузер слайдов выбранного файла → выбрать нужные → вставить в текущую (с опцией «сохранить исходное форматирование» / «применить тему текущей»).
- [ ] 5.30. **Печать и раздаточные материалы.** Нормальный диалог печати: режимы — слайды (1/стр), **раздатки (2/3/4/6/9 слайдов на лист)**, **страницы заметок** (слайд + заметки), структура (outline). Рендер раскладок в hidden print window → `printToPDF` / системная печать. Сейчас только per-slide PDF (5.24).

- [ ] 5.T. Тесты: round-trip 5 reference `.pptx` файлов; визуальный diff PDF; миграция схемы (5.27).

**Завершение фазы:** `git tag phase5-complete`.

---

## Phase 6 — Presentation mode (1 неделя)

**Цель (§11):** Presenter window на 2-м мониторе, sync via IPC, timer, next-slide preview, laser pointer, keyboard nav, hot-plug displays.

- [ ] 6.1. `createPresenterWindow` в main с выбором display.
- [ ] 6.2. `presenter.html` route — fullscreen `Stage` без UI.
- [ ] 6.3. IPC channels: `presenter:start`, `presenter:next`, `presenter:prev`, `presenter:slide`.
- [ ] 6.4. Audience view (на presenter мониторе) — текущий слайд fullscreen.
- [ ] 6.5. Speaker view (на main мониторе) — текущий + заметки + next preview + timer.
- [ ] 6.6. Timer (count-up, pause, reset).
- [ ] 6.7. Laser pointer (hold mouse → красная точка через CSS cursor / Konva.Circle overlay).
- [ ] 6.8. Keyboard nav: ← / → / Space / Esc / B (black) / W (white).
- [ ] 6.9. Animation timeline sync через IPC.
- [ ] 6.10. Display hot-plug (`screen.on('display-added' | 'display-removed')`).

**Завершение фазы:** `git tag phase6-complete`.

---

## Phase 7 — Polish (2 недели)

**Цель (§11):** Themes, theme builder, templates gallery, find & replace, spell check, comments (local), KaTeX equations, video/audio overlay, autosave + crash recovery, version history, accessibility, локализация UI (RU/EN).

- [ ] 7.1. Theme builder dialog: color palette editor (6 accents + 2 text + 2 bg).
- [ ] 7.2. Font set editor (heading + body).
- [ ] 7.3. Master slide editor mode (Slide → Edit theme).
- [ ] 7.4. Templates gallery с 10 встроенными `.gslx` в `resources/templates/`.
- [ ] 7.5. New from template flow.
- [ ] 7.6. Find & Replace dialog (match case, regex).
- [ ] 7.7. Spell check worker (§6.7) + dictionary loading.
- [ ] 7.8. TipTap spellcheck plugin с decorations.
- [ ] 7.9. Personal dictionary (better-sqlite3): add word, remove word.
- [ ] 7.10. Comments: add / edit / resolve, привязка к shape/slide.
- [ ] 7.11. Comments panel.
- [ ] 7.12. Autosave loop: debounced 5s + жёсткий 30s.
- [ ] 7.13. Crash recovery dialog: sentinel-file pattern.
- [ ] 7.14. Version history: snapshot каждые 5 мин активной работы.
- [ ] 7.15. Version history dialog: list, preview, restore, name.
- [ ] 7.16. Recents (better-sqlite3).
- [ ] 7.17. Preferences dialog (default font, autosave interval, theme).
- [ ] 7.18. RU/EN UI локализация (i18next).
- [ ] 7.19. Accessibility: alt text всех изображений, ARIA labels на UI, keyboard nav для всех кнопок.
- [ ] 7.20. High-DPI testing.
- [ ] 7.21. App icon, splash screen.
- [ ] 7.22. About dialog с лицензиями.
- [ ] 7.23. First-run welcome tutorial.
- [ ] 7.24. Telemetry — **НЕТ** (offline-first, no network). Пункт = проверить, что нигде не утекают сетевые вызовы.
- [ ] 7.25. Финальная вычитка hotkey list — Ctrl+/ показывает.
- [ ] 7.26. **Header & Footer диалог** (Вставка → Колонтитулы): авто-поле даты/времени (фиксированная или обновляемая), текст футера, номер слайда, «не показывать на титульном». Расширяет page numbers (2.32) до полноценных колонтитулов. Хранение на уровне деки + рендер на слайдах/мастере.
- [ ] 7.27. **Секции** (группировка слайдов по разделам): добавить/переименовать/свернуть секцию, перемещать секции целиком, collapse в filmstrip. Модель: `deck.sections: [{id, title, slideIds}]` (или маркеры в slideOrder). UI в filmstrip (заголовки-разделители, сворачивание).
- [ ] 7.28. **Галерея стилей таблиц** (banded rows, стиль заголовка, акцентные схемы): преднабор стилей, применяемых к tableShape (чередование фона строк, выделение строки/столбца заголовка, рамки по теме). Один клик = весь стиль; хранить выбранный styleId + флаги (header row, banded, first col).
- [ ] 7.29. **Хардненинг Electron (безопасность).** Зафиксировать и проверить: `contextIsolation:true`, `sandbox` (по возможности), `nodeIntegration:false` (уже так — windows.ts), строгий **CSP** для renderer, ограничение `app://`-протокола и безопасное чтение произвольных путей (критично для B1 — связанные файлы). Запрет `webview`/новых окон без allowlist, валидация всех IPC-аргументов. Аудит перед релизом.
- [ ] 7.30. **Локальный лог крэшей** (телеметрии нет осознанно — 7.24): писать необработанные ошибки renderer/main + стек в `userData/logs/` (ротация). Кнопка «Открыть папку логов» в About/Preferences для разбора падений пользователем. Без отправки в сеть.

**Завершение фазы:** `git tag phase7-complete`.

---

## Phase 8 — Build & distribute (1 неделя)

**Цель (§11):** electron-builder NSIS, file associations, icon assets, code signing (опц.), installer testing, troubleshooting build pitfalls.

- [ ] 8.1. Сгенерировать `.ico` иконки (16/32/48/256) из 1024px PNG.
- [ ] 8.2. `electron-builder.yml` финализировать (§10.3).
- [ ] 8.3. `npm run build:win` — критерий: `dist/SlidesClone Setup x.y.z.exe` создан.
- [ ] 8.4. Запустить инсталлятор на чистой Win10 VM — критерий: app запускается.
- [ ] 8.5. Тест file association: двойной клик по `.gslx` открывает приложение с файлом.
- [ ] 8.6. Тест file association `.pptx`.
- [ ] 8.7. Single-instance lock + open-file forwarding.
- [ ] 8.8. (Опц.) Code signing через Azure Trusted Signing.
- [ ] 8.9. Smoke E2E на собранном `.exe` через Playwright `_electron.launch`.
- [ ] 8.10. Release notes в `RELEASES.md`; tag в git (`vX.Y.Z`).

**Завершение фазы:** `git tag phase8-complete`. Это финальный артефакт проекта.

---

## Backlog (на проработку, фаза не назначена)

Идеи за рамками текущих фаз — требуют отдельной проработки прежде, чем планировать.

- [ ] B1. Связанные данные графиков/таблиц с внешним файлом (Excel/CSV), refresh-on-open. Хранить путь к источнику + лист/диапазон; при открытии презентации (или по кнопке «Обновить связи») перечитывать файл и обновлять график/таблицу. Это НЕ realtime-синхронизация, а обновление по факту открытия — как «Edit Links to Files» в PowerPoint. Офлайн-реалистично (файл локальный). Нужно проработать: хранение относительных/абсолютных путей, поведение при отсутствии файла, безопасность чтения произвольных путей. (См. DECISIONS.md 2026-05-19.)
- [ ] B2. Редизайн UI в стиле PowerPoint: верхняя лента (ribbon) с вкладками (Главная / Вставка / Конструктор / Переходы / Анимация / Таблица и контекстные вкладки), контекстные меню по правому клику для всех объектов, и отказ от постоянной правой панели свойств в пользу ленты + диалогов + контекстных меню. По пожеланию пользователя (2026-05-20): «всё через кнопки сверху и вкладки, как в PP». Затрагивает весь UI (Toolbar → ribbon, Inspector → контекстные вкладки/диалоги). Нужно проработать раскладку, какие свойства куда уезжают, контекстные вкладки по типу выделенного объекта. Объёмная задача — отдельная фаза/итерация. Таблицы уже частично переведены на этот подход (контекстное меню по правому клику, Phase 3.9).
- [ ] B3. Формулы в таблицах (перенесено из 3.11c): мини-движок — ссылки A1/диапазоны A1:B5, арифметика + функции (SUM/AVERAGE/MIN/MAX/COUNT/IF/ROUND/…). MIT-движок (fast-formula-parser / formulajs), НЕ GPL HyperFormula. (См. DECISIONS.md 2026-05-19.)
- [ ] B4. Alt-текст на отдельные ячейки таблицы (перенесено из 3.11d): altText в схеме ячейки + пункт в контекстном меню + показ при наведении. Alt на всю таблицу уже работает.
- [ ] B5. Продвинутые оси диаграмм (перенесено из 3.14i): линейная/логарифмическая шкала, ручные min/max и шаг, ось дат (масштаб по времени), вторичная ось Y, единицы (×1000/млн), угол подписей. Параметры в chartShape (axisX/axisY: {type,min,max,majorUnit,logBase…}). (Запрос пользователя 2026-05-20.)
- [ ] B6. **SmartArt / диаграммы-схемы с авто-раскладкой:** оргструктура, процесс, цикл, иерархия, список, пирамида. Ключевое — **алгоритм авто-раскладки** узлов (а не ручные коннекторы): задаёшь дерево/список текстом → движок расставляет блоки и связи, перекомпонует при добавлении узла. Модель: smartArtShape с типом макета + узлами (text, children) + темой. Рендер блоков/стрелок на Konva, layout-движок per тип. Коннекторы (3.15) + shape library частично закрывают вручную, но без авто-раскладки это не SmartArt. Крупная отдельная задача. (Пробел отмечен пользователем 2026-05-21.)

---

## Финальный чеклист релиза (§16 SPEC.md)

Проверять перед тегом `v0.1.0`:

- [ ] `npm run typecheck` — 0 ошибок.
- [ ] `npm run lint` — 0 warnings.
- [ ] `npm test` — 100% зелёный, coverage > 70% для `lib/`.
- [ ] `npm run test:e2e` — все E2E зелёные.
- [ ] Round-trip тест: 5 reference `.pptx` файлов.
- [ ] PDF export корректен по размерам.
- [ ] Spell check RU + EN.
- [ ] Presenter mode на 2-м мониторе.
- [ ] Autosave + crash recovery (kill процесса → recover).
- [ ] File associations `.gslx` и `.pptx` на чистой VM.
- [ ] Installer для обычного пользователя.
- [ ] Uninstall сохраняет user data.
- [ ] Память: 100 слайдов / 30 мин / heap < 1 GB.
- [ ] 60 FPS drag в 100-слайдовом деке.
- [ ] Шрифты < 500 ms cold start.
- [ ] About dialog с лицензиями.
- [ ] README обновлён.
- [ ] Git tag `v0.1.0`.
