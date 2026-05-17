# PROGRESS.md — чеклист по фазам

Источник: `SPEC.md` §11 (roadmap) + §12 (детальный TODO).
Правило: 1 пункт = 1 atomic commit. Отмечать `[x]` сразу после успешного коммита.

---

## Phase 1 — Foundation (1 неделя)

**Цель (§11):** Скелет, Electron + Vite + React + TS, hello-window, IPC bridge, app:// protocol, FontFace loader, базовый layout (filmstrip / canvas / right panel).

- [x] 1.1. `git init`, `npm init`; добавить `.gitignore` (node_modules, out, dist, *.log) — критерий: чистый `git status`.
- [x] 1.2. Скопировать `package.json` из §9, `npm install` — критерий: 0 vulnerabilities high. _(1 high у xlsx без апстрим-фикса, см. BUGS.md и DECISIONS.md; запланирована замена на papaparse в Phase 3.)_
- [x] 1.3. Создать структуру папок (§8).
- [ ] 1.4. `electron.vite.config.ts` + `tsconfig.json` + `tsconfig.node.json` — критерий: `npm run typecheck` зелёный.
- [ ] 1.5. `src/main/index.ts`: создать `BrowserWindow`, загрузить renderer URL/файл — критерий: `npm run dev` открывает окно.
- [ ] 1.6. `src/preload/index.ts`: `contextBridge.exposeInMainWorld('api', {...})` с типизацией.
- [ ] 1.7. `src/renderer/main.tsx` + `App.tsx` + базовый CSS layout (header / filmstrip / canvas / inspector).
- [ ] 1.8. IPC channels enum в `src/shared/ipc-channels.ts`.
- [ ] 1.9. Custom protocol `app://` в main (`protocol.handle`) — для шрифтов и медиа.
- [ ] 1.10. Скрипт `scripts/download-fonts.ts` — скачать ~20 woff2 шрифтов в `resources/fonts/`.
- [ ] 1.11. `src/renderer/lib/fonts.ts`: FontFace loader; вызвать до маунта Canvas.
- [ ] 1.12. ESLint + Prettier + EditorConfig — критерий: `npm run lint` чистый.
- [ ] 1.13. Vitest + Playwright skeleton; добавить тест «main window opens».
- [ ] 1.14. `README.md` — обновить под фактический workflow (если нужно).
- [ ] 1.15. Native menu (`src/main/menu.ts`) с File / Edit / View / Insert / Slide / Format / Help.

**Завершение фазы:** `npm run typecheck && npm run lint && npm test` зелёное → `git tag phase1-complete`.

---

## Phase 2 — Core editor (3 недели)

**Цель (§11):** Stage + layers, shape types (text/rect/ellipse/line), drag/resize/rotate, TipTap text overlay, selection, undo/redo, smart guides, snap to grid, group/ungroup, z-order, copy/paste/duplicate, hotkeys.

