// Курируемая библиотека шаблонов рукописных символов → LaTeX (Phase 3.24b).
// Контуры заданы «на глаз» в коробке 0..100 (y вниз, как на холсте); распознаватель
// $P нормализует масштаб/положение, поэтому важна только форма, не размер.
// Набор намеренно ограничен и легко расширяется добавлением записей.
//
// label — что показывать на кнопке-варианте; latex — что вставлять в формулу
// (для структур — со слотами #? в нотации MathLive).

import type { InkStroke, InkTemplate } from './inkRecognizer';

// Полилиния из плоского списка [x0,y0,x1,y1,...]; распознаватель сам ресэмплит.
function poly(coords: number[]): InkStroke {
  const s: InkStroke = [];
  for (let i = 0; i + 1 < coords.length; i += 2) s.push({ x: coords[i], y: coords[i + 1] });
  return s;
}

// Эллипс/круг из k точек (замкнутый контур).
function ellipse(cx: number, cy: number, rx: number, ry: number, k = 28): InkStroke {
  const s: InkStroke = [];
  for (let i = 0; i < k; i++) {
    const a = (i / (k - 1)) * 2 * Math.PI;
    s.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return s;
}

export const INK_TEMPLATES: InkTemplate[] = [
  // --- Операторы и отношения ---
  { latex: '+', label: '+', strokes: [poly([50, 18, 50, 82]), poly([18, 50, 82, 50])] },
  { latex: '-', label: '−', strokes: [poly([18, 50, 82, 50])] },
  { latex: '=', label: '=', strokes: [poly([18, 40, 82, 40]), poly([18, 60, 82, 60])] },
  { latex: '\\times', label: '×', strokes: [poly([25, 25, 75, 75]), poly([75, 25, 25, 75])] },
  { latex: '\\pm', label: '±', strokes: [poly([50, 15, 50, 58]), poly([25, 36, 75, 36]), poly([25, 80, 75, 80])] },
  { latex: '/', label: '/', strokes: [poly([72, 18, 28, 82])] },
  { latex: '<', label: '<', strokes: [poly([72, 22, 28, 50, 72, 78])] },
  { latex: '>', label: '>', strokes: [poly([28, 22, 72, 50, 28, 78])] },
  { latex: '\\neq', label: '≠', strokes: [poly([20, 42, 80, 42]), poly([20, 62, 80, 62]), poly([62, 25, 38, 80])] },
  { latex: '\\approx', label: '≈', strokes: [poly([20, 42, 35, 36, 50, 42, 65, 36, 80, 42]), poly([20, 60, 35, 54, 50, 60, 65, 54, 80, 60])] },
  { latex: '\\to', label: '→', strokes: [poly([18, 50, 82, 50]), poly([82, 50, 68, 42]), poly([82, 50, 68, 58])] },

  // --- Скобки ---
  { latex: '\\left(#?\\right)', label: '( )', strokes: [poly([62, 18, 42, 34, 37, 50, 42, 66, 62, 82])] },
  { latex: '\\left(#?\\right)', label: ') ', strokes: [poly([38, 18, 58, 34, 63, 50, 58, 66, 38, 82])] },
  { latex: '\\left[#?\\right]', label: '[ ]', strokes: [poly([60, 18, 40, 18, 40, 82, 60, 82])] },

  // --- Структуры ---
  { latex: '\\sqrt{#?}', label: '√', strokes: [poly([12, 56, 28, 50, 44, 86, 70, 18, 96, 18])] },
  { latex: '\\int', label: '∫', strokes: [poly([62, 14, 66, 16, 58, 32, 50, 50, 42, 70, 34, 86, 38, 88])] },
  { latex: '\\sum', label: 'Σ', strokes: [poly([76, 20, 24, 20, 50, 50, 24, 80, 76, 80])] },
  { latex: '\\prod', label: '∏', strokes: [poly([22, 22, 78, 22]), poly([34, 22, 34, 82]), poly([66, 22, 66, 82])] },
  { latex: '\\infty', label: '∞', strokes: [poly([50, 50, 36, 38, 24, 50, 36, 62, 50, 50, 64, 38, 76, 50, 64, 62, 50, 50])] },

  // --- Греческие ---
  { latex: '\\pi', label: 'π', strokes: [poly([24, 38, 82, 38]), poly([40, 38, 34, 82]), poly([66, 38, 72, 82])] },
  { latex: '\\alpha', label: 'α', strokes: [poly([72, 36, 56, 28, 40, 36, 34, 52, 40, 68, 56, 74, 70, 66, 60, 50, 70, 34, 80, 72])] },
  { latex: '\\beta', label: 'β', strokes: [poly([34, 92, 34, 32, 44, 20, 60, 24, 63, 40, 50, 50, 66, 58, 63, 76, 46, 82, 34, 74])] },
  { latex: '\\theta', label: 'θ', strokes: [ellipse(50, 50, 22, 34), poly([28, 50, 72, 50])] },
  { latex: '\\lambda', label: 'λ', strokes: [poly([24, 86, 56, 18]), poly([42, 50, 74, 86])] },
  { latex: '\\mu', label: 'μ', strokes: [poly([26, 32, 26, 78, 36, 86]), poly([26, 64, 40, 72, 56, 66, 60, 32]), poly([60, 32, 64, 86])] },
  { latex: '\\omega', label: 'ω', strokes: [poly([24, 32, 22, 60, 34, 72, 46, 56, 50, 72, 54, 56, 66, 72, 78, 60, 76, 32])] },
  { latex: '\\phi', label: 'φ', strokes: [ellipse(50, 50, 20, 28), poly([50, 14, 50, 88])] },
  { latex: '\\Delta', label: 'Δ', strokes: [poly([50, 20, 80, 80, 20, 80, 50, 20])] },
  { latex: '\\Omega', label: 'Ω', strokes: [poly([28, 82, 22, 60, 26, 40, 40, 24, 60, 24, 74, 40, 78, 60, 72, 82]), poly([22, 82, 38, 82]), poly([62, 82, 78, 82])] },

  // --- Цифры ---
  { latex: '0', label: '0', strokes: [ellipse(50, 50, 26, 40)] },
  { latex: '1', label: '1', strokes: [poly([38, 30, 52, 18, 52, 85])] },
  { latex: '2', label: '2', strokes: [poly([28, 32, 42, 20, 62, 24, 68, 40, 52, 58, 30, 80, 72, 80])] },
  { latex: '3', label: '3', strokes: [poly([30, 24, 60, 21, 66, 38, 46, 50, 66, 62, 60, 80, 30, 78])] },
  { latex: '4', label: '4', strokes: [poly([62, 18, 24, 64, 78, 64]), poly([62, 36, 62, 86])] },
  { latex: '5', label: '5', strokes: [poly([66, 22, 36, 22, 32, 48, 56, 44, 68, 60, 58, 80, 30, 78])] },
  { latex: '6', label: '6', strokes: [poly([62, 24, 42, 30, 32, 56, 40, 78, 60, 76, 66, 58, 50, 48, 36, 56])] },
  { latex: '7', label: '7', strokes: [poly([28, 24, 72, 24, 44, 84])] },
  { latex: '8', label: '8', strokes: [poly([50, 48, 38, 38, 42, 25, 58, 25, 62, 38, 50, 48, 36, 60, 40, 78, 60, 78, 64, 60, 50, 48])] },
  { latex: '9', label: '9', strokes: [poly([64, 46, 50, 53, 38, 42, 48, 28, 64, 32, 66, 56, 56, 80, 38, 84])] },

  // --- Латинские (частые в формулах) ---
  { latex: 'x', label: 'x', strokes: [poly([30, 30, 70, 75]), poly([70, 30, 30, 75])] },
  { latex: 'y', label: 'y', strokes: [poly([30, 30, 50, 62]), poly([72, 30, 50, 62, 38, 92])] },
  { latex: 'n', label: 'n', strokes: [poly([30, 35, 30, 80]), poly([30, 45, 45, 36, 62, 42, 66, 80])] },
];
