import { useEffect, useState } from 'react';
import type { VersionsInfo } from '../preload/types';
import { useDeckStore } from './stores/deck';
import { useUiStore } from './stores/ui';
import { createEmptyDeck } from './lib/model/factory';
import { Canvas } from './components/editor/Canvas';
import { Toolbar } from './components/toolbar/Toolbar';
import { Inspector } from './components/inspector/Inspector';
import { Filmstrip } from './components/filmstrip/Filmstrip';
import { LayoutPicker } from './components/ui/LayoutPicker';
import { BackgroundEditor } from './components/ui/BackgroundEditor';
import { SlideSizeDialog } from './components/ui/SlideSizeDialog';
import { PageNumbersDialog } from './components/ui/PageNumbersDialog';
import { HyperlinkDialog } from './components/ui/HyperlinkDialog';
import { SpecialCharsDialog } from './components/ui/SpecialCharsDialog';
import { ShortcutsDialog } from './components/ui/ShortcutsDialog';
import { AltTextDialog } from './components/ui/AltTextDialog';
import { TableCellFormatDialog } from './components/ui/TableCellFormatDialog';
import { CsvImportDialog } from './components/ui/CsvImportDialog';
import { useMenuCommands } from './hooks/useMenuCommands';
import { useShapeClipboard } from './hooks/useShapeClipboard';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useArrowNudge } from './hooks/useArrowNudge';
import { useImageDropPaste } from './hooks/useImageDropPaste';
import { openImageFileDialog } from './lib/insertImage';

// Главный UI редактора. Структура: header / toolbar / (filmstrip + canvas + inspector).
// При первом маунте создаём пустой deck — остальные компоненты подписываются на него.
export function App() {
  const [versions, setVersions] = useState<VersionsInfo | null>(null);
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [bgEditorOpen, setBgEditorOpen] = useState(false);
  const [slideSizeOpen, setSlideSizeOpen] = useState(false);
  const [pageNumbersOpen, setPageNumbersOpen] = useState(false);
  const [hyperlinkOpen, setHyperlinkOpen] = useState(false);
  const [specialCharsOpen, setSpecialCharsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const deck = useDeckStore((s) => s.deck);
  const setDeck = useDeckStore((s) => s.setDeck);
  const setActiveSlide = useUiStore((s) => s.setActiveSlide);
  const showInspector = useUiStore((s) => s.showInspector);

  useMenuCommands();
  useShapeClipboard();
  useUndoRedo();
  useArrowNudge();
  useImageDropPaste();

  // Команда «Слайд → Применить макет…» открывает пикер. Это window-level
  // событие из menu.ts; useMenuCommands игнорирует slide:apply-layout, мы
  // его слушаем сами здесь, чтобы держать состояние модалки в App.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;
    return window.api.onMenuCommand((cmd) => {
      if (cmd === 'slide:apply-layout') setLayoutPickerOpen(true);
      else if (cmd === 'slide:background') setBgEditorOpen(true);
      else if (cmd === 'file:slide-size') setSlideSizeOpen(true);
      else if (cmd === 'insert:page-number') setPageNumbersOpen(true);
      else if (cmd === 'insert:hyperlink') setHyperlinkOpen(true);
      else if (cmd === 'insert:special-chars') setSpecialCharsOpen(true);
      else if (cmd === 'help:shortcuts') setShortcutsOpen(true);
      else if (cmd === 'insert:image') openImageFileDialog();
    });
  }, []);

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

  return (
    <div className={`app-shell${showInspector ? '' : ' app-shell--inspector-collapsed'}`}>
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

      <Filmstrip />

      <Canvas />

      <Inspector />

      <LayoutPicker open={layoutPickerOpen} onClose={() => setLayoutPickerOpen(false)} />
      <BackgroundEditor open={bgEditorOpen} onClose={() => setBgEditorOpen(false)} />
      <SlideSizeDialog open={slideSizeOpen} onClose={() => setSlideSizeOpen(false)} />
      <PageNumbersDialog
        open={pageNumbersOpen}
        onClose={() => setPageNumbersOpen(false)}
      />
      <HyperlinkDialog
        open={hyperlinkOpen}
        onClose={() => setHyperlinkOpen(false)}
      />
      <SpecialCharsDialog
        open={specialCharsOpen}
        onClose={() => setSpecialCharsOpen(false)}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <AltTextDialog />
      <TableCellFormatDialog />
      <CsvImportDialog />
    </div>
  );
}
