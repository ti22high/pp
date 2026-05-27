// Распознаватель рукописных символов $P (point-cloud recognizer,
// Vatavu/Anthony/Wobbrock, 2012). Полностью офлайн, без зависимостей и обучения
// (Phase 3.24b). Сопоставляет нарисованные штрихи с библиотекой шаблонов
// (lib/inkTemplates) и возвращает ранжированные варианты LaTeX.
//
// Особенности под математику: масштабирование РАВНОМЕРНОЕ (сохраняем пропорции,
// чтобы «−» и «|» различались) и БЕЗ поворота (ориентация значима: «+» vs «×»).

export interface InkPoint {
  x: number;
  y: number;
}
export type InkStroke = InkPoint[];

export interface InkTemplate {
  latex: string;
  label: string;
  // Эталон в виде штрихов (поддержка многоштриховых символов: =, +, ×, …).
  strokes: InkStroke[];
}

export interface InkMatch {
  latex: string;
  label: string;
  // Дистанция $P: меньше — лучше совпадение.
  score: number;
}

const NUM_POINTS = 32;

function distance(a: InkPoint, b: InkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(points: InkPoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += distance(points[i - 1], points[i]);
  return len;
}

// Передискретизация пути в n равноотстоящих точек по длине дуги.
function resample(points: InkPoint[], n: number): InkPoint[] {
  const pts = points.slice();
  const interval = pathLength(pts) / (n - 1);
  let accumulated = 0;
  const out: InkPoint[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (accumulated + d >= interval) {
      const t = (interval - accumulated) / d;
      const q = {
        x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
      };
      out.push(q);
      pts.splice(i, 0, q); // продолжаем обход от вставленной точки
      accumulated = 0;
    } else {
      accumulated += d;
    }
  }
  // Из-за погрешности с плавающей точкой может не хватить одной точки.
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out.slice(0, n);
}

function centroid(points: InkPoint[]): InkPoint {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

// Нормализация многоштрихового символа: каждый штрих ресэмплится отдельно
// (без «прыжков» между штрихами) пропорционально своей длине → ровно NUM_POINTS
// точек → равномерный масштаб → центр в начало координат.
function normalize(strokes: InkStroke[]): InkPoint[] {
  const clean = strokes.filter((s) => s.length >= 2 && pathLength(s) > 0);
  if (clean.length === 0) return [];
  const lens = clean.map(pathLength);
  const total = lens.reduce((a, b) => a + b, 0);
  let pts: InkPoint[] = [];
  clean.forEach((s, i) => {
    const ni = Math.max(2, Math.round(NUM_POINTS * (lens[i] / total)));
    pts = pts.concat(resample(s, ni));
  });
  // Гарантируем ровно NUM_POINTS точек (для $P оба облака одной длины).
  while (pts.length < NUM_POINTS) pts.push(pts[pts.length - 1]);
  pts = pts.slice(0, NUM_POINTS);

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const scaled = pts.map((p) => ({ x: p.x / size, y: p.y / size }));
  const c = centroid(scaled);
  return scaled.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

// Сумма взвешенных расстояний жадного сопоставления облака pts1 → pts2.
function cloudDistance(pts1: InkPoint[], pts2: InkPoint[], start: number): number {
  const n = pts1.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let minD = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = distance(pts1[i], pts2[j]);
        if (d < minD) {
          minD = d;
          index = j;
        }
      }
    }
    if (index >= 0) matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * minD;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyCloudMatch(pts1: InkPoint[], pts2: InkPoint[]): number {
  const n = pts1.length;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(pts1, pts2, i), cloudDistance(pts2, pts1, i));
  }
  return min;
}

// Распознать нарисованные штрихи: вернуть topN вариантов LaTeX по возрастанию score.
export function recognize(
  strokes: InkStroke[],
  templates: InkTemplate[],
  topN = 4,
): InkMatch[] {
  const candidate = normalize(strokes);
  if (candidate.length === 0) return [];
  const matches: InkMatch[] = templates.map((t) => ({
    latex: t.latex,
    label: t.label,
    score: greedyCloudMatch(candidate, normalize(t.strokes)),
  }));
  matches.sort((a, b) => a.score - b.score);
  return matches.slice(0, topN);
}
