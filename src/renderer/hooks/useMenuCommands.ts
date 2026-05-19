import { useEffect } from 'react';
import { useUiStore } from '@renderer/stores/ui';

// Подписка на команды native-меню (Файл / Правка / Вид / …) и роутинг их
// в соответствующие store-действия. Команды приходят строкой через
// contextBridge → `window.api.onMenuCommand`.
//
// view:zoom-in/out/reset обрабатываются в Canvas — там есть stageSize и
// логика пивота вокруг центра канваса. Поэтому здесь только toggles.
export function useMenuCommands() {
  const toggleGrid = useUiStore((s) => s.toggleGrid);
  const toggleRuler = useUiStore((s) => s.toggleRuler);
  const toggleSnapToGrid = useUiStore((s) => s.toggleSnapToGrid);

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
        default:
          // Остальные команды обрабатываются в своих компонентах
          // (Canvas — zoom, File-меню — Phase 5, и т.д.).
          break;
      }
    });
    return unsubscribe;
  }, [toggleGrid, toggleRuler, toggleSnapToGrid]);
}
