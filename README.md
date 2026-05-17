# SlidesClone

Offline-клон Google Slides для Windows. Полнофункциональный редактор презентаций без сети, упаковка — `.exe` (NSIS installer).

**Стек:** Electron 42 + React 19 + TypeScript 5.7 + Vite 7 + Konva 10 + TipTap 3 + Zustand 5 + PptxGenJS 4 + KaTeX 0.16.

**Платформа:** Windows 10/11 x64.

---

## Запуск в dev-режиме

```bash
npm install
npm run fonts:download   # один раз: качает ~20 woff2 в resources/fonts
npm run dev
```

Откроется окно Electron с hot-reload через electron-vite.

> Если `npm install` упал на postinstall — это ожидаемо в headless-окружении (см. `BUGS.md`).
> На Windows бинарник Electron обычно ставится автоматически; если нет — `node node_modules/electron/install.js`.

## Сборка инсталлятора (.exe)

```bash
npm run build:win
```

Результат — `dist/SlidesClone Setup 0.1.0.exe` (NSIS, perMachine, оффлайн).

## Прочие скрипты

```bash
npm run typecheck         # tsc --noEmit
npm run lint              # eslint . --max-warnings 0
npm run format            # prettier --write .
npm test                  # vitest run
npm run test:e2e          # playwright test (Electron-launcher; нужен npm run build)
npm run fonts:download    # подкачать bundled woff2 в resources/fonts
npm run rebuild:native    # пересобрать native-модули под Electron (нужно с Phase 7, better-sqlite3)
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
