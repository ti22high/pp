# HANDOFF.md — что сделано и где продолжать

Документ для передачи контекста новой Claude-сессии. Читать сразу после `CLAUDE.md` и `SPEC.md`.

---

## TL;DR

- **Phase 1** закрыта (тег `phase1-complete`).
- **Phase 2** закрыта **на 2.27** включительно. Следующий пункт — **2.28** (Background editor).
- **Ветка**: `claude/setup-project-files-RFewL`. Все коммиты запушены.
- Запуск: `npm run dev` (на macOS — нужен полный рестарт после правок `src/main/*` и `src/main/menu.ts`).

---

## Что работает (Phase 2.1–2.27)

### Канвас и фигуры
- `Stage` 1920×1080, zoom колесом (вокруг указателя), zoom через меню «Вид → Увеличить/Уменьшить/Сбросить» (вокруг центра канваса).
- **Auto-fit on init / Cmd+0**: слайд автоматически вписывается в канвас с отступом 5 %.
- Пан Space + drag (по пустой области; на фигуре — двигает фигуру, как было изначально).
- Фигуры: `RectShape`, `EllipseShape`, `LineShape` (+ стрелка через `arrowEnd/arrowStart`), `PathShape` (SVG-данные с пропорциональным scale-рендером в bbox), `TextShape`.
- Transformer: resize 8 анкорами (для линии — 4 угловых), rotate, padding=0. Multi-Selection даёт общий bbox.
- Smart guides (`src/renderer/lib/snap.ts`): 6 anchor-ов на фигуру, threshold 6/zoom, snap к другим фигурам + bbox слайда. Розовые линии-направляющие.
- Snap to grid (10 px), показ сетки — toggle через меню «Вид».
- Drag, group-drag (через Canvas custom multi-drag — Konva native drag отключён в multi-selection), resize/rotate всех типов фигур.
- Live-обновление Inspector + filmstrip во время drag (включая multi-drag).

### Текст (TipTap)
- TextShape → Konva.Text + DOM-overlay при double-click.
- `text?` поле в `baseShape` — позволяет **«текст в любой фигуре»** (rect/ellipse/path) по double-click. Тот же `TextOverlay`, тот же TipTap-editor.
- `extensions.ts`: StarterKit + TextStyleKit (FontSize/Color/FontFamily/LineHeight/BackgroundColor) + Underline + Subscript + Superscript + Link + Highlight + TextAlign.
- `font-size` оверлея масштабируется на `zoom` — нет «прыжка» при focus/blur.
- Оверлей прозрачный, центрирован — совпадает с Konva `align/verticalAlign="center"/"middle"`.

### Inspector (правая панель)
- Локализован на русский. Секции: **Положение** (X/Y/Ш/В/Поворот), **Заливка** (Без / Сплошная / Градиент: linear+radial, угол, From/To), **Обводка** (вкл/выкл, цвет, толщина, стиль), **Тень** (offset, blur, color, alpha), **Отражение** (alpha, dist, size — рендер только в Phase 3), **Прозрачность** (slider 0–100 %).
- `NumberField` с буфером + commit на Enter/blur + Escape-rollback + Arrow up/down (Shift = ×10).
- `ColorField` с native swatch + hex-input.
- Multi-selection: показывает количество, без редактирования (group-edit в Phase 2.15-ext).

### Filmstrip
- `react-virtuoso` (виртуализация — рассчитан на 1000+ слайдов).
- HTML5 drag-and-drop переупорядочивание (`slideOrder`).
- Превью: внутренний слой 1920×1080 со всеми фигурами в slide-coords + `transform: scale(140/1920)` → пиксель-перфектное миниатюрное превью.
- Path в превью рендерится через SVG (`vector-effect: non-scaling-stroke`).
- Скрытые слайды (`hidden`) показаны opacity 0.45 + ⊘.
- Live-обновление превью во время drag.

### Меню и хоткеи
- Все надписи по-русски. Поддержка mac (top-bar) + Win/Linux (in-window menu bar).
- **Правка**: Отменить/Повторить (Cmd+Z, Shift+Cmd+Z) → snapshot-based undo с дебаунсом 300 мс. Cut/Copy/Paste/Duplicate (через `lib/clipboard.ts`). Select All (Cmd+A → выделяет все фигуры активного слайда, не текст браузера).
- **Вид**: Zoom/grid/snap-to-grid через `useMenuCommands` + IPC bridge.
- **Слайд**: Новый (Cmd+M), Дублировать, Удалить, Пропустить, Новый из макета (10 layouts через `LayoutPicker`).
- **Формат → Расположить объекты**: Align (6 mode) / Distribute (h/v) / Z-order (front/forward/backward/back) / Group/Ungroup (Cmd+G).
- **Del / Backspace** — удалить выделенное (вне input).
- macOS `ApplePressAndHoldEnabled=false` в `windows.ts` — чтобы зажатая клавиша повторяла в TipTap.

### Архитектура
- Zustand-сторы: `deckStore` (immer-middleware), `uiStore`, `selectionStore`, `clipboardStore`, `guidesStore`.
- Подписки в Canvas/ShapeView мемоизированы через `React.memo` + `useShallow` где надо.
- Immer reuse: при мутации одной фигуры остальные shape-объекты сохраняют ссылку → memo пропускает re-render.
- История: snapshot-based через `useDeckStore.subscribe` с debounce 300 мс. Игнорирует переходы null↔Deck (создание дека при первом запуске).

---

## Что НЕ работает / ожидает

