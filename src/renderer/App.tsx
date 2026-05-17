import { useEffect, useState } from 'react';
import type { VersionsInfo } from '../preload/types';

// Заглушка главного UI на Phase 1 — четыре пустые зоны (header, filmstrip,
// canvas, inspector). На Phase 2 здесь развернётся Canvas (Konva Stage) и панели.
export function App() {
  const [versions, setVersions] = useState<VersionsInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.api) {
      setVersions(window.api.getVersions());
    }
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>SlidesClone</h1>
        {versions && (
          <span className="meta">
            Electron {versions.electron} · Chromium {versions.chrome} · Node {versions.node}
          </span>
        )}
      </header>

      <aside className="app-filmstrip">
        <p className="panel-title">Slides</p>
        <p className="meta">Filmstrip появится в Phase 2.</p>
      </aside>

      <main className="app-canvas">
        <div className="placeholder">Canvas (Konva Stage) — Phase 2</div>
      </main>

      <aside className="app-inspector">
        <p className="panel-title">Inspector</p>
        <p className="meta">Свойства фигуры появятся в Phase 2.</p>
      </aside>
    </div>
  );
}
