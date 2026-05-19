import { useEffect } from 'react';
import { useUiStore } from '@renderer/stores/ui';

// Подписка на команды native-меню (File / Edit / View / …) и роутинг их
// в соответствующие store-действия. Команды приходят строкой через
// contextBridge → `window.api.onMenuCommand`.
//
// Список покрытых команд расширяется по мере появления фичей.
// На Phase 2.17 — только View-toggle-grid / View-toggle-snap-grid.
export function useMenuCommands() {
  const toggleGrid = useUiStore((s) => s.toggleGrid);
  const toggleRuler = useUiStore((s) => s.toggleRuler);
  const toggleSnapToGrid = useUiStore((s) => s.toggleSnapToGrid);
  const setZoom = useUiStore((s) => s.setZoom);
  const zoom = useUiStore((s) => s.zoom);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;
    const unsubscribe = window.api.onMenuCommand((command) => {
      switch (command) {
        case 'view:toggle-grid':
          toggleGrid();
          break;
        case 'view:toggle-snap-grid':
          toggleSnapToGrid();
          break;
        case 'view:toggle-ruler':
          toggleRuler();
          break;
        case 'view:zoom-in':
          setZoom(zoom * 1.1);
          break;
        case 'view:zoom-out':
          setZoom(zoom / 1.1);
          break;
        case 'view:zoom-reset':
          setZoom(1);
          break;
        default:
          // Пока без обработчика — добавим в соответствующей фазе.
          break;
      }
    });
    return unsubscribe;
  }, [toggleGrid, toggleRuler, toggleSnapToGrid, setZoom, zoom]);
}
