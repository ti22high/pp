// Открытие .pptx через системный диалог + парсинг с прогрессом (Спринт B.12).
//
// Используется обработчиком меню `file:open` и можно дернуть из тулбара.

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { parsePptx } from '@renderer/lib/pptx/parser';

export async function openPptxFromDialog(): Promise<void> {
  const ui = useUiStore.getState();
  // Окно файлового диалога открывается в main; при отмене pick() → null.
  let picked: { bytes: ArrayBuffer; name: string } | null = null;
  try {
    picked = await window.api.file.pick({
      title: 'Открыть PowerPoint-презентацию',
      filters: [{ name: 'PowerPoint', extensions: ['pptx'] }],
    });
  } catch (e) {
    alert(`Не удалось прочитать файл: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  if (!picked) return;

  ui.setImportProgress({ current: 0, total: 0, message: 'Открытие файла…' });
  try {
    const { deck, warnings } = await parsePptx(picked.bytes, (p) => {
      ui.setImportProgress(p);
    });
    useDeckStore.getState().setDeck(deck);
    if (deck.slideOrder.length > 0) {
      ui.setActiveSlide(deck.slideOrder[0]);
    }
    if (warnings.length > 0) {
      // Логируем неполадки парсинга — UI пока без отдельного тост-уведомления.
      console.warn(`Импорт ${picked.name} — предупреждения:`, warnings);
    }
  } catch (e) {
    alert(`Не удалось импортировать .pptx: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    ui.setImportProgress(null);
  }
}
