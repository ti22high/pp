import { useEffect, useReducer } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useActiveEditorStore } from '@renderer/stores/activeEditor';
import { FONT_FAMILIES } from '@renderer/lib/fonts';
import { setTextLineHeight } from '@renderer/lib/slides';

type AlignKey = 'left' | 'center' | 'right' | 'justify';
const ALIGNS: AlignKey[] = ['left', 'center', 'right', 'justify'];
const ALIGN_TITLES: Record<AlignKey, string> = {
  left: 'По левому краю',
  center: 'По центру',
  right: 'По правому краю',
  justify: 'По ширине',
};

// Иконка выравнивания «как в Word»: 4 горизонтальные линии, расставленные
// по краю/центру/ширине. currentColor — наследует цвет кнопки.
function AlignIcon({ kind }: { kind: AlignKey }) {
  // Для каждой из 4 строк — пара [x1, x2] в коробке 16. left/right —
  // чередование длинной/короткой линии; center — короткие по центру;
  // justify — все во всю ширину.
  const rows: Array<[number, number]> =
    kind === 'left'
      ? [[1, 15], [1, 10], [1, 15], [1, 10]]
      : kind === 'right'
        ? [[1, 15], [6, 15], [1, 15], [6, 15]]
        : kind === 'center'
          ? [[1, 15], [4, 12], [1, 15], [4, 12]]
          : [[1, 15], [1, 15], [1, 15], [1, 15]];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
      {rows.map(([x1, x2], i) => (
        <line
          key={i}
          x1={x1}
          x2={x2}
          y1={3 + i * 3.3}
          y2={3 + i * 3.3}
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

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
        style={{ fontWeight: 700 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Ж
      </button>
      <button
        type="button"
        className={`toolbar-btn${editor.isActive('italic') ? ' toolbar-btn--active' : ''}`}
        title="Курсив"
        style={{ fontStyle: 'italic' }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        К
      </button>
      <button
        type="button"
        className={`toolbar-btn${editor.isActive('underline') ? ' toolbar-btn--active' : ''}`}
        title="Подчёркнутый"
        style={{ textDecoration: 'underline' }}
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
          key={a}
          type="button"
          className={`toolbar-btn toolbar-btn--icon${curAlign === a ? ' toolbar-btn--active' : ''}`}
          title={ALIGN_TITLES[a]}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign(a).run()}
        >
          <AlignIcon kind={a} />
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
