import { useEffect, type CSSProperties } from 'react';
import { useSelectionStore } from '@renderer/stores/selection';
import { useUiStore } from '@renderer/stores/ui';
import { useDeckStore } from '@renderer/stores/deck';
import {
  copy,
  cut,
  paste,
  duplicate,
  deleteSelected,
} from '@renderer/lib/clipboard';
import { applyZOrder, applyGroup, applyUngroup } from '@renderer/lib/arrange';
import { canGroup, canUngroup } from '@renderer/lib/group';
import { useClipboardStore } from '@renderer/stores/clipboard';
import { tableOps } from '@renderer/lib/table';
import { insertChartFromTable } from '@renderer/lib/chart';
import { connectorOps } from '@renderer/lib/connector';

interface ShapeContextMenuProps {
  // Экранные координаты (clientX/clientY) точки вызова.
  x: number;
  y: number;
  onClose: () => void;
}

// Контекстное меню по правому клику на фигуре. Обёртка над уже существующими
// командами (clipboard / arrange). Позиционируется по курсору; закрывается
// по клику вне, Escape или после выбора пункта.
export function ShapeContextMenu({ x, y, onClose }: ShapeContextMenuProps) {
  const selectedIds = useSelectionStore((s) => s.selectedShapeIds);
  const clipboardCount = useClipboardStore((s) => s.shapes.length);

  // Доступность group/ungroup зависит от выделения активного слайда.
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const shapes = useDeckStore((s) =>
    activeSlideId ? s.deck?.slides[activeSlideId]?.shapes ?? [] : [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      // Клик внутри меню — не закрываем (иначе capture-фаза погасит меню
      // до того, как сработает click по пункту).
      if ((e.target as HTMLElement | null)?.closest?.('.ctx-menu')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    // capture-phase: закрываем до того, как клик дойдёт до Stage.
    window.addEventListener('mousedown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose]);

  const hasSel = selectedIds.length > 0;
  const canGrp = selectedIds.length >= 2 && canGroup(selectedIds, shapes);
  const canUngrp = hasSel && canUngroup(selectedIds, shapes);
  // Обрезка доступна, когда выделено ровно одно изображение.
  const singleImageId =
    selectedIds.length === 1 &&
    shapes.find((s) => s.id === selectedIds[0])?.type === 'image'
      ? selectedIds[0]
      : null;
  const setCroppingShape = useUiStore.getState().setCroppingShape;

  // Таблица: операции строк/столбцов/объединения работают по выбранной ячейке
  // или диапазону (tableSelection). Правый клик по ячейке уже выбрал её
  // (mousedown в TableShapeView), поэтому меню знает строку/столбец.
  const singleTableId =
    selectedIds.length === 1 && shapes.find((s) => s.id === selectedIds[0])?.type === 'table'
      ? selectedIds[0]
      : null;
  const tableSel = useUiStore((s) =>
    s.tableSelection && s.tableSelection.shapeId === singleTableId ? s.tableSelection : null,
  );
  const setTableSelection = useUiStore((s) => s.setTableSelection);
  const setTableFormatOpen = useUiStore((s) => s.setTableFormatOpen);

  // Коннектор: выбор маршрута и стрелок.
  const singleConnectorId =
    selectedIds.length === 1 && shapes.find((s) => s.id === selectedIds[0])?.type === 'connector'
      ? selectedIds[0]
      : null;
  const tRMin = tableSel ? Math.min(tableSel.r0, tableSel.r1) : 0;
  const tRMax = tableSel ? Math.max(tableSel.r0, tableSel.r1) : 0;
  const tCMin = tableSel ? Math.min(tableSel.c0, tableSel.c1) : 0;
  const tCMax = tableSel ? Math.max(tableSel.c0, tableSel.c1) : 0;
  const tIsRange = tableSel !== null && (tRMin !== tRMax || tCMin !== tCMax);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  // Позиционирование: прижимаем к курсору, но не даём вылезти за окно.
  // Высоту ограничиваем остатком до низа окна — длинное меню скроллится.
  const margin = 8;
  const top = Math.max(margin, Math.min(y, window.innerHeight - margin - 40));
  const style: CSSProperties = {
    left: Math.max(margin, Math.min(x, window.innerWidth - 220)),
    top,
    maxHeight: window.innerHeight - top - margin,
  };

  return (
    <div
      className="ctx-menu"
      style={style}
      // Не даём mousedown всплыть к window-capture-листенеру и Stage —
      // иначе меню закроется до click по пункту.
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button className="ctx-menu__item" disabled={!hasSel} onClick={() => run(cut)}>
        Вырезать
      </button>
      <button className="ctx-menu__item" disabled={!hasSel} onClick={() => run(copy)}>
        Копировать
      </button>
      <button
        className="ctx-menu__item"
        disabled={clipboardCount === 0}
        onClick={() => run(paste)}
      >
        Вставить
      </button>
      <button
        className="ctx-menu__item"
        disabled={!hasSel}
        onClick={() => run(duplicate)}
      >
        Дублировать
      </button>

      {singleImageId && (
        <>
          <div className="ctx-menu__sep" />
          <button
            className="ctx-menu__item"
            onClick={() => run(() => setCroppingShape(singleImageId))}
          >
            Обрезать
          </button>
        </>
      )}

      {singleTableId && activeSlideId && (
        <>
          <div className="ctx-menu__sep" />
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() => run(() => tableOps.insertRow(activeSlideId, singleTableId, tRMin))}
          >
            Вставить строку выше
          </button>
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() => run(() => tableOps.insertRow(activeSlideId, singleTableId, tRMax + 1))}
          >
            Вставить строку ниже
          </button>
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() => run(() => tableOps.insertCol(activeSlideId, singleTableId, tCMin))}
          >
            Вставить столбец слева
          </button>
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() => run(() => tableOps.insertCol(activeSlideId, singleTableId, tCMax + 1))}
          >
            Вставить столбец справа
          </button>
          <div className="ctx-menu__sep" />
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() =>
              run(() => {
                tableOps.deleteRow(activeSlideId, singleTableId, tRMin);
                setTableSelection(null);
              })
            }
          >
            Удалить строку
          </button>
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() =>
              run(() => {
                tableOps.deleteCol(activeSlideId, singleTableId, tCMin);
                setTableSelection(null);
              })
            }
          >
            Удалить столбец
          </button>
          <div className="ctx-menu__sep" />
          <button
            className="ctx-menu__item"
            disabled={!tIsRange}
            onClick={() =>
              run(() => {
                tableOps.merge(activeSlideId, singleTableId, tRMin, tCMin, tRMax, tCMax);
                setTableSelection({ shapeId: singleTableId, r0: tRMin, c0: tCMin, r1: tRMin, c1: tCMin });
              })
            }
          >
            Объединить ячейки
          </button>
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() => run(() => tableOps.split(activeSlideId, singleTableId, tRMin, tCMin))}
          >
            Разбить ячейку
          </button>
          <div className="ctx-menu__sep" />
          <button
            className="ctx-menu__item"
            onClick={() => run(() => tableOps.distributeRows(activeSlideId, singleTableId))}
          >
            Выровнять строки
          </button>
          <button
            className="ctx-menu__item"
            onClick={() => run(() => tableOps.distributeCols(activeSlideId, singleTableId))}
          >
            Выровнять столбцы
          </button>
          <div className="ctx-menu__sep" />
          <button
            className="ctx-menu__item"
            disabled={!tableSel}
            onClick={() => run(() => setTableFormatOpen(true))}
          >
            Формат ячеек…
          </button>
          <button
            className="ctx-menu__item"
            onClick={() =>
              run(() => {
                const t = shapes.find((s) => s.id === singleTableId);
                if (t && t.type === 'table') insertChartFromTable(activeSlideId, t);
              })
            }
          >
            Создать диаграмму из таблицы
          </button>
        </>
      )}

      {singleConnectorId && activeSlideId && (
        <>
          <div className="ctx-menu__sep" />
          <button className="ctx-menu__item" onClick={() => run(() => connectorOps.setType(activeSlideId, singleConnectorId, 'straight'))}>
            Маршрут: прямой
          </button>
          <button className="ctx-menu__item" onClick={() => run(() => connectorOps.setType(activeSlideId, singleConnectorId, 'elbow'))}>
            Маршрут: угловой
          </button>
          <button className="ctx-menu__item" onClick={() => run(() => connectorOps.setType(activeSlideId, singleConnectorId, 'curved'))}>
            Маршрут: кривой
          </button>
          <div className="ctx-menu__sep" />
          <button className="ctx-menu__item" onClick={() => run(() => connectorOps.toggleArrowStart(activeSlideId, singleConnectorId))}>
            Стрелка в начале
          </button>
          <button className="ctx-menu__item" onClick={() => run(() => connectorOps.toggleArrowEnd(activeSlideId, singleConnectorId))}>
            Стрелка в конце
          </button>
        </>
      )}

      <div className="ctx-menu__sep" />

      <button
        className="ctx-menu__item"
        disabled={!hasSel}
        onClick={() => run(() => applyZOrder('to-front'))}
      >
        На передний план
      </button>
      <button
        className="ctx-menu__item"
        disabled={!hasSel}
        onClick={() => run(() => applyZOrder('forward'))}
      >
        Переместить вперёд
      </button>
      <button
        className="ctx-menu__item"
        disabled={!hasSel}
        onClick={() => run(() => applyZOrder('backward'))}
      >
        Переместить назад
      </button>
      <button
        className="ctx-menu__item"
        disabled={!hasSel}
        onClick={() => run(() => applyZOrder('to-back'))}
      >
        На задний план
      </button>

      <div className="ctx-menu__sep" />

      <button
        className="ctx-menu__item"
        disabled={!canGrp}
        onClick={() => run(applyGroup)}
      >
        Сгруппировать
      </button>
      <button
        className="ctx-menu__item"
        disabled={!canUngrp}
        onClick={() => run(applyUngroup)}
      >
        Разгруппировать
      </button>

      <div className="ctx-menu__sep" />

      <button
        className="ctx-menu__item ctx-menu__item--danger"
        disabled={!hasSel}
        onClick={() => run(deleteSelected)}
      >
        Удалить
      </button>
    </div>
  );
}
