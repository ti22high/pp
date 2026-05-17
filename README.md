# SlidesClone

Offline-клон Google Slides для Windows. Полнофункциональный редактор презентаций без сети, упаковка — `.exe` (NSIS installer).

**Стек:** Electron 42 + React 19 + TypeScript 6 + Konva 10 + TipTap 3 + Zustand 5 + PptxGenJS 4 + KaTeX 0.16.

**Платформа:** Windows 10/11 x64.

---

## Запуск в dev-режиме

```bash
npm install
npm run dev
```

Откроется окно Electron с hot-reload через electron-vite.

## Сборка инсталлятора (.exe)

```bash
npm run build:win
```

Результат — `dist/SlidesClone Setup 0.1.0.exe` (NSIS, perMachine, оффлайн).

## Прочие скрипты

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint . --max-warnings 0
npm run format         # prettier --write .
npm test               # vitest run
npm run test:e2e       # playwright test (Electron-launcher)
```

---

## Документы проекта

- **`SPEC.md`** — полная техническая спецификация (источник истины).
- **`PROGRESS.md`** — чеклист по фазам 1–8, по которому ведётся разработка.
- **`CLAUDE.md`** — рабочая инструкция Claude Code на каждую сессию.
- **`TESTS.md`** — 30 ручных smoke-тестов, прогон после каждой фазы.
- **`DECISIONS.md`** — журнал решений, принятых при неопределённости спеки.
- **`BUGS.md`** — журнал нерешённых багов и блокеров.

## Лицензия

Внутренний проект. Все используемые зависимости — MIT / Apache-2.0 / BSD. AGPL-зависимости и tldraw 4.x запрещены к использованию.
