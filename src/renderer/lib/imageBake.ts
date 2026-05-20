import type Konva from 'konva';
import { useDeckStore } from '@renderer/stores/deck';
import { maskClipFunc, type MaskKey } from '@renderer/lib/imageMasks';

// Деструктивное «запекание» операций над изображением (Phase 3.2–3.3).
// Каждая обрезка/маска создаёт НОВОЕ изображение (PNG data URL), к которому
// далее применяются следующие операции — как «новое фото». Так результат
// предсказуем и не зависит от порядка слоёв.

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
} // доли [0..1] исходника

// Рендерит регион исходника (опц. с маской-формой) в новый PNG.
function bake(
  src: string,
  region: Region,
  maskKey: MaskKey | null,
): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const im = new window.Image();
    im.onload = () => {
      const nW = im.naturalWidth;
      const nH = im.naturalHeight;
      const sx = Math.round(region.x * nW);
      const sy = Math.round(region.y * nH);
      const sw = Math.max(1, Math.round(region.w * nW));
      const sh = Math.max(1, Math.round(region.h * nH));
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('no 2d context'));
        return;
      }
      if (maskKey) {
        ctx.save();
        // maskClipFunc рисует path обычными canvas-методами — работает и на
        // нативном CanvasRenderingContext2D (Konva.Context их проксирует).
        maskClipFunc(maskKey, 0, 0, sw, sh)(ctx as unknown as Konva.Context);
        ctx.clip();
      }
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      if (maskKey) ctx.restore();
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: sw, h: sh });
    };
    im.onerror = () => reject(new Error('image decode failed'));
    im.src = src;
  });
}

// Заменяет картинку результатом запекания: новый src + размеры. Сбрасывает
// crop/maskShape (они «впечатаны» в пиксели). box — новый display-bbox.
function replaceBaked(
  slideId: string,
  shapeId: string,
  dataUrl: string,
  natW: number,
  natH: number,
  box: { x: number; y: number; w: number; h: number },
): void {
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'image') return;
    sh.src = dataUrl;
    sh.naturalW = natW;
    sh.naturalH = natH;
    sh.crop = undefined;
    sh.maskShape = undefined;
    sh.x = box.x;
    sh.y = box.y;
    sh.w = box.w;
    sh.h = box.h;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

function getImageShape(slideId: string, shapeId: string) {
  const sh = useDeckStore.getState().deck?.slides[slideId]?.shapes.find((x) => x.id === shapeId);
  return sh && sh.type === 'image' ? sh : null;
}

// Обрезка прямоугольником: regionFrac — доля текущей картинки, box — новый
// display-bbox (slide-coords).
export async function cropImageBaked(
  slideId: string,
  shapeId: string,
  regionFrac: Region,
  box: { x: number; y: number; w: number; h: number },
): Promise<void> {
  const sh = getImageShape(slideId, shapeId);
  if (!sh) return;
  const { dataUrl, w, h } = await bake(sh.src, regionFrac, null);
  replaceBaked(slideId, shapeId, dataUrl, w, h, box);
}

// Наложение маски-формы: впечатывает форму в текущую картинку целиком,
// display-bbox не меняется.
export async function maskImageBaked(
  slideId: string,
  shapeId: string,
  maskKey: MaskKey,
): Promise<void> {
  const sh = getImageShape(slideId, shapeId);
  if (!sh) return;
  const { dataUrl, w, h } = await bake(sh.src, { x: 0, y: 0, w: 1, h: 1 }, maskKey);
  replaceBaked(slideId, shapeId, dataUrl, w, h, { x: sh.x, y: sh.y, w: sh.w, h: sh.h });
}
