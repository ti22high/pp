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
- Ветка: **`claude/read-latest-handoff-e2kfl`** — сюда коммитим и пушим всё.
- Фазы 1–3 в основном закрыты (advanced editing, формулы MathLive + рукописный
  ink-ввод $P). Шли по **Phase 5 (Import/Export)**, затем — **разворот** (ниже).
- Тесты: **167 проходят** (`npm test`), typecheck/lint зелёные.
- ⚠️ **Push из этого контейнера работает ТОЛЬКО через GitHub MCP** (`push_files`),
  прямой `git push` падает (нет токена). Локальный git при этом расходится по SHA
  с remote — после MCP-пуша делать `git fetch` + `git reset --hard origin/<ветка>`.

## 🔴 ТЕКУЩИЙ ПРИОРИТЕТ — разворот: инструмент-мост «починка .pptx для Р7»
Полная история — `DECISIONS.md` (2026-08-14) и переписка. Кратко:
- **Реальная задача пользователя НЕ «1-в-1 редактор».** У него Р7 Офис
  (OnlyOffice) ломает большие Windows-овые `.pptx` — слайды пропадают/в мусор.
  Нужен инструмент, который **починит файл так, чтобы Р7 его открыл**, дальше он
  работает в Р7.
- **1-в-1 рендер произвольного .pptx своим парсером НЕДОСТИЖИМ** (это не умеют
  ни Google Slides, ни Keynote). Пользователь это направление отверг. Парсер
  (Спринт B, `src/renderer/lib/pptx/parser/*`) остаётся для просмотра/будущего
  редактирования, но НЕ приоритет.
- **Два пути починки (оба обходят 1-в-1):**
  1. `scripts/fix-pptx-for-r7.sh` — прогон через **LibreOffice** (`--convert-to
     pptx`): пересохранение чистит OOXML, Р7 переваривает. MPL/LGPL, не AGPL.
  2. `scripts/split-pptx.ts` — **нарезка** большого файла на части по N слайдов
     (каждая — валидный .pptx с мастерами/темами + только нужные медиа).
     Проверено на 46 и 200 слайдах: все ссылки на слайды/медиа целы.
- **ЖДЁМ от пользователя результат теста** обоих скриптов на РЕАЛЬНОМ ломающемся
  файле в Р7 (в контейнере LibreOffice не стартует, Р7 нет — проверить нельзя).
  От исхода зависит, какой путь встраивать в UI приложения (drag-drop → фикс).
- Вспомогательное: `scripts/duplicate-pptx-slides.ts` (раздуть файл для
  нагрузки), `scripts/gen-test-pptx.ts` (сгенерить тестовый .pptx).

## Что было сделано в Phase 5 до разворота (на ветке, парсер рабочий)
- Спринт A: **MediaManager** (`src/main/media.ts` + `app://media/<sha256>`),
  картинки/фон мигрированы с data-URL на файлы, `file:pick` IPC (открытие ≤500МБ).
- Спринт B: парсер `.pptx` (`src/renderer/lib/pptx/parser/*`) — XML/zip/EMU/rels,
  presentation/theme/slide, sp/pic/table/chart/text, placeholder-inheritance от
  layout/master, декор от master/layout, group-transform (chOff/chExt). File→Open
  импортирует .pptx с прогрессом. Даёт ~редактируемую модель, но НЕ 1-в-1.

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
- Сторы: `src/renderer/stores/` — `deck`, `ui`, `selection`, `clipboard`, `guides`.
- Холст: `components/editor/Canvas.tsx` — Konva Stage, 2 слоя, pan/zoom,
  режимы рисования, rubber-band, multi-drag.
- Парсер .pptx: `src/renderer/lib/pptx/parser/*` (Спринт B), UI импорта
  `lib/openPptx.ts` + `components/ui/ImportProgressDialog.tsx`.
- MediaManager: `src/main/media.ts`, IPC `src/main/ipc/media.ts` и `file.ts`,
  протокол `app://media/*` в `src/main/protocol.ts`.

## Как продолжить
1. **Сначала** — узнать у пользователя результат теста `fix-pptx-for-r7.sh` и
   `split-pptx.ts` на реальном ломающемся файле в Р7 (см. приоритет выше).
2. По исходу — встроить победивший путь в приложение: экран «Починить .pptx»
   (drag-drop файла → LibreOffice-нормализация и/или нарезка → готовый файл/части).
   LibreOffice вызывать из main-процесса (child_process), не из renderer.
3. Гейты: typecheck/lint/test → commit (`feat(p5): …`) → **push через GitHub MCP
   `push_files`** (прямой git push не работает) → `git reset --hard origin/ветка`.
4. Пользователь тестирует в реальном Electron на **macOS** и активно даёт фидбек —
   реагировать оперативно, не уходить в долгие автономные циклы.