- [ ] 2.1. Zustand stores: `deckStore`, `uiStore`, `selectionStore`, `historyStore`.
- [ ] 2.2. Zod-схемы модели (`src/renderer/lib/model/schema.ts`).
- [ ] 2.3. Создать пустую `Deck` factory (1 слайд 1920×1080).
- [ ] 2.4. `Canvas.tsx`: Konva `Stage` + layers; зум колесом мыши + Ctrl+0 reset.
- [ ] 2.5. Пан стейджа Space + drag.
- [ ] 2.6. `RectShape` Konva renderer + drag.
- [ ] 2.7. `Transformer` (Konva) для resize/rotate.
- [ ] 2.8. `EllipseShape`, `LineShape`, `PathShape` renderers.
- [ ] 2.9. Toolbar: insert shape buttons.
- [ ] 2.10. `TextShape` renderer + double-click → TipTap overlay.
- [ ] 2.11. TipTap setup: StarterKit + 12 расширений (см. §4.4).
- [ ] 2.12. Inspector panel: позиция / размер / rotation поля.
- [ ] 2.13. Inspector: fill (solid + gradient picker), stroke, opacity.
- [ ] 2.14. Inspector: shadow, reflection.
- [ ] 2.15. Selection: single click; Shift+click multi-select; rubber band.
- [ ] 2.16. Smart guides algorithm (`src/renderer/lib/snap.ts`).
- [ ] 2.17. Snap to grid (toggle в View menu).
- [ ] 2.18. Align / Distribute commands.
- [ ] 2.19. Z-order commands (`bringToFront`, etc).
- [ ] 2.20. Group / Ungroup.
- [ ] 2.21. Copy / Paste / Cut / Duplicate (Ctrl+C/V/X/D).
- [ ] 2.22. Delete (Del).
- [ ] 2.23. Undo / Redo (`src/renderer/lib/undo.ts`) + Ctrl+Z / Ctrl+Y.
- [ ] 2.24. Filmstrip с `react-virtuoso`, drag-reorder слайдов.
- [ ] 2.25. New slide, Duplicate, Delete, Hide commands.
- [ ] 2.26. Layouts: 10 встроенных layout-ов из §1.1.
- [ ] 2.27. Apply layout command.
- [ ] 2.28. Background editor (color / image / reset).
- [ ] 2.29. Slide size dialog (4:3, 16:9, custom).
- [ ] 2.30. Rulers (top + left).
- [ ] 2.31. Guides (add / edit / clear, snap to guides).
- [ ] 2.32. Page numbers (insert + on/off в master).
- [ ] 2.33. Hyperlink dialog (URL / slide / email / bookmark).
- [ ] 2.34. Special characters picker.
- [ ] 2.35. Keyboard shortcuts — полный набор (Ctrl+M new, Ctrl+/ help, …).
- [ ] 2.T. Тесты: unit для `snap.ts`, `undo.ts`, schema parsing; E2E «create slide, add shape, undo».

**Завершение фазы:** `git tag phase2-complete`.

---

## Phase 3 — Advanced editing (3 недели)

**Цель (§11):** Images (crop, mask, recolor), tables, charts (6 типов), connectors с auto-snap, freeform path, polyline, scribble, fill (gradient/image), shadow, reflection, alt text, гиперссылки, закладки.

- [ ] 3.1. Image insert (drag-n-drop + file dialog + paste from clipboard).
- [ ] 3.2. Image crop tool (handles внутри bbox).
- [ ] 3.3. Crop-to-shape (mask picker из shape gallery).
- [ ] 3.4. Image recolor (sepia / grayscale / tints).
- [ ] 3.5. Brightness / Contrast / Transparency sliders.
- [ ] 3.6. Replace image, Reset image.
- [ ] 3.7. Alt text dialog.
- [ ] 3.8. Table shape (Konva Group рендерит ячейки как Konva.Rect + Text).
- [ ] 3.9. Add / Delete row / col; merge / split cells; distribute evenly.
- [ ] 3.10. Cell formatting (bg, border, padding, align).
- [ ] 3.11. CSV drag-n-drop → Insert as table dialog (через SheetJS).
- [ ] 3.12. Chart shape: editor с встроенной мини-таблицей данных.
- [ ] 3.13. 6 chart types: bar, column, line, area, pie, scatter.
- [ ] 3.14. Custom colors, legend, axis titles.
- [ ] 3.15. Connector shape: straight / elbow / curved с auto-snap к connection points.
- [ ] 3.16. Freeform pen (scribble) — Konva.Line с tension.
- [ ] 3.17. Polyline, arc.
- [ ] 3.18. Gradient fill editor (multi-stop).
- [ ] 3.19. Image-fill для фигур.
- [ ] 3.20. Shape library panel: ~187 ECMA-376 preset shapes (SVG-paths).
- [ ] 3.21. WordArt mini-editor (text c outline + fill + font).
- [ ] 3.22. Bookmarks: добавить anchor на фигуру/текст; ссылка на bookmark в hyperlink dialog.
- [ ] 3.23. Speaker notes panel (TipTap).
- [ ] 3.24. KaTeX equation insert: dialog с LaTeX-полем + live preview; рендер как overlay (§6.6).
- [ ] 3.25. Group hyperlink propagation.
- [ ] 3.26. Lock / Unlock object.
- [ ] 3.27. Format painter.
- [ ] 3.28. Clear formatting.
- [ ] 3.29. Replace image preserves crop region.
- [ ] 3.30. Tests: chart rendering, equation rendering, connector auto-snap.

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
- [ ] 5.T. Тесты: round-trip 5 reference `.pptx` файлов; визуальный diff PDF.

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
