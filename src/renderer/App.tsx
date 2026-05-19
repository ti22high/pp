import { useEffect, useState } from 'react';
import type { VersionsInfo } from '../preload/types';
import { useDeckStore } from './stores/deck';
import { useUiStore } from './stores/ui';
import { createEmptyDeck } from './lib/model/factory';
import { Canvas } from './components/editor/Canvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { Inspector } from './components/inspector/Inspector';
import { useMenuCommands } from './hooks/useMenuCommands';

// Главный UI редактора. Структура: header / toolbar / (filmstrip + canvas + inspector).
// При первом маунте создаём пустой deck — остальные компоненты подписываются на него.
export function App() {
  const [versions, setVersions] = useState<VersionsInfo | null>(null);
  const deck = useDeckStore((s) => s.deck);
  const setDeck = useDeckStore((s) => s.setDeck);
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const setActiveSlide = useUiStore((s) => s.setActiveSlide);

  useMenuCommands();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.api) {
      setVersions(window.api.getVersions());
    }
  }, []);

  useEffect(() => {
    if (!deck) {
      const fresh = createEmptyDeck();
      setDeck(fresh);
      setActiveSlide(fresh.slideOrder[0] ?? null);
    }
  }, [deck, setDeck, setActiveSlide]);

  const slideCount = deck?.slideOrder.length ?? 0;

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

      <div className="app-toolbar">
        <Toolbar />
      </div>

      <aside className="app-filmstrip">
        <p className="panel-title">Слайды ({slideCount})</p>
        <p className="meta">
          {activeSlideId ? `Активный: ${activeSlideId.slice(0, 8)}…` : 'нет активного слайда'}
        </p>
        <p className="meta">Превью слайдов — Phase 2.24.</p>
      </aside>

      <Canvas />

      <Inspector />
    </div>
  );
}
