import { useEffect, useRef, useState } from 'react';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { cellRects, setTableCellText } from '@renderer/lib/table';

interface TableCellEditorProps {
  slideId: string;
  panX: number;
  panY: number;
  zoom: number;
}

// DOM-оверлей редактирования текста ячейки таблицы (Phase 3.8). Открывается по
// двойному клику (editingTableCell в ui store). Позиционируется поверх Stage в
// экранных координатах. Enter / blur — сохранить, Esc — отменить.
export function TableCellEditor({ slideId, panX, panY, zoom }: TableCellEditorProps) {
  const editing = useUiStore((s) => s.editingTableCell);
  const stopEditing = useUiStore((s) => s.setEditingTableCell);
  const shape = useDeckStore((s) => {
    if (!editing) return null;
    const sh = s.deck?.slides[slideId]?.shapes.find((x) => x.id === editing.shapeId);
    return sh?.type === 'table' ? sh : null;
  });

  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const key = editing ? `${editing.shapeId}:${editing.row}:${editing.col}` : null;
  useEffect(() => {
    if (!editing || !shape) return;
    setText(shape.cells[editing.row]?.[editing.col]?.text ?? '');
    const id = window.setTimeout(() => {
      taRef.current?.focus();
      taRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
    // Перечитываем только при смене ячейки, не на каждое изменение shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!editing || !shape) return null;

  const rect = cellRects(shape).find((r) => r.row === editing.row && r.col === editing.col);
  if (!rect) return null;

  const left = (shape.x + rect.x) * zoom + panX;
  const top = (shape.y + rect.y) * zoom + panY;
  const width = rect.w * zoom;
  const height = rect.h * zoom;

  const commit = () => {
    setTableCellText(slideId, editing.shapeId, editing.row, editing.col, text);
    stopEditing(null);
  };

  return (
    <textarea
      ref={taRef}
      className="table-cell-editor"
      style={{ left, top, width, height, fontSize: 18 * zoom }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          stopEditing(null);
        }
        e.stopPropagation();
      }}
    />
  );
}
