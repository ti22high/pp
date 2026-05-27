// Палитра шаблонов формул (Phase 3.24a): кнопки вставляют LaTeX-сниппеты в
// поле редактора. Сниппет может содержать маркер каретки SNIPPET_CARET —
// после вставки курсор встаёт на его место (плейсхолдер), иначе — в конец.

export const SNIPPET_CARET = '‸';

export interface SnippetItem {
  label: string;
  snippet: string;
}
export interface SnippetGroup {
  title: string;
  items: SnippetItem[];
}

export const SNIPPET_GROUPS: SnippetGroup[] = [
  {
    title: 'Структуры',
    items: [
      { label: 'a/b', snippet: `\\frac{${SNIPPET_CARET}}{}` },
      { label: '√', snippet: `\\sqrt{${SNIPPET_CARET}}` },
      { label: 'ⁿ√', snippet: `\\sqrt[${SNIPPET_CARET}]{}` },
      { label: 'xⁿ', snippet: `^{${SNIPPET_CARET}}` },
      { label: 'xₙ', snippet: `_{${SNIPPET_CARET}}` },
      { label: 'Σ', snippet: `\\sum_{${SNIPPET_CARET}}^{}` },
      { label: '∏', snippet: `\\prod_{${SNIPPET_CARET}}^{}` },
      { label: '∫', snippet: `\\int_{${SNIPPET_CARET}}^{}` },
      { label: 'lim', snippet: `\\lim_{${SNIPPET_CARET}}` },
      { label: '( )', snippet: `\\left(${SNIPPET_CARET}\\right)` },
      { label: '[ ]', snippet: `\\begin{pmatrix} ${SNIPPET_CARET} & \\\\ & \\end{pmatrix}` },
      { label: 'a⃗', snippet: `\\vec{${SNIPPET_CARET}}` },
    ],
  },
  {
    title: 'Греческие',
    items: [
      { label: 'α', snippet: '\\alpha' },
      { label: 'β', snippet: '\\beta' },
      { label: 'γ', snippet: '\\gamma' },
      { label: 'δ', snippet: '\\delta' },
      { label: 'θ', snippet: '\\theta' },
      { label: 'λ', snippet: '\\lambda' },
      { label: 'μ', snippet: '\\mu' },
      { label: 'π', snippet: '\\pi' },
      { label: 'ρ', snippet: '\\rho' },
      { label: 'σ', snippet: '\\sigma' },
      { label: 'φ', snippet: '\\phi' },
      { label: 'ω', snippet: '\\omega' },
      { label: 'Δ', snippet: '\\Delta' },
      { label: 'Σ', snippet: '\\Sigma' },
      { label: 'Ω', snippet: '\\Omega' },
    ],
  },
  {
    title: 'Операторы',
    items: [
      { label: '×', snippet: '\\times ' },
      { label: '·', snippet: '\\cdot ' },
      { label: '±', snippet: '\\pm ' },
      { label: '≤', snippet: '\\leq ' },
      { label: '≥', snippet: '\\geq ' },
      { label: '≠', snippet: '\\neq ' },
      { label: '≈', snippet: '\\approx ' },
      { label: '→', snippet: '\\rightarrow ' },
      { label: '∞', snippet: '\\infty ' },
    ],
  },
];

// Вставляет snippet в value, заменяя выделение [start,end). Возвращает новый
// текст и позицию каретки (по маркеру SNIPPET_CARET либо в конце вставки).
export function applySnippet(
  value: string,
  start: number,
  end: number,
  snippet: string,
): { value: string; caret: number } {
  const markerIdx = snippet.indexOf(SNIPPET_CARET);
  const clean = snippet.replace(SNIPPET_CARET, '');
  const next = value.slice(0, start) + clean + value.slice(end);
  const caret = markerIdx >= 0 ? start + markerIdx : start + clean.length;
  return { value: next, caret };
}
