import { useEffect, useState } from 'react';
import type { VersionsInfo } from '../preload/types';
import { useDeckStore } from './stores/deck';
import { useUiStore } from './stores/ui';
import { createEmptyDeck, createRect, appendShape } from './lib/model/factory';
import { Canvas } from './components/editor/Canvas';

// Главный UI на Phase 2 — четыре зоны (header, filmstrip, canvas, inspector).
// При маунте создаём пустой deck в сторе, чтобы остальные компоненты могли
// сразу подписываться. Реальный Canvas (Konva Stage) — пункт 2.4.
export function App() {
  const [versions, setVersions] = useState<VersionsInfo | null>(null);
  const deck = useDeckStore((s) => s.deck);
  const setDeck = useDeckStore((s) => s.setDeck);
  const activeSlideId = useUiStore((s) => s.activeSlideId);
  const setActiveSlide = useUiStore((s) => s.setActiveSlide);

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

      <aside className="app-filmstrip">
        <p className="panel-title">Slides ({slideCount})</p>
        <p className="meta">
          {activeSlideId ? `Active: ${activeSlideId.slice(0, 8)}…` : 'no active slide'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!deck || !activeSlideId) return;
            setDeck(appendShape(deck, activeSlideId, createRect()));
          }}
        >
          + Rect
        </button>
        <p className="meta">Полноценный toolbar — Phase 2.9.</p>
      </aside>

      <Canvas />

      <aside className="app-inspector">
        <p className="panel-title">Inspector</p>
        <p className="meta">Свойства фигуры появятся в Phase 2.12.</p>
      </aside>
    </div>
  );
}
