import katex from 'katex';
import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createEquation } from '@renderer/lib/model/factory';

// Рендер LaTeX → HTML (+MathML) строкой через KaTeX (Phase 3.24, SPEC §6.6).
// throwOnError:false — при ошибке KaTeX рисует исходник красным, не падает.
// displayMode — крупная «блочная» формула (как \[...\]).
export function renderEquationHtml(latex: string): string {
  return katex.renderToString(latex ?? '', {
    throwOnError: false,
    output: 'htmlAndMathml',
    displayMode: true,
  });
}

// Натуральный размер отрисованной формулы (px) — измеряем офскрин-элементом
// (требует загруженной katex CSS, см. main.tsx). Используется при вставке/
// правке, чтобы bbox фигуры совпал с формулой. Поля .katex-display обнуляем.
export function measureEquation(latex: string): { w: number; h: number } {
  const host = document.createElement('div');
  host.style.cssText =
    'position:absolute;visibility:hidden;left:-9999px;top:-9999px;display:inline-block;';
  host.innerHTML = renderEquationHtml(latex);
  const display = host.querySelector<HTMLElement>('.katex-display');
  if (display) display.style.margin = '0';
  document.body.appendChild(host);
  const w = Math.max(2, Math.ceil(host.offsetWidth));
  const h = Math.max(2, Math.ceil(host.offsetHeight));
  host.remove();
  return { w, h };
}

// Вставляет пустую формулу по центру слайда, выделяет её и открывает редактор
// LaTeX. Общая точка для кнопки тулбара и пункта меню «Вставка → Формула».
export function insertEquation(): void {
  const deck = useDeckStore.getState().deck;
  const slideId = useUiStore.getState().activeSlideId;
  if (!deck || !slideId) return;
  const w = 160;
  const h = 56;
  const x = Math.round(deck.size.w / 2 - w / 2);
  const y = Math.round(deck.size.h / 2 - h / 2);
  const eq = createEquation(x, y, w, h, '');
  useDeckStore.getState().setDeck(appendShape(deck, slideId, eq));
  useSelectionStore.getState().select([eq.id]);
  useUiStore.getState().setEquationShape(eq.id);
}
