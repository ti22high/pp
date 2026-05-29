import { useUiStore } from '@renderer/stores/ui';

// Модальное окно прогресса импорта .pptx (Спринт B.12). Не закрывается по клику
// (импорт нельзя прервать сейчас); пользователь ждёт «Готово» и окно само исчезает.
export function ImportProgressDialog() {
  const progress = useUiStore((s) => s.importProgress);
  if (!progress) return null;

  const pct =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : null;

  return (
    <div className="modal-backdrop">
      <div className="modal modal--import-progress">
        <header className="modal__header">
          <h2>Импорт .pptx</h2>
        </header>
        <div className="modal__body">
          <p>{progress.message}</p>
          <div className="import-progress__bar-bg">
            <div
              className="import-progress__bar"
              style={{ width: `${pct ?? 0}%` }}
              data-indeterminate={pct === null ? 'true' : undefined}
            />
          </div>
          {progress.total > 0 && (
            <p className="import-progress__count">
              {progress.current} / {progress.total}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
