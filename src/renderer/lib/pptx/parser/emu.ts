// EMU (English Metric Units) — единицы OOXML. 914400 EMU = 1 дюйм; при 96 DPI
// один пиксель = 914400/96 = 9525 EMU (SPEC §6.1).
// Все размеры/координаты в .pptx XML — в EMU. Наша модель — в пикселях.

import { EMU_PER_PX } from '@shared/constants';

// EMU → пиксели (наша внутренняя единица). Округляем до десятых — для канвы
// этого достаточно, а сравнивать дробные значения в тестах проще.
export function emuToPx(emu: number | string | undefined): number {
  if (emu === undefined || emu === null || emu === '') return 0;
  const n = typeof emu === 'string' ? parseInt(emu, 10) : emu;
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / EMU_PER_PX) * 10) / 10;
}

// Пиксели → EMU (для экспорта). Округляем до целых EMU.
export function pxToEmu(px: number): number {
  return Math.round(px * EMU_PER_PX);
}

// Размер шрифта в OOXML — в «сотых пункта»: sz="2400" значит 24pt. Делим на 100.
export function sizeToPt(sz: number | string | undefined): number {
  if (sz === undefined || sz === null || sz === '') return 12;
  const n = typeof sz === 'string' ? parseInt(sz, 10) : sz;
  if (!Number.isFinite(n) || n <= 0) return 12;
  return n / 100;
}

// Угол в OOXML — в 60000-х долях градуса. rot="5400000" = 90°.
export function rotToDeg(rot: number | string | undefined): number {
  if (rot === undefined || rot === null || rot === '') return 0;
  const n = typeof rot === 'string' ? parseInt(rot, 10) : rot;
  if (!Number.isFinite(n)) return 0;
  return n / 60000;
}
