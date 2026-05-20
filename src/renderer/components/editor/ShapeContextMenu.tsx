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

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  // Меню рисуем чуть смещённым, чтобы курсор не стоял на первом пункте.
  // Если у правого/нижнего края — CSS transform не делаем, простой clamp.
  const style: CSSProperties = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 360),
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
