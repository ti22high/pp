import { useUiStore } from '@renderer/stores/ui';
import { tableOps } from '@renderer/lib/table';
import type { ShapeId, SlideId } from '@shared/types';

interface TableInspectorProps {
  slideId: SlideId;
  shapeId: ShapeId;
}

// Секция инспектора для таблицы (Phase 3.9): операции над строками/столбцами,
// объединение/разбиение ячеек, равномерное распределение. Все действия
// работают по текущему выбору ячеек (одиночный клик / Shift-клик по таблице).
export function TableInspector({ slideId, shapeId }: TableInspectorProps) {
  const selection = useUiStore((s) =>
    s.tableSelection?.shapeId === shapeId ? s.tableSelection : null,
  );
  const setTableSelection = useUiStore((s) => s.setTableSelection);

  const rMin = selection ? Math.min(selection.r0, selection.r1) : 0;
  const rMax = selection ? Math.max(selection.r0, selection.r1) : 0;
  const cMin = selection ? Math.min(selection.c0, selection.c1) : 0;
  const cMax = selection ? Math.max(selection.c0, selection.c1) : 0;
  const hasSel = selection !== null;
  const isRange = hasSel && (rMin !== rMax || cMin !== cMax);

  return (
    <section className="inspector-section">
      <p className="panel-title">Таблица</p>
      {!hasSel && <p className="meta">Кликните по ячейке таблицы, чтобы выбрать её.</p>}

      <div className="inspector-row inspector-row--buttons">
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => tableOps.insertRow(slideId, shapeId, rMin)}
        >
          Строка ↑
        </button>
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => tableOps.insertRow(slideId, shapeId, rMax + 1)}
        >
          Строка ↓
        </button>
      </div>
      <div className="inspector-row inspector-row--buttons">
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => tableOps.insertCol(slideId, shapeId, cMin)}
        >
          Столбец ←
        </button>
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => tableOps.insertCol(slideId, shapeId, cMax + 1)}
        >
          Столбец →
        </button>
      </div>
      <div className="inspector-row inspector-row--buttons">
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => {
            tableOps.deleteRow(slideId, shapeId, rMin);
            setTableSelection(null);
          }}
        >
          Удалить строку
        </button>
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => {
            tableOps.deleteCol(slideId, shapeId, cMin);
            setTableSelection(null);
          }}
        >
          Удалить столбец
        </button>
      </div>
      <div className="inspector-row inspector-row--buttons">
        <button
          type="button"
          className="inspector-btn"
          disabled={!isRange}
          onClick={() => {
            tableOps.merge(slideId, shapeId, rMin, cMin, rMax, cMax);
            setTableSelection({ shapeId, r0: rMin, c0: cMin, r1: rMin, c1: cMin });
          }}
        >
          Объединить
        </button>
        <button
          type="button"
          className="inspector-btn"
          disabled={!hasSel}
          onClick={() => tableOps.split(slideId, shapeId, rMin, cMin)}
        >
          Разбить
        </button>
      </div>
      <div className="inspector-row inspector-row--buttons">
        <button
          type="button"
          className="inspector-btn"
          onClick={() => tableOps.distributeRows(slideId, shapeId)}
        >
          Строки поровну
        </button>
        <button
          type="button"
          className="inspector-btn"
          onClick={() => tableOps.distributeCols(slideId, shapeId)}
        >
          Столбцы поровну
        </button>
      </div>
    </section>
  );
}
