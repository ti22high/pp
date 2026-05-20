import { useEffect } from 'react';

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

// Справка по сочетаниям клавиш (команда `help:shortcuts`, Cmd+/).
// Группы соответствуют меню. Подписи клавиш универсальные (Ctrl/Cmd
// подставляется по платформе на лету).

const isMac =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

interface Row {
  keys: string;
  desc: string;
}
interface Group {
  title: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    title: 'Файл',
    rows: [
      { keys: `${MOD}+N`, desc: 'Создать' },
      { keys: `${MOD}+O`, desc: 'Открыть' },
      { keys: `${MOD}+S`, desc: 'Сохранить' },
      { keys: `${MOD}+Shift+S`, desc: 'Сохранить как' },
    ],
  },
  {
    title: 'Правка',
    rows: [
      { keys: `${MOD}+Z`, desc: 'Отменить' },
      { keys: `${MOD}+Shift+Z`, desc: 'Повторить' },
      { keys: `${MOD}+X / C / V`, desc: 'Вырезать / копировать / вставить' },
      { keys: `${MOD}+D`, desc: 'Дублировать' },
      { keys: `${MOD}+A`, desc: 'Выделить всё' },
      { keys: `${MOD}+H`, desc: 'Найти и заменить' },
      { keys: 'Delete / Backspace', desc: 'Удалить выделенное' },
      { keys: 'Esc', desc: 'Снять выделение' },
    ],
  },
  {
    title: 'Перемещение',
    rows: [
      { keys: '← ↑ → ↓', desc: 'Сдвинуть на 1 px' },
      { keys: 'Shift + стрелки', desc: 'Сдвинуть на 10 px' },
      { keys: 'Пробел + перетаскивание', desc: 'Панорамирование холста' },
    ],
  },
  {
    title: 'Вид',
    rows: [
      { keys: `${MOD}+=`, desc: 'Увеличить' },
      { keys: `${MOD}+-`, desc: 'Уменьшить' },
      { keys: `${MOD}+0`, desc: 'Сбросить масштаб (по размеру)' },
    ],
  },
  {
    title: 'Вставка',
    rows: [
      { keys: `${MOD}+K`, desc: 'Гиперссылка' },
      { keys: `${MOD}+Alt+M`, desc: 'Комментарий' },
    ],
  },
  {
    title: 'Слайд',
    rows: [
      { keys: `${MOD}+M`, desc: 'Новый слайд' },
      { keys: 'F5', desc: 'Начать показ' },
    ],
  },
  {
    title: 'Формат',
    rows: [
      { keys: `${MOD}+B`, desc: 'Полужирный' },
      { keys: `${MOD}+I`, desc: 'Курсив' },
      { keys: `${MOD}+U`, desc: 'Подчёркнутый' },
      { keys: `${MOD}+\\`, desc: 'Очистить форматирование' },
    ],
  },
  {
    title: 'Расположение',
    rows: [
      { keys: `${MOD}+G`, desc: 'Сгруппировать' },
      { keys: `${MOD}+Shift+G`, desc: 'Разгруппировать' },
      { keys: `${MOD}+]`, desc: 'Переместить вперёд' },
      { keys: `${MOD}+Shift+]`, desc: 'На передний план' },
      { keys: `${MOD}+[`, desc: 'Переместить назад' },
      { keys: `${MOD}+Shift+[`, desc: 'На задний план' },
    ],
  },
  {
    title: 'Справка',
    rows: [{ keys: `${MOD}+/`, desc: 'Сочетания клавиш' }],
  },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Сочетания клавиш</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>
        <div className="shortcuts__body">
          {GROUPS.map((g) => (
            <section key={g.title} className="shortcuts__group">
              <h3 className="shortcuts__group-title">{g.title}</h3>
              <dl className="shortcuts__list">
                {g.rows.map((r) => (
                  <div key={r.desc} className="shortcuts__row">
                    <dt className="shortcuts__keys">{r.keys}</dt>
                    <dd className="shortcuts__desc">{r.desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
