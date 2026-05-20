// Курированный набор Unicode-символов для пикера спецсимволов (§1.11).
// Не полный Unicode — практичный набор по категориям. У каждого символа есть
// name (англ.) + опц. keywords (рус./синонимы) для поиска по имени.

export interface SpecialChar {
  ch: string;
  name: string;
  keywords?: string;
}

export interface CharCategory {
  key: string;
  label: string;
  chars: SpecialChar[];
}

export const CHAR_CATEGORIES: CharCategory[] = [
  {
    key: 'math',
    label: 'Математика',
    chars: [
      { ch: '±', name: 'plus-minus', keywords: 'плюс минус' },
      { ch: '×', name: 'multiply', keywords: 'умножение' },
      { ch: '÷', name: 'division', keywords: 'деление' },
      { ch: '−', name: 'minus' },
      { ch: '=', name: 'equals' },
      { ch: '≠', name: 'not equal', keywords: 'не равно' },
      { ch: '≈', name: 'approximately', keywords: 'примерно' },
      { ch: '≡', name: 'identical' },
      { ch: '≤', name: 'less or equal', keywords: 'меньше' },
      { ch: '≥', name: 'greater or equal', keywords: 'больше' },
      { ch: '∞', name: 'infinity', keywords: 'бесконечность' },
      { ch: '√', name: 'square root', keywords: 'корень' },
      { ch: '∛', name: 'cube root' },
      { ch: '∑', name: 'sum', keywords: 'сумма' },
      { ch: '∏', name: 'product', keywords: 'произведение' },
      { ch: '∫', name: 'integral', keywords: 'интеграл' },
      { ch: '∂', name: 'partial derivative' },
      { ch: '∇', name: 'nabla' },
      { ch: '∆', name: 'delta' },
      { ch: 'π', name: 'pi' },
      { ch: '°', name: 'degree', keywords: 'градус' },
      { ch: '′', name: 'prime' },
      { ch: '″', name: 'double prime' },
      { ch: '∈', name: 'element of', keywords: 'принадлежит' },
      { ch: '∉', name: 'not element of' },
      { ch: '⊂', name: 'subset' },
      { ch: '⊆', name: 'subset or equal' },
      { ch: '∪', name: 'union', keywords: 'объединение' },
      { ch: '∩', name: 'intersection', keywords: 'пересечение' },
      { ch: '∀', name: 'for all' },
      { ch: '∃', name: 'exists' },
      { ch: '∅', name: 'empty set', keywords: 'пустое множество' },
      { ch: '⊥', name: 'perpendicular', keywords: 'перпендикуляр' },
      { ch: '∥', name: 'parallel', keywords: 'параллельно' },
      { ch: '∠', name: 'angle', keywords: 'угол' },
      { ch: '½', name: 'one half', keywords: 'половина' },
      { ch: '¼', name: 'one quarter', keywords: 'четверть' },
      { ch: '¾', name: 'three quarters' },
    ],
  },
  {
    key: 'symbols',
    label: 'Символы',
    chars: [
      { ch: '©', name: 'copyright', keywords: 'копирайт' },
      { ch: '®', name: 'registered', keywords: 'зарегистрировано' },
      { ch: '™', name: 'trademark', keywords: 'торговая марка' },
      { ch: '§', name: 'section', keywords: 'параграф раздел' },
      { ch: '¶', name: 'pilcrow' },
      { ch: '†', name: 'dagger' },
      { ch: '‡', name: 'double dagger' },
      { ch: '•', name: 'bullet', keywords: 'маркер точка' },
      { ch: '◦', name: 'white bullet' },
      { ch: '‣', name: 'triangular bullet' },
      { ch: '·', name: 'middle dot' },
      { ch: '…', name: 'ellipsis', keywords: 'многоточие' },
      { ch: '‰', name: 'per mille', keywords: 'промилле' },
      { ch: '€', name: 'euro', keywords: 'евро' },
      { ch: '£', name: 'pound', keywords: 'фунт' },
      { ch: '¥', name: 'yen', keywords: 'йена' },
      { ch: '¢', name: 'cent' },
      { ch: '₽', name: 'ruble', keywords: 'рубль' },
      { ch: '$', name: 'dollar', keywords: 'доллар' },
      { ch: '№', name: 'numero', keywords: 'номер' },
      { ch: '★', name: 'black star', keywords: 'звезда' },
      { ch: '☆', name: 'white star' },
      { ch: '♥', name: 'heart', keywords: 'сердце' },
      { ch: '♦', name: 'diamond' },
      { ch: '♣', name: 'club' },
      { ch: '♠', name: 'spade' },
      { ch: '✓', name: 'check mark', keywords: 'галочка' },
      { ch: '✔', name: 'heavy check mark' },
      { ch: '✗', name: 'ballot x', keywords: 'крестик' },
      { ch: '✦', name: 'black four pointed star' },
      { ch: '☑', name: 'checked box' },
      { ch: '☐', name: 'empty box' },
      { ch: '※', name: 'reference mark' },
      { ch: '⚠', name: 'warning', keywords: 'внимание' },
    ],
  },
  {
    key: 'arrows',
    label: 'Стрелки',
    chars: [
      { ch: '←', name: 'left arrow', keywords: 'влево' },
      { ch: '→', name: 'right arrow', keywords: 'вправо' },
      { ch: '↑', name: 'up arrow', keywords: 'вверх' },
      { ch: '↓', name: 'down arrow', keywords: 'вниз' },
      { ch: '↔', name: 'left right arrow' },
      { ch: '↕', name: 'up down arrow' },
      { ch: '↖', name: 'up left arrow' },
      { ch: '↗', name: 'up right arrow' },
      { ch: '↘', name: 'down right arrow' },
      { ch: '↙', name: 'down left arrow' },
      { ch: '⇐', name: 'left double arrow' },
      { ch: '⇒', name: 'right double arrow' },
      { ch: '⇔', name: 'left right double arrow' },
      { ch: '⇑', name: 'up double arrow' },
      { ch: '⇓', name: 'down double arrow' },
      { ch: '➜', name: 'heavy round-tipped right arrow' },
      { ch: '➤', name: 'black right arrowhead' },
      { ch: '⟶', name: 'long right arrow' },
      { ch: '⟵', name: 'long left arrow' },
      { ch: '↻', name: 'clockwise arrow', keywords: 'по часовой' },
      { ch: '↺', name: 'counterclockwise arrow' },
    ],
  },
  {
    key: 'punctuation',
    label: 'Пунктуация',
    chars: [
      { ch: '—', name: 'em dash', keywords: 'тире длинное' },
      { ch: '–', name: 'en dash', keywords: 'тире' },
      { ch: '‐', name: 'hyphen', keywords: 'дефис' },
      { ch: '«', name: 'left guillemet', keywords: 'кавычка ёлочка' },
      { ch: '»', name: 'right guillemet', keywords: 'кавычка ёлочка' },
      { ch: '“', name: 'left double quote', keywords: 'кавычка' },
      { ch: '”', name: 'right double quote', keywords: 'кавычка' },
      { ch: '„', name: 'low double quote', keywords: 'кавычка' },
      { ch: '‘', name: 'left single quote' },
      { ch: '’', name: 'right single quote' },
      { ch: '‚', name: 'low single quote' },
      { ch: '¿', name: 'inverted question mark' },
      { ch: '¡', name: 'inverted exclamation' },
      { ch: '·', name: 'middle dot' },
      { ch: '•', name: 'bullet' },
      { ch: '′', name: 'prime' },
      { ch: '″', name: 'double prime' },
    ],
  },
  {
    key: 'greek',
    label: 'Греческие',
    chars: [
      { ch: 'α', name: 'alpha' },
      { ch: 'β', name: 'beta' },
      { ch: 'γ', name: 'gamma' },
      { ch: 'δ', name: 'delta' },
      { ch: 'ε', name: 'epsilon' },
      { ch: 'ζ', name: 'zeta' },
      { ch: 'η', name: 'eta' },
      { ch: 'θ', name: 'theta' },
      { ch: 'ι', name: 'iota' },
      { ch: 'κ', name: 'kappa' },
      { ch: 'λ', name: 'lambda' },
      { ch: 'μ', name: 'mu' },
      { ch: 'ν', name: 'nu' },
      { ch: 'ξ', name: 'xi' },
      { ch: 'π', name: 'pi' },
      { ch: 'ρ', name: 'rho' },
      { ch: 'σ', name: 'sigma' },
      { ch: 'τ', name: 'tau' },
      { ch: 'φ', name: 'phi' },
      { ch: 'χ', name: 'chi' },
      { ch: 'ψ', name: 'psi' },
      { ch: 'ω', name: 'omega' },
      { ch: 'Γ', name: 'Gamma' },
      { ch: 'Δ', name: 'Delta' },
      { ch: 'Θ', name: 'Theta' },
      { ch: 'Λ', name: 'Lambda' },
      { ch: 'Σ', name: 'Sigma' },
      { ch: 'Φ', name: 'Phi' },
      { ch: 'Ψ', name: 'Psi' },
      { ch: 'Ω', name: 'Omega' },
    ],
  },
  {
    key: 'emoji',
    label: 'Эмодзи',
    chars: [
      { ch: '😀', name: 'grinning face', keywords: 'улыбка смех' },
      { ch: '😁', name: 'beaming face' },
      { ch: '😂', name: 'tears of joy', keywords: 'смех' },
      { ch: '🙂', name: 'slightly smiling' },
      { ch: '😉', name: 'winking face', keywords: 'подмигивание' },
      { ch: '😍', name: 'heart eyes', keywords: 'любовь' },
      { ch: '🤔', name: 'thinking face', keywords: 'думаю' },
      { ch: '😎', name: 'sunglasses', keywords: 'крутой' },
      { ch: '😢', name: 'crying face', keywords: 'грусть слёзы' },
      { ch: '😡', name: 'angry face', keywords: 'злость' },
      { ch: '👍', name: 'thumbs up', keywords: 'класс лайк' },
      { ch: '👎', name: 'thumbs down', keywords: 'дизлайк' },
      { ch: '👏', name: 'clapping', keywords: 'аплодисменты' },
      { ch: '🙏', name: 'folded hands', keywords: 'спасибо' },
      { ch: '💪', name: 'flexed biceps', keywords: 'сила' },
      { ch: '🔥', name: 'fire', keywords: 'огонь' },
      { ch: '⭐', name: 'star', keywords: 'звезда' },
      { ch: '✨', name: 'sparkles' },
      { ch: '🎉', name: 'party popper', keywords: 'праздник' },
      { ch: '✅', name: 'check mark button', keywords: 'галочка готово' },
      { ch: '❌', name: 'cross mark', keywords: 'крестик нет' },
      { ch: '❗', name: 'exclamation', keywords: 'важно' },
      { ch: '❓', name: 'question', keywords: 'вопрос' },
      { ch: '💡', name: 'light bulb', keywords: 'идея' },
      { ch: '📌', name: 'pushpin', keywords: 'закрепить' },
      { ch: '📈', name: 'chart up', keywords: 'график рост' },
      { ch: '📉', name: 'chart down', keywords: 'график спад' },
      { ch: '🚀', name: 'rocket', keywords: 'ракета запуск' },
      { ch: '⏰', name: 'alarm clock', keywords: 'время будильник' },
      { ch: '✉', name: 'envelope', keywords: 'письмо почта' },
    ],
  },
];

// Плоский поиск по всем категориям: по name, keywords и самому символу.
export function searchChars(query: string): SpecialChar[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: SpecialChar[] = [];
  const seen = new Set<string>();
  for (const cat of CHAR_CATEGORIES) {
    for (const c of cat.chars) {
      if (seen.has(c.ch)) continue;
      const hay = `${c.name} ${c.keywords ?? ''} ${c.ch}`.toLowerCase();
      if (hay.includes(q)) {
        out.push(c);
        seen.add(c.ch);
      }
    }
  }
  return out;
}
