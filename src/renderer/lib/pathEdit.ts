// Разбор/сборка SVG-пути для редактирования точек кривой (Phase 3.17).
// Поддерживаем команды, которые сами генерируем: M, L, Q, T (T разворачиваем
// в явный Q с отражённой контрольной точкой). Координаты — абсолютные.

export interface Pt {
  x: number;
  y: number;
}
// Сегмент: M/L — одна точка (end); Q — control + end.
export interface Seg {
  cmd: 'M' | 'L' | 'Q';
  control?: Pt;
  end: Pt;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function parsePath(d: string): Seg[] {
  const tokens = d.match(/[MLQTmlqt]|-?\d*\.?\d+(?:e-?\d+)?/g);
  if (!tokens) return [];
  const segs: Seg[] = [];
  let i = 0;
  let cur: Pt = { x: 0, y: 0 };
  let lastControl: Pt | null = null;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') {
      const p = { x: num(), y: num() };
      segs.push({ cmd, end: p });
      cur = p;
      lastControl = null;
    } else if (cmd === 'Q') {
      const c = { x: num(), y: num() };
      const e = { x: num(), y: num() };
      segs.push({ cmd: 'Q', control: c, end: e });
      cur = e;
      lastControl = c;
    } else if (cmd === 'T') {
      const e = { x: num(), y: num() };
      // Контрольная — отражение предыдущей относительно текущей точки.
      const c: Pt = lastControl ? { x: 2 * cur.x - lastControl.x, y: 2 * cur.y - lastControl.y } : { x: cur.x, y: cur.y };
      segs.push({ cmd: 'Q', control: c, end: e });
      cur = e;
      lastControl = c;
    } else {
      // Неизвестная команда (например, A) — пропускаем редактирование.
      return segs;
    }
  }
  return segs;
}

export function serializePath(segs: Seg[]): string {
  return segs
    .map((s) => {
      if (s.cmd === 'Q' && s.control) {
        return `Q ${round(s.control.x)} ${round(s.control.y)} ${round(s.end.x)} ${round(s.end.y)}`;
      }
      return `${s.cmd} ${round(s.end.x)} ${round(s.end.y)}`;
    })
    .join(' ');
}

export interface Handle {
  segIndex: number;
  kind: 'anchor' | 'control';
  x: number;
  y: number;
}

// Точки для перетаскивания: опорные (end каждого сегмента) + контрольные (Q).
export function pathHandles(segs: Seg[]): Handle[] {
  const h: Handle[] = [];
  segs.forEach((s, i) => {
    if (s.cmd === 'Q' && s.control) h.push({ segIndex: i, kind: 'control', x: s.control.x, y: s.control.y });
    h.push({ segIndex: i, kind: 'anchor', x: s.end.x, y: s.end.y });
  });
  return h;
}

export function moveHandle(segs: Seg[], hIndex: number, x: number, y: number): Seg[] {
  const handles = pathHandles(segs);
  const h = handles[hIndex];
  if (!h) return segs;
  const next = segs.map((s) => ({ ...s, control: s.control ? { ...s.control } : undefined, end: { ...s.end } }));
  if (h.kind === 'control' && next[h.segIndex].control) next[h.segIndex].control = { x, y };
  else next[h.segIndex].end = { x, y };
  return next;
}
