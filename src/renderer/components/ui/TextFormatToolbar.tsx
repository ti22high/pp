import { useEffect, useReducer } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useActiveEditorStore } from '@renderer/stores/activeEditor';
import { FONT_FAMILIES } from '@renderer/lib/fonts';
import { setTextLineHeight } from '@renderer/lib/slides';

const ALIGNS = [
  { key: 'left', label: '⬅' },
  { key: 'center', label: '⬌' },
  { key: 'right', label: '➡' },
  { key: 'justify', label: '☰' },
] as const;

const LINE_HEIGHTS = [1, 1.15, 1.5, 2];

// Контекстный тулбар форматирования текста (как лента в Word): появляется
// СВЕРХУ во время правки надписи. Шрифт/размер/Ж/К/Ч/цвет/выравнивание идут
// в активный TipTap-редактор; межстрочный — свойство блока (TextShape).
// data-keep-editing — клики по тулбару не закрывают инлайн-правку.
export function TextFormatToolbar() {
  const editor = useActiveEditorStore((s) => s.editor);
  const editingShapeId = useUiStore((s) => s.editingShapeId);
  const slideId = useUiStore((s) => s.activeSlideId);
  const [, force] = useReducer((x: number) => x + 1, 0);

  // Перерисовка тулбара при смене выделения/состояния редактора.
  useEffect(() => {
    if (!editor) return;
    const update = () => force();
    editor.on('transaction', update);
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('transaction', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor]);

  const lineHeight = useDeckStore((s) => {
    if (!slideId || !editingShapeId) return undefined;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === editingShapeId);
    return sh?.type === 'text' ? sh.lineHeight : undefined;
  });

  // Тулбар нужен только при активной правке текстовой надписи.
  if (!editor || !editingShapeId || !slideId) return null;

  const ts = editor.getAttributes('textStyle') as {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
  };
  const curFont = ts.fontFamily ?? '';
  const curSize = ts.fontSize ? parseFloat(ts.fontSize) || 20 : 20;
  const curColor = ts.color ?? '#202124';
  const curAlign =
    (['left', 'center', 'right', 'justify'] as const).find((a) => editor.isActive({ textAlign: a })) ??
    'left';

  return (
    <div className="chart-toolbar" data-keep-editing>
      <span className="chart-toolbar__label">Текст</span>
      <select
        className="inspector-select"
        value={curFont}
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
      >
        <option value="">Шрифт</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <input
        type="number"
        className="inspector-input wordart-toolbar__size"
        min={6}
        max={400}
        value={curSize}
        title="Размер"
        onChange={(e) => {
          const px = Math.max(6, Number(e.target.value) || 6);
          editor.chain().focus().setFontSize(`${px}px`).run();
        }}
      />
      <button
        type="button"
        className={`toolbar-btn${editor.isActive('bold') ? ' toolbar-btn--active' : ''}`}
        title="Жирный"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Ж
      </button>
      <button
        type="button"
        className={`toolbar-btn${editor.isActive('italic') ? ' toolbar-btn--active' : ''}`}
        title="Курсив"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        К
      </button>
      <button
        type="button"
        className={`toolbar-btn${editor.isActive('underline') ? ' toolbar-btn--active' : ''}`}
        title="Подчёркнутый"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        Ч
      </button>
      <label className="chart-toolbar__check">
        Цвет
        <input
          type="color"
          value={curColor}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
      <span className="toolbar-sep" />
      {ALIGNS.map((a) => (
        <button
          key={a.key}
          type="button"
          className={`toolbar-btn${curAlign === a.key ? ' toolbar-btn--active' : ''}`}
          title={`Выравнивание: ${a.key}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign(a.key).run()}
        >
          {a.label}
        </button>
      ))}
      <span className="toolbar-sep" />
      <label className="chart-toolbar__check">
        Интервал
        <select
          className="inspector-select wordart-toolbar__size"
          value={lineHeight ?? 1.2}
          onChange={(e) => setTextLineHeight(slideId, editingShapeId, Number(e.target.value))}
        >
          {!LINE_HEIGHTS.includes(lineHeight ?? 1.2) && <option value={1.2}>1.2</option>}
          {LINE_HEIGHTS.map((lh) => (
            <option key={lh} value={lh}>
              {lh.toFixed(2)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
