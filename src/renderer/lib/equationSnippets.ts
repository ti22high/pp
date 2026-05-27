// Палитра шаблонов формул (Phase 3.24a). Кнопки вставляют сниппеты в визуальный
// редактор MathLive через mf.insert(). Токен `#?` = редактируемый плейсхолдер
// (слот, по которому можно перейти Tab-ом) — поведение «как в Word».

export interface SnippetItem {
  label: string;
  insert: string;
}
export interface SnippetGroup {
  title: string;
  items: SnippetItem[];
}

export const SNIPPET_GROUPS: SnippetGroup[] = [
  {
    title: 'Структуры',
    items: [
      { label: 'a/b', insert: '\\frac{#?}{#?}' },
      { label: '√', insert: '\\sqrt{#?}' },
      { label: 'ⁿ√', insert: '\\sqrt[#?]{#?}' },
      { label: 'xⁿ', insert: '^{#?}' },
      { label: 'xₙ', insert: '_{#?}' },
      { label: 'Σ', insert: '\\sum_{#?}^{#?}' },
      { label: '∏', insert: '\\prod_{#?}^{#?}' },
      { label: '∫', insert: '\\int_{#?}^{#?}' },
      { label: 'lim', insert: '\\lim_{#?}' },
      { label: '( )', insert: '\\left(#?\\right)' },
      { label: '[ ]', insert: '\\begin{pmatrix}#? & #? \\\\ #? & #?\\end{pmatrix}' },
      { label: 'a⃗', insert: '\\vec{#?}' },
    ],
  },
  {
    title: 'Греческие',
    items: [
      { label: 'α', insert: '\\alpha' },
      { label: 'β', insert: '\\beta' },
      { label: 'γ', insert: '\\gamma' },
      { label: 'δ', insert: '\\delta' },
      { label: 'θ', insert: '\\theta' },
      { label: 'λ', insert: '\\lambda' },
      { label: 'μ', insert: '\\mu' },
      { label: 'π', insert: '\\pi' },
      { label: 'ρ', insert: '\\rho' },
      { label: 'σ', insert: '\\sigma' },
      { label: 'φ', insert: '\\phi' },
      { label: 'ω', insert: '\\omega' },
      { label: 'Δ', insert: '\\Delta' },
      { label: 'Σ', insert: '\\Sigma' },
      { label: 'Ω', insert: '\\Omega' },
    ],
  },
  {
    title: 'Операторы',
    items: [
      { label: '×', insert: '\\times' },
      { label: '·', insert: '\\cdot' },
      { label: '±', insert: '\\pm' },
      { label: '≤', insert: '\\le' },
      { label: '≥', insert: '\\ge' },
      { label: '≠', insert: '\\ne' },
      { label: '≈', insert: '\\approx' },
      { label: '→', insert: '\\rightarrow' },
      { label: '∞', insert: '\\infty' },
    ],
  },
];
