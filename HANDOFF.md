# HANDOFF — старт для новой Claude-сессии

Краткий контекст, чтобы продолжить без потери нити. Источники истины:
`CLAUDE.md` (правила), `SPEC.md` (фичи), `PROGRESS.md` (план/чеклист),
`DECISIONS.md` (журнал решений), `BUGS.md` (баги/ограничения), `TESTS.md`
(ручные smoke-тесты).

## Что за проект
SlidesClone — десктопный редактор презентаций (клон PowerPoint/Google Slides),
**offline-first**, целевая платформа — **Windows** (`npm run build:win` → NSIS
`.exe`). Стек: **Electron 42 + React 19 + TypeScript + Konva/react-konva** (холст),
**TipTap 3** (текст), **Zustand + immer** (состояние), **Zod** (схема модели),
**SheetJS / JSZip / fast-xml-parser** (CSV/xlsx/графики).

## Где мы сейчас
- Ветка: **`claude/setup-project-files-RFewL`** — сюда коммитим и пушим всё.
- Фазы 1–2 закрыты. Идёт **Phase 3 (Advanced editing)**.
- Последнее сделано: **3.18** (мульти-стоп редактор градиента + фикс геометрии).
- **Следующее по плану: 3.19** (image fill — заливка фигуры картинкой). Дальше
  3.20+ (shape library, equations и т.д.) — см. `PROGRESS.md` Phase 3.
- Тесты: **60 проходят** (`npm test`), typecheck/lint зелёные.
- В Backlog (НЕ делать без явной просьбы): B1 связанные данные, B2 ribbon-UI,
  B3 формулы таблиц, B4 alt на ячейки, B5 продвинутые оси графиков, B6 SmartArt.

## Жёсткие правила (из CLAUDE.md)
1. **1 пункт плана = 1 atomic commit.** После каждого: `npm run typecheck &&
   npm run lint && npm test` — коммит только если зелёное.
2. Conventional commits с префиксом фазы: `feat(p3): …`, `fix(p3): …`.
3. **Комментарии в коде — только русские**; идентификаторы — английские.
4. Отмечать `[x]` в `PROGRESS.md` после каждого пункта.
5. Не задавать лишних вопросов (решать по SPEC, спорное — в `DECISIONS.md`),
   НО пользователь активно тестирует и даёт фидбек — оперативно реагировать.
6. Не пушить в main; никаких force-push/reset/`--no-verify` без явной команды.

## Архитектура (ключевое)
- Модель: `src/renderer/lib/model/schema.ts` (Zod = источник TS-типов),
  `factory.ts`. Фигуры — discriminated union по `type`: rect/ellipse/line/path/
  text/image/table/chart/connector.
- Сторы: `src/renderer/stores/` — `deck`, `ui` (режимы/флаги диалогов/penMode/
  polylineMode/arcMode/editPointsShapeId/…), `selection`, `clipboard`, `guides`.
- Холст: `components/editor/Canvas.tsx` — Konva Stage, 2 слоя (контент +
  оверлеи), pan/zoom, режимы рисования, rubber-band, multi-drag.
- Фигуры: `components/editor/shapes/*` — обёртка `ShapeNode` + `*ShapeView`;
  fill/stroke/shadow → `paint.ts` (`resolveFill(fill,w,h,cx,cy)`).
- Оверлеи на ВЕРХНЕМ слое (не внутри draggable-группы — иначе дрожь):
  `SelectionTransformer` (коннекторы исключены), `TableResizeOverlay`,
  `ConnectorOverlay`, `PathEditOverlay`, `AltHoverOverlay`, `CropOverlay`,
  `TableCellEditor`.
- Инспектор (правая панель, сворачиваемая): `components/inspector/*`.
- Диалоги/панели: `components/ui/*`. Тулбар: `components/toolbar/Toolbar.tsx`.
- lib: `table.ts`, `chart.ts`, `connector.ts`, `freeform.ts`, `pathEdit.ts`,
  `csvImport.ts`, `xlsxCharts.ts`, `imageFilters.ts`, `imageBake.ts`, `snap.ts`,
  `undo.ts`, `align.ts`, `zorder.ts`, `group.ts`, `clipboard.ts`, `slides.ts`.

## Реализовано в Phase 3
- Изображения: вставка/кроп/маски/перекраска/яркость-контраст/replace-reset/
  alt-текст (общая секция для любой фигуры + показ при наведении).
- Таблицы: вставка N×M, строки/столбцы/merge/split/distribute и формат —
  через **правый клик** (не правую панель); ресайз колонок/строк; стили текста
  ячейки; CSV/xlsx импорт; **вставка из Excel/Sheets** (Cmd+V); «Создать
  диаграмму из таблицы».
- Графики (Konva, НЕ Chart.js): 14 типов; мини-таблица данных; цвета/легенда/
  сетка/подписи/формат чисел/заголовок(top|bottom)/позиция легенды; контекстный
  тулбар сверху; импорт графиков из .xlsx.
- Коннекторы: straight/elbow/curved, стрелки, ручки концов + магнит к 9 точкам
  фигур, ручка средней секции elbow, маршрут/стрелки через правый клик.
- Рисование: Карандаш (freeform), Ломаная, Дуга (рисуется протяжкой → сразу
  правка точек); «Изменить точки» (Безье-усы) для path; градиент multi-stop.

## Важные нюансы / решения (детали — DECISIONS.md)
- **Вставка из буфера**: читаем системный буфер через `window.api.clipboard`
  (Electron) по `Cmd+V` в `useShapeClipboard` (DOM paste на холсте ненадёжно).
  Пункт меню «Вставить» — `registerAccelerator:false`. Приоритет: таблица →
  картинка → внутренние фигуры.
- **Из Google Sheets график вставляется только картинкой** (в буфере нет данных;
  экспорт в .xlsx тоже растеризует график). Редактируемый из Excel-буфера —
  только Windows (`Embed Source`/OLE), запланировано в 3.14h.
- **B2 (ribbon)**: пользователь хочет UX как в PowerPoint — управление через
  верхние вкладки + контекстные меню, без постоянной правой панели. Таблицы и
  графики уже частично переведены на этот подход. Полный редизайн — отдельно.
- Правки в `src/main/*` и `src/preload/*` требуют **полного рестарта** Electron
  (Vite HMR их не подхватывает) — предупреждать пользователя.
- Konva-оверлеи: не писать в стор на каждый dragmove, если это пересчитывает
  позицию ручки → дрожь (см. историю TableResizeOverlay/коннекторов).
- Гейты качества: `typecheck`/`lint`/`test` локально; **CI намеренно нет**
  (локальный воркфлоу, DECISIONS 2026-05-21).

## Тестовые файлы (ручная проверка)
- `samples/csv/*` — CSV (разделители/кодировки/BOM/рваные строки).
- `samples/xlsx/*` — книги; `05/06` со встроенными графиками (для 3.14c).
- `samples/html/styled-table.html` — стилизованная таблица (перенос формата).

## Как продолжить
1. Открой `PROGRESS.md` → первый `[ ]` в Phase 3 (сейчас **3.19**).
2. Перечитай релевантный раздел `SPEC.md`.
3. Реализуй → typecheck/lint/test → commit (`feat(p3): …`) → push → `[x]`.
4. Реагируй на фидбек пользователя (тестирует в реальном Electron на macOS).
