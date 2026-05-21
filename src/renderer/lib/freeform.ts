// Построение сглаженного SVG-пути из точек, нарисованных карандашом
// (Phase 3.16). Квадратичные кривые через середины сегментов дают плавную
// freehand-линию (как Konva.Line с tension, но запекается в pathData).

export interface Pt {
  x: number;
  y: number;
}

const r = (n: number) => Math.round(n * 100) / 100;

export function pointsToSmoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${r(pts[0].x)} ${r(pts[0].y)}`;
  if (pts.length === 2) return `M ${r(pts[0].x)} ${r(pts[0].y)} L ${r(pts[1].x)} ${r(pts[1].y)}`;
  let d = `M ${r(pts[0].x)} ${r(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const next = pts[i + 1];
    const mx = (p.x + next.x) / 2;
    const my = (p.y + next.y) / 2;
    d += ` Q ${r(p.x)} ${r(p.y)} ${r(mx)} ${r(my)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${r(last.x)} ${r(last.y)}`;
  return d;
}

// Ломаная: прямые сегменты через все точки (Phase 3.17).
export function pointsToPolylinePath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  let d = `M ${r(pts[0].x)} ${r(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${r(pts[i].x)} ${r(pts[i].y)}`;
  return d;
}
