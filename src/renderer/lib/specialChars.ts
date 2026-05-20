// Курированный набор Unicode-символов для пикера спецсимволов (§1.11).
// Не полный Unicode — практичный набор по категориям. У каждого символа есть
// name (англ.) + keywords (рус. синонимы) для поиска по имени на двух языках.

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
      { ch: '×', name: 'multiply', keywords: 'умножение умножить' },
      { ch: '÷', name: 'division', keywords: 'деление делить' },
      { ch: '−', name: 'minus', keywords: 'минус вычитание' },
      { ch: '=', name: 'equals', keywords: 'равно равенство' },
      { ch: '≠', name: 'not equal', keywords: 'не равно неравенство' },
      { ch: '≈', name: 'approximately', keywords: 'примерно приблизительно' },
      { ch: '≡', name: 'identical', keywords: 'тождественно эквивалентно' },
      { ch: '≤', name: 'less or equal', keywords: 'меньше или равно' },
      { ch: '≥', name: 'greater or equal', keywords: 'больше или равно' },
      { ch: '∞', name: 'infinity', keywords: 'бесконечность' },
      { ch: '√', name: 'square root', keywords: 'корень квадратный' },
      { ch: '∛', name: 'cube root', keywords: 'корень кубический' },
      { ch: '∑', name: 'sum', keywords: 'сумма суммирование' },
      { ch: '∏', name: 'product', keywords: 'произведение' },
      { ch: '∫', name: 'integral', keywords: 'интеграл' },
      { ch: '∂', name: 'partial derivative', keywords: 'частная производная' },
      { ch: '∇', name: 'nabla', keywords: 'набла градиент' },
      { ch: '∆', name: 'delta', keywords: 'дельта приращение' },
      { ch: 'π', name: 'pi', keywords: 'пи число' },
      { ch: '°', name: 'degree', keywords: 'градус' },
      { ch: '′', name: 'prime', keywords: 'штрих минута' },
      { ch: '″', name: 'double prime', keywords: 'двойной штрих секунда' },
      { ch: '∈', name: 'element of', keywords: 'принадлежит элемент' },
      { ch: '∉', name: 'not element of', keywords: 'не принадлежит' },
      { ch: '⊂', name: 'subset', keywords: 'подмножество' },
      { ch: '⊆', name: 'subset or equal', keywords: 'подмножество или равно' },
      { ch: '∪', name: 'union', keywords: 'объединение' },
      { ch: '∩', name: 'intersection', keywords: 'пересечение' },
      { ch: '∀', name: 'for all', keywords: 'для всех квантор' },
      { ch: '∃', name: 'exists', keywords: 'существует квантор' },
      { ch: '∅', name: 'empty set', keywords: 'пустое множество' },
      { ch: '⊥', name: 'perpendicular', keywords: 'перпендикуляр' },
      { ch: '∥', name: 'parallel', keywords: 'параллельно' },
      { ch: '∠', name: 'angle', keywords: 'угол' },
      { ch: '½', name: 'one half', keywords: 'половина дробь одна вторая' },
      { ch: '¼', name: 'one quarter', keywords: 'четверть дробь одна четвёртая' },
      { ch: '¾', name: 'three quarters', keywords: 'три четверти дробь' },
    ],
  },
  {
    key: 'symbols',
    label: 'Символы',
    chars: [
      { ch: '©', name: 'copyright', keywords: 'копирайт авторское право' },
      { ch: '®', name: 'registered', keywords: 'зарегистрировано знак' },
      { ch: '™', name: 'trademark', keywords: 'торговая марка' },
      { ch: '§', name: 'section', keywords: 'параграф раздел' },
      { ch: '¶', name: 'pilcrow', keywords: 'абзац' },
      { ch: '†', name: 'dagger', keywords: 'крест кинжал сноска' },
      { ch: '‡', name: 'double dagger', keywords: 'двойной крест сноска' },
      { ch: '•', name: 'bullet', keywords: 'маркер точка список' },
      { ch: '◦', name: 'white bullet', keywords: 'маркер кружок' },
      { ch: '‣', name: 'triangular bullet', keywords: 'маркер треугольник' },
      { ch: '·', name: 'middle dot', keywords: 'точка средняя' },
      { ch: '…', name: 'ellipsis', keywords: 'многоточие троеточие' },
      { ch: '‰', name: 'per mille', keywords: 'промилле' },
      { ch: '€', name: 'euro', keywords: 'евро валюта' },
      { ch: '£', name: 'pound', keywords: 'фунт валюта' },
      { ch: '¥', name: 'yen', keywords: 'йена иена валюта' },
      { ch: '¢', name: 'cent', keywords: 'цент валюта' },
      { ch: '₽', name: 'ruble', keywords: 'рубль валюта' },
      { ch: '$', name: 'dollar', keywords: 'доллар валюта' },
      { ch: '№', name: 'numero', keywords: 'номер' },
      { ch: '★', name: 'black star', keywords: 'звезда чёрная' },
      { ch: '☆', name: 'white star', keywords: 'звезда белая' },
      { ch: '♥', name: 'heart', keywords: 'сердце любовь' },
      { ch: '♦', name: 'diamond', keywords: 'бубны ромб' },
      { ch: '♣', name: 'club', keywords: 'трефы крести' },
      { ch: '♠', name: 'spade', keywords: 'пики' },
      { ch: '✓', name: 'check mark', keywords: 'галочка отметка' },
      { ch: '✔', name: 'heavy check mark', keywords: 'галочка жирная' },
      { ch: '✗', name: 'ballot x', keywords: 'крестик отмена' },
      { ch: '✦', name: 'black four pointed star', keywords: 'звезда четырёхконечная' },
      { ch: '☑', name: 'checked box', keywords: 'галочка флажок отмечено' },
      { ch: '☐', name: 'empty box', keywords: 'флажок пустой чекбокс' },
      { ch: '※', name: 'reference mark', keywords: 'ссылка примечание' },
      { ch: '⚠', name: 'warning', keywords: 'внимание предупреждение' },
    ],
  },
  {
    key: 'arrows',
    label: 'Стрелки',
    chars: [
      { ch: '←', name: 'left arrow', keywords: 'стрелка влево' },
      { ch: '→', name: 'right arrow', keywords: 'стрелка вправо' },
      { ch: '↑', name: 'up arrow', keywords: 'стрелка вверх' },
      { ch: '↓', name: 'down arrow', keywords: 'стрелка вниз' },
      { ch: '↔', name: 'left right arrow', keywords: 'стрелка влево вправо горизонтальная' },
      { ch: '↕', name: 'up down arrow', keywords: 'стрелка вверх вниз вертикальная' },
      { ch: '↖', name: 'up left arrow', keywords: 'стрелка вверх влево' },
      { ch: '↗', name: 'up right arrow', keywords: 'стрелка вверх вправо' },
      { ch: '↘', name: 'down right arrow', keywords: 'стрелка вниз вправо' },
      { ch: '↙', name: 'down left arrow', keywords: 'стрелка вниз влево' },
      { ch: '⇐', name: 'left double arrow', keywords: 'стрелка двойная влево' },
      { ch: '⇒', name: 'right double arrow', keywords: 'стрелка двойная вправо' },
      { ch: '⇔', name: 'left right double arrow', keywords: 'стрелка двойная влево вправо' },
      { ch: '⇑', name: 'up double arrow', keywords: 'стрелка двойная вверх' },
      { ch: '⇓', name: 'down double arrow', keywords: 'стрелка двойная вниз' },
      { ch: '➜', name: 'heavy round-tipped right arrow', keywords: 'стрелка жирная вправо' },
      { ch: '➤', name: 'black right arrowhead', keywords: 'стрелка треугольник вправо' },
      { ch: '⟶', name: 'long right arrow', keywords: 'стрелка длинная вправо' },
      { ch: '⟵', name: 'long left arrow', keywords: 'стрелка длинная влево' },
      { ch: '↻', name: 'clockwise arrow', keywords: 'стрелка по часовой повтор' },
      { ch: '↺', name: 'counterclockwise arrow', keywords: 'стрелка против часовой' },
    ],
  },
  {
    key: 'punctuation',
    label: 'Пунктуация',
    chars: [
      { ch: '—', name: 'em dash', keywords: 'тире длинное' },
      { ch: '–', name: 'en dash', keywords: 'тире среднее' },
      { ch: '‐', name: 'hyphen', keywords: 'дефис' },
      { ch: '«', name: 'left guillemet', keywords: 'кавычка ёлочка левая' },
      { ch: '»', name: 'right guillemet', keywords: 'кавычка ёлочка правая' },
      { ch: '“', name: 'left double quote', keywords: 'кавычка двойная левая' },
      { ch: '”', name: 'right double quote', keywords: 'кавычка двойная правая' },
      { ch: '„', name: 'low double quote', keywords: 'кавычка лапки нижняя' },
      { ch: '‘', name: 'left single quote', keywords: 'кавычка одинарная левая' },
      { ch: '’', name: 'right single quote', keywords: 'кавычка одинарная правая апостроф' },
      { ch: '‚', name: 'low single quote', keywords: 'кавычка одинарная нижняя' },
      { ch: '¿', name: 'inverted question mark', keywords: 'вопрос перевёрнутый' },
      { ch: '¡', name: 'inverted exclamation', keywords: 'восклицание перевёрнутое' },
      { ch: '·', name: 'middle dot', keywords: 'точка средняя' },
      { ch: '•', name: 'bullet', keywords: 'маркер точка' },
      { ch: '′', name: 'prime', keywords: 'штрих минута' },
      { ch: '″', name: 'double prime', keywords: 'двойной штрих секунда' },
    ],
  },
  {
    key: 'greek',
    label: 'Греческие',
    chars: [
      { ch: 'α', name: 'alpha', keywords: 'альфа греческая' },
      { ch: 'β', name: 'beta', keywords: 'бета греческая' },
      { ch: 'γ', name: 'gamma', keywords: 'гамма греческая' },
      { ch: 'δ', name: 'delta', keywords: 'дельта греческая' },
      { ch: 'ε', name: 'epsilon', keywords: 'эпсилон греческая' },
      { ch: 'ζ', name: 'zeta', keywords: 'дзета греческая' },
      { ch: 'η', name: 'eta', keywords: 'эта греческая' },
      { ch: 'θ', name: 'theta', keywords: 'тета греческая' },
      { ch: 'ι', name: 'iota', keywords: 'йота греческая' },
      { ch: 'κ', name: 'kappa', keywords: 'каппа греческая' },
      { ch: 'λ', name: 'lambda', keywords: 'лямбда греческая' },
      { ch: 'μ', name: 'mu', keywords: 'мю греческая микро' },
      { ch: 'ν', name: 'nu', keywords: 'ню греческая' },
      { ch: 'ξ', name: 'xi', keywords: 'кси греческая' },
      { ch: 'π', name: 'pi', keywords: 'пи греческая' },
      { ch: 'ρ', name: 'rho', keywords: 'ро греческая' },
      { ch: 'σ', name: 'sigma', keywords: 'сигма греческая' },
      { ch: 'τ', name: 'tau', keywords: 'тау греческая' },
      { ch: 'φ', name: 'phi', keywords: 'фи греческая' },
      { ch: 'χ', name: 'chi', keywords: 'хи греческая' },
      { ch: 'ψ', name: 'psi', keywords: 'пси греческая' },
      { ch: 'ω', name: 'omega', keywords: 'омега греческая' },
      { ch: 'Γ', name: 'Gamma', keywords: 'гамма заглавная греческая' },
      { ch: 'Δ', name: 'Delta', keywords: 'дельта заглавная греческая' },
      { ch: 'Θ', name: 'Theta', keywords: 'тета заглавная греческая' },
      { ch: 'Λ', name: 'Lambda', keywords: 'лямбда заглавная греческая' },
      { ch: 'Σ', name: 'Sigma', keywords: 'сигма заглавная греческая сумма' },
      { ch: 'Φ', name: 'Phi', keywords: 'фи заглавная греческая' },
      { ch: 'Ψ', name: 'Psi', keywords: 'пси заглавная греческая' },
      { ch: 'Ω', name: 'Omega', keywords: 'омега заглавная греческая ом' },
    ],
  },
  {
    key: 'emoji',
    label: 'Эмодзи',
    chars: [
      { ch: '😀', name: 'grinning face', keywords: 'улыбка смех лицо' },
      { ch: '😁', name: 'beaming face', keywords: 'улыбка зубы лицо' },
      { ch: '😂', name: 'tears of joy', keywords: 'смех слёзы радость' },
      { ch: '🙂', name: 'slightly smiling', keywords: 'улыбка лёгкая лицо' },
      { ch: '😉', name: 'winking face', keywords: 'подмигивание лицо' },
      { ch: '😍', name: 'heart eyes', keywords: 'любовь сердечки восторг' },
      { ch: '🤔', name: 'thinking face', keywords: 'думаю размышление' },
      { ch: '😎', name: 'sunglasses', keywords: 'крутой очки' },
      { ch: '😢', name: 'crying face', keywords: 'грусть слёзы плач' },
      { ch: '😡', name: 'angry face', keywords: 'злость гнев' },
      { ch: '👍', name: 'thumbs up', keywords: 'класс лайк палец вверх' },
      { ch: '👎', name: 'thumbs down', keywords: 'дизлайк палец вниз' },
      { ch: '👏', name: 'clapping', keywords: 'аплодисменты хлопки' },
      { ch: '🙏', name: 'folded hands', keywords: 'спасибо молитва руки' },
      { ch: '💪', name: 'flexed biceps', keywords: 'сила мышцы бицепс' },
      { ch: '🔥', name: 'fire', keywords: 'огонь пожар' },
      { ch: '⭐', name: 'star', keywords: 'звезда' },
      { ch: '✨', name: 'sparkles', keywords: 'искры блёстки' },
      { ch: '🎉', name: 'party popper', keywords: 'праздник конфетти' },
      { ch: '✅', name: 'check mark button', keywords: 'галочка готово да' },
      { ch: '❌', name: 'cross mark', keywords: 'крестик нет ошибка' },
      { ch: '❗', name: 'exclamation', keywords: 'важно восклицание' },
      { ch: '❓', name: 'question', keywords: 'вопрос' },
      { ch: '💡', name: 'light bulb', keywords: 'идея лампочка' },
      { ch: '📌', name: 'pushpin', keywords: 'закрепить кнопка булавка' },
      { ch: '📈', name: 'chart up', keywords: 'график рост вверх' },
      { ch: '📉', name: 'chart down', keywords: 'график спад вниз' },
      { ch: '🚀', name: 'rocket', keywords: 'ракета запуск старт' },
      { ch: '⏰', name: 'alarm clock', keywords: 'время будильник часы' },
      { ch: '✉', name: 'envelope', keywords: 'письмо почта конверт' },
    ],
  },
];

// Плоский поиск по всем категориям: по name (англ.), keywords (рус.) и
// самому символу. Регистронезависимый, по подстроке любого слова.
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
