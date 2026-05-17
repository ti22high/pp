import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadFonts } from './lib/fonts';
import './styles/app.css';

// Точка входа рендерера. Сначала грузим bundled-шрифты (нужно для корректных
// замеров текста в Konva на Phase 2 — см. SPEC §14.2), потом маунтим React.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found in index.html');
}

void loadFonts().finally(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