- **2.28+** не сделаны.
- **Reflection** — UI в Inspector есть, рендер на канвасе — Phase 3 (см. `BUGS.md`).
- **Image-fill** в Inspector — отсутствует (Phase 3.19).
- **Multi-edit Inspector** для 2+ выделенных — Phase 2.15-ext / 3.
- **Резайз-snap** (snap при изменении размеров) — Phase 3.
- **Honest PNG-thumbnail** через OffscreenCanvas+Worker (§6.9) — Phase 3+. Сейчас CSS-transform-scale preview.
- Шрифты `JetBrains Mono` могут не скачаться с fontsource-CDN (см. BUGS.md). Не блокирует.
- Хоткеи Cmd+] / Cmd+[ (z-order) не работают на русской раскладке — нужен layout-independent listener (Phase 2.35).

---

## Карта файлов (что где)

```
src/
  main/
    index.ts                     # bootstrap, single-instance, ApplePressAndHoldEnabled
    menu.ts                      # все меню (русский), отправляет IPC sendCommand
    windows.ts                   # BrowserWindow + disable chromium webContents zoom
    protocol.ts                  # app:// custom protocol
  preload/
    index.ts                     # contextBridge: getVersions + onMenuCommand
    types.ts                     # PreloadApi types
  renderer/
    App.tsx                      # root, init deck, mounts hooks, LayoutPicker
    main.tsx                     # createRoot
    stores/
      deck.ts                    # Zustand + immer
      ui.ts                      # active slide, zoom, pan, snap toggles, editingShapeId
      selection.ts               # selectedShapeIds[] + select/toggle/clear
      clipboard.ts               # in-app буфер обмена
      guides.ts                  # активные smart-guides с дедупом
    lib/
      model/
        schema.ts                # Zod schemas: Deck/Slide/Shape (rect/ellipse/line/path/text)
        factory.ts               # createEmptyDeck/createRect/...
        layouts.ts               # 10 встроенных layout-ов (§1.1)
      align.ts                   # alignShapes / distributeShapes
      zorder.ts                  # reorderZ (to-front/forward/backward/to-back)
      group.ts                   # expandToGroups, canGroup, canUngroup
      clipboard.ts               # copy/cut/paste/duplicate/deleteSelected/selectAll
      slides.ts                  # newSlide/duplicateSlide/deleteSlide/toggleHidden/applyLayout
      snap.ts                    # computeSnap, unionBox
      undo.ts                    # initHistory + undo() + redo() (snapshot+300ms debounce)
      fonts.ts                   # FontFace loader
      editor/extensions.ts       # TipTap расширения
    hooks/
      useMenuCommands.ts         # роутер native-меню → action
      useShapeClipboard.ts       # keydown C/X/V/D/A + Del/Backspace
      useUndoRedo.ts             # keydown Cmd+Z / Cmd+Shift+Z
    components/
      editor/
        Canvas.tsx               # Stage host: pan/zoom/rubber-band/multi-drag/menu-zoom
        Slide.tsx                # рендер фигур в порядке slide.shapes
        SelectionTransformer.tsx # Konva.Transformer, 2 useEffect (nodes/forceUpdate)
        TextOverlay.tsx          # TipTap DOM overlay поверх любой фигуры
        shapes/
          ShapeNode.tsx          # Group wrapper: draggable, onDblClick → open overlay
          RectShapeView.tsx, EllipseShapeView.tsx, LineShapeView.tsx,
          PathShapeView.tsx, TextShapeView.tsx, ShapeTextLabel.tsx
          paint.ts               # resolveFill/resolveStroke/resolveShadow
      filmstrip/
        Filmstrip.tsx            # Virtuoso список
        FilmstripItem.tsx        # превью через CSS-transform scale + SVG для path
      inspector/
        Inspector.tsx, NumberField.tsx, ColorField.tsx,
        TransformInspector.tsx, FillInspector.tsx, StrokeInspector.tsx,
        ShadowInspector.tsx, ReflectionInspector.tsx, OpacityInspector.tsx
      toolbar/Toolbar.tsx        # кнопки insert
      ui/LayoutPicker.tsx        # модалка 10 layout-ов
    styles/app.css               # все стили (без отдельных модулей)
```

---

## Известные UX-договорённости (важно для preservation)

- **Текст в фигуре**: double-click на rect/ellipse/path открывает TipTap-оверлей с `shape.text`. См. DECISIONS 2026-05-19 (extension).
- **Apply layout** = **создать НОВЫЙ слайд** из макета (НЕ накладывать на текущий).
- **Multi-drag**: только Canvas-level (не Konva native), пишет позиции в стор каждый mousemove.
- **Snap-цели**: другие фигуры + bbox слайда. Multi-drag тоже учитывает слайд.
- **Цвет**: hex strict, через UI имена цветов (red, blue) не вводятся.
- **Pan** свободный, без clamping. Cmd+0 возвращает в центр.

---

## Чеклист перед началом 2.28

1. Прочитать `SPEC.md` §11 (Phase 2 цели) и §12 (детальный TODO).
2. Прочитать соответствующую секцию SPEC: для 2.28 — §1.6 (Slide backgrounds).
3. Проверить, что в схеме `slideBackgroundSchema` уже есть (`color` / `image` / `theme`).
4. Создать `BackgroundEditor` модалку (по аналогии с `LayoutPicker`).
5. Подключить в меню «Слайд → Фон…» (команда `slide:background` уже шлётся).
6. Записать решения в `DECISIONS.md`.

---

## Где смотреть baseline-decisions

- `DECISIONS.md` — все непустые решения по фазам, в т.ч. версии deps, snap MVP, undo strategy, gradient stops, clipboard internal, group flat-id, layouts/applyLayout, текст в фигуре.
- `BUGS.md` — xlsx CVE (Phase 3), reflection render (Phase 3), fontsource fonts (network).
- `TESTS.md` — 30 smoke-tests для ручной проверки.
