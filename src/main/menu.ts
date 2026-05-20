import { Menu, BrowserWindow, app, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { IpcChannels } from '../shared/ipc-channels.js';

// Native-меню верхнего уровня. Все пункты — заглушки на Phase 1; реальные
// команды (File → Open, Insert → Image и т.п.) будут вешать обработчики
// в Phase 2-7. Сейчас пункты шлют canonical-команду в renderer через
// IpcChannels.MenuCommand, чтобы UI мог подписаться и логировать/обработать.
//
// Все user-facing подписи — на русском. Электроновские role-based items
// (undo/redo/cut/copy/paste/...) тоже переопределяем label-ом, чтобы они
// были по-русски независимо от системного locale.

function sendCommand(command: string): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send(IpcChannels.MenuCommand, command);
  }
}

const isMac = process.platform === 'darwin';

const template: MenuItemConstructorOptions[] = [
  // macOS требует первого пункта с именем приложения; на Windows/Linux пропускаем.
  ...(isMac
    ? ([
        {
          label: app.name,
          submenu: [
            { label: 'О программе SlidesClone', role: 'about' },
            { type: 'separator' },
            { label: 'Службы', role: 'services' },
            { type: 'separator' },
            { label: 'Скрыть SlidesClone', role: 'hide' },
            { label: 'Скрыть остальные', role: 'hideOthers' },
            { label: 'Показать все', role: 'unhide' },
            { type: 'separator' },
            { label: 'Выйти из SlidesClone', role: 'quit' },
          ],
        } satisfies MenuItemConstructorOptions,
      ] as const)
    : []),

  {
    label: 'Файл',
    submenu: [
      {
        label: 'Создать',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendCommand('file:new'),
      },
      {
        label: 'Открыть…',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendCommand('file:open'),
      },
      { type: 'separator' },
      {
        label: 'Сохранить',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendCommand('file:save'),
      },
      {
        label: 'Сохранить как…',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => sendCommand('file:save-as'),
      },
      { type: 'separator' },
      { label: 'Размер слайда…', click: () => sendCommand('file:slide-size') },
      { type: 'separator' },
      {
        label: 'Экспорт',
        submenu: [
          { label: 'PDF…', click: () => sendCommand('file:export-pdf') },
          { label: 'PPTX…', click: () => sendCommand('file:export-pptx') },
          { label: 'PNG (по слайдам)…', click: () => sendCommand('file:export-png') },
          { label: 'SVG (по слайдам)…', click: () => sendCommand('file:export-svg') },
          { label: 'TXT outline…', click: () => sendCommand('file:export-txt') },
        ],
      },
      { type: 'separator' },
      isMac ? { label: 'Закрыть окно', role: 'close' } : { label: 'Выйти', role: 'quit' },
    ],
  },

  {
    label: 'Правка',
    submenu: [
      {
        label: 'Отменить',
        accelerator: 'CmdOrCtrl+Z',
        click: () => sendCommand('edit:undo'),
      },
      {
        label: 'Повторить',
        accelerator: 'CmdOrCtrl+Shift+Z',
        click: () => sendCommand('edit:redo'),
      },
      { type: 'separator' },
      { label: 'Вырезать', role: 'cut' },
      { label: 'Копировать', role: 'copy' },
      // registerAccelerator:false — не перехватываем Cmd+V на уровне меню,
      // чтобы вставку картинок/таблиц/фигур обрабатывал renderer (Cmd+V keydown).
      { label: 'Вставить', role: 'paste', registerAccelerator: false },
      { label: 'Удалить', role: 'delete' },
      { type: 'separator' },
      {
        label: 'Выделить всё',
        accelerator: 'CmdOrCtrl+A',
        click: () => sendCommand('edit:select-all'),
      },
      {
        label: 'Дублировать',
        accelerator: 'CmdOrCtrl+D',
        click: () => sendCommand('edit:duplicate'),
      },
      { type: 'separator' },
      {
        label: 'Найти и заменить…',
        accelerator: 'CmdOrCtrl+H',
        click: () => sendCommand('edit:find-replace'),
      },
    ],
  },

  {
    label: 'Вид',
    submenu: [
      {
        label: 'Увеличить',
        accelerator: 'CmdOrCtrl+=',
        click: () => sendCommand('view:zoom-in'),
      },
      {
        label: 'Уменьшить',
        accelerator: 'CmdOrCtrl+-',
        click: () => sendCommand('view:zoom-out'),
      },
      {
        label: 'Сбросить масштаб',
        accelerator: 'CmdOrCtrl+0',
        click: () => sendCommand('view:zoom-reset'),
      },
      { type: 'separator' },
      {
        label: 'Показывать линейку',
        type: 'checkbox',
        checked: true,
        click: () => sendCommand('view:toggle-ruler'),
      },
      {
        label: 'Показывать сетку',
        type: 'checkbox',
        checked: false,
        click: () => sendCommand('view:toggle-grid'),
      },
      {
        label: 'Привязка к сетке',
        type: 'checkbox',
        checked: false,
        click: () => sendCommand('view:toggle-snap-grid'),
      },
      { type: 'separator' },
      {
        label: 'Направляющие',
        submenu: [
          {
            label: 'Добавить горизонтальную',
            click: () => sendCommand('view:add-guide-h'),
          },
          {
            label: 'Добавить вертикальную',
            click: () => sendCommand('view:add-guide-v'),
          },
          { type: 'separator' },
          {
            label: 'Очистить направляющие',
            click: () => sendCommand('view:clear-guides'),
          },
        ],
      },
      { type: 'separator' },
      { label: 'Полноэкранный режим', role: 'togglefullscreen' },
      { label: 'Инструменты разработчика', role: 'toggleDevTools' },
    ],
  },

  {
    label: 'Вставка',
    submenu: [
      { label: 'Текстовое поле', click: () => sendCommand('insert:text') },
      { label: 'Изображение…', click: () => sendCommand('insert:image') },
      { label: 'Фигура…', click: () => sendCommand('insert:shape') },
      { label: 'Таблица…', click: () => sendCommand('insert:table') },
      { label: 'Диаграмма…', click: () => sendCommand('insert:chart') },
      { label: 'Линия', click: () => sendCommand('insert:line') },
      { label: 'Формула…', click: () => sendCommand('insert:equation') },
      { type: 'separator' },
      { label: 'Видео…', click: () => sendCommand('insert:video') },
      { label: 'Аудио…', click: () => sendCommand('insert:audio') },
      { type: 'separator' },
      { label: 'Номер слайда…', click: () => sendCommand('insert:page-number') },
      { type: 'separator' },
      { label: 'Комментарий', accelerator: 'CmdOrCtrl+Alt+M', click: () => sendCommand('insert:comment') },
      { label: 'Гиперссылка…', accelerator: 'CmdOrCtrl+K', click: () => sendCommand('insert:hyperlink') },
      { label: 'Специальные символы…', click: () => sendCommand('insert:special-chars') },
    ],
  },

  {
    label: 'Слайд',
    submenu: [
      { label: 'Новый слайд', accelerator: 'CmdOrCtrl+M', click: () => sendCommand('slide:new') },
      { label: 'Дублировать слайд', click: () => sendCommand('slide:duplicate') },
      { label: 'Удалить слайд', click: () => sendCommand('slide:delete') },
      { label: 'Пропустить слайд', type: 'checkbox', click: () => sendCommand('slide:toggle-hidden') },
      { type: 'separator' },
      { label: 'Новый слайд из макета…', click: () => sendCommand('slide:apply-layout') },
      { label: 'Изменить тему…', click: () => sendCommand('slide:edit-theme') },
      { label: 'Фон…', click: () => sendCommand('slide:background') },
      { label: 'Переход…', click: () => sendCommand('slide:transition') },
      { type: 'separator' },
      {
        label: 'Начать показ',
        accelerator: 'F5',
        click: () => sendCommand('slide:present'),
      },
    ],
  },

  {
    label: 'Формат',
    submenu: [
      { label: 'Полужирный', accelerator: 'CmdOrCtrl+B', click: () => sendCommand('format:bold') },
      { label: 'Курсив', accelerator: 'CmdOrCtrl+I', click: () => sendCommand('format:italic') },
      { label: 'Подчёркнутый', accelerator: 'CmdOrCtrl+U', click: () => sendCommand('format:underline') },
      { type: 'separator' },
      {
        label: 'Выравнивание текста',
        submenu: [
          { label: 'По левому краю', click: () => sendCommand('format:align-left') },
          { label: 'По центру', click: () => sendCommand('format:align-center') },
          { label: 'По правому краю', click: () => sendCommand('format:align-right') },
          { label: 'По ширине', click: () => sendCommand('format:align-justify') },
        ],
      },
      { type: 'separator' },
      {
        label: 'Расположить объекты',
        submenu: [
          { label: 'Сгруппировать', accelerator: 'CmdOrCtrl+G', click: () => sendCommand('arrange:group') },
          { label: 'Разгруппировать', accelerator: 'CmdOrCtrl+Shift+G', click: () => sendCommand('arrange:ungroup') },
          { type: 'separator' },
          { label: 'На передний план', accelerator: 'CmdOrCtrl+Shift+]', click: () => sendCommand('arrange:to-front') },
          { label: 'Переместить вперёд', accelerator: 'CmdOrCtrl+]', click: () => sendCommand('arrange:forward') },
          { label: 'Переместить назад', accelerator: 'CmdOrCtrl+[', click: () => sendCommand('arrange:backward') },
          { label: 'На задний план', accelerator: 'CmdOrCtrl+Shift+[', click: () => sendCommand('arrange:to-back') },
          { type: 'separator' },
          { label: 'Выровнять по левому краю', click: () => sendCommand('arrange:align-left') },
          { label: 'Выровнять по центру (по горизонтали)', click: () => sendCommand('arrange:align-center-h') },
          { label: 'Выровнять по правому краю', click: () => sendCommand('arrange:align-right') },
          { type: 'separator' },
          { label: 'Выровнять по верхнему краю', click: () => sendCommand('arrange:align-top') },
          { label: 'Выровнять по середине (по вертикали)', click: () => sendCommand('arrange:align-middle') },
          { label: 'Выровнять по нижнему краю', click: () => sendCommand('arrange:align-bottom') },
          { type: 'separator' },
          { label: 'Распределить по горизонтали', click: () => sendCommand('arrange:distribute-h') },
          { label: 'Распределить по вертикали', click: () => sendCommand('arrange:distribute-v') },
        ],
      },
      { label: 'Очистить форматирование', accelerator: 'CmdOrCtrl+\\', click: () => sendCommand('format:clear') },
    ],
  },

  {
    label: 'Справка',
    submenu: [
      {
        label: 'Сочетания клавиш',
        accelerator: 'CmdOrCtrl+/',
        click: () => sendCommand('help:shortcuts'),
      },
      {
        label: 'Документация',
        click: () => void shell.openExternal('https://github.com/ti22high/pp'),
      },
      { type: 'separator' },
      { label: 'О программе SlidesClone', click: () => sendCommand('help:about') },
    ],
  },
];

export function buildAppMenu(): void {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
