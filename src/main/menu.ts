import { Menu, BrowserWindow, app, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { IpcChannels } from '../shared/ipc-channels.js';

// Native-меню верхнего уровня. Все пункты — заглушки на Phase 1; реальные
// команды (File → Open, Insert → Image и т.п.) будут вешать обработчики
// в Phase 2-7. Сейчас пункты шлют canonical-команду в renderer через
// IpcChannels.MenuCommand, чтобы UI мог подписаться и логировать/обработать.

// Отправляет команду в активное окно (renderer слушает через preload bridge).
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
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        } satisfies MenuItemConstructorOptions,
      ] as const)
    : []),

  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendCommand('file:new'),
      },
      {
        label: 'Open…',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendCommand('file:open'),
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendCommand('file:save'),
      },
      {
        label: 'Save As…',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => sendCommand('file:save-as'),
      },
      { type: 'separator' },
      {
        label: 'Export',
        submenu: [
          { label: 'PDF…', click: () => sendCommand('file:export-pdf') },
          { label: 'PPTX…', click: () => sendCommand('file:export-pptx') },
          { label: 'PNG (per slide)…', click: () => sendCommand('file:export-png') },
          { label: 'SVG (per slide)…', click: () => sendCommand('file:export-svg') },
          { label: 'TXT outline…', click: () => sendCommand('file:export-txt') },
        ],
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },

  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { type: 'separator' },
      { role: 'selectAll' },
      { type: 'separator' },
      {
        label: 'Find and replace…',
        accelerator: 'CmdOrCtrl+H',
        click: () => sendCommand('edit:find-replace'),
      },
    ],
  },

  {
    label: 'View',
    submenu: [
      {
        label: 'Zoom in',
        accelerator: 'CmdOrCtrl+=',
        click: () => sendCommand('view:zoom-in'),
      },
      {
        label: 'Zoom out',
        accelerator: 'CmdOrCtrl+-',
        click: () => sendCommand('view:zoom-out'),
      },
      {
        label: 'Reset zoom',
        accelerator: 'CmdOrCtrl+0',
        click: () => sendCommand('view:zoom-reset'),
      },
      { type: 'separator' },
      {
        label: 'Show ruler',
        type: 'checkbox',
        checked: true,
        click: () => sendCommand('view:toggle-ruler'),
      },
      {
        label: 'Show grid',
        type: 'checkbox',
        checked: false,
        click: () => sendCommand('view:toggle-grid'),
      },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      { role: 'toggleDevTools' },
    ],
  },

  {
    label: 'Insert',
    submenu: [
      { label: 'Text box', click: () => sendCommand('insert:text') },
      { label: 'Image…', click: () => sendCommand('insert:image') },
      { label: 'Shape…', click: () => sendCommand('insert:shape') },
      { label: 'Table…', click: () => sendCommand('insert:table') },
      { label: 'Chart…', click: () => sendCommand('insert:chart') },
      { label: 'Line', click: () => sendCommand('insert:line') },
      { label: 'Equation…', click: () => sendCommand('insert:equation') },
      { type: 'separator' },
      { label: 'Video…', click: () => sendCommand('insert:video') },
      { label: 'Audio…', click: () => sendCommand('insert:audio') },
      { type: 'separator' },
      { label: 'Comment', accelerator: 'CmdOrCtrl+Alt+M', click: () => sendCommand('insert:comment') },
      { label: 'Hyperlink…', accelerator: 'CmdOrCtrl+K', click: () => sendCommand('insert:hyperlink') },
      { label: 'Special characters…', click: () => sendCommand('insert:special-chars') },
    ],
  },

  {
    label: 'Slide',
    submenu: [
      { label: 'New slide', accelerator: 'CmdOrCtrl+M', click: () => sendCommand('slide:new') },
      { label: 'Duplicate slide', click: () => sendCommand('slide:duplicate') },
      { label: 'Delete slide', click: () => sendCommand('slide:delete') },
      { label: 'Skip slide', type: 'checkbox', click: () => sendCommand('slide:toggle-hidden') },
      { type: 'separator' },
      { label: 'Apply layout…', click: () => sendCommand('slide:apply-layout') },
      { label: 'Edit theme…', click: () => sendCommand('slide:edit-theme') },
      { label: 'Background…', click: () => sendCommand('slide:background') },
      { label: 'Transition…', click: () => sendCommand('slide:transition') },
      { type: 'separator' },
      {
        label: 'Present',
        accelerator: 'F5',
        click: () => sendCommand('slide:present'),
      },
    ],
  },

  {
    label: 'Format',
    submenu: [
      { label: 'Bold', accelerator: 'CmdOrCtrl+B', click: () => sendCommand('format:bold') },
      { label: 'Italic', accelerator: 'CmdOrCtrl+I', click: () => sendCommand('format:italic') },
      { label: 'Underline', accelerator: 'CmdOrCtrl+U', click: () => sendCommand('format:underline') },
      { type: 'separator' },
      { label: 'Align', submenu: [
        { label: 'Left', click: () => sendCommand('format:align-left') },
        { label: 'Center', click: () => sendCommand('format:align-center') },
        { label: 'Right', click: () => sendCommand('format:align-right') },
        { label: 'Justify', click: () => sendCommand('format:align-justify') },
      ] },
      { label: 'Clear formatting', accelerator: 'CmdOrCtrl+\\', click: () => sendCommand('format:clear') },
    ],
  },

  {
    label: 'Help',
    submenu: [
      {
        label: 'Keyboard shortcuts',
        accelerator: 'CmdOrCtrl+/',
        click: () => sendCommand('help:shortcuts'),
      },
      {
        label: 'Documentation',
        click: () => void shell.openExternal('https://github.com/ti22high/pp'),
      },
      { type: 'separator' },
      { label: 'About SlidesClone', click: () => sendCommand('help:about') },
    ],
  },
];

export function buildAppMenu(): void {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
