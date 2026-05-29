// Парсер <p:pic> → imageShape (Спринт B.7).
//
// Извлекает байты картинки из zip (через rId → .rels → media/<file>), сохраняет
// в MediaManager (window.api.media.save) и подставляет 'app://media/<sha256>.<ext>'
// в Shape.src. naturalW/H берём из xfrm (точные исходные пиксели можно было бы
// получить только декодированием — для MVP достаточно размера контейнера).

import { createImage } from '../../model/factory';
import type { ImageShape } from '../../model/schema';
import { parseXfrm, type RawSpPr } from './spPr';
import type { PptxArchive } from './zip';
import type { PptxRelationship } from './rels';
import { resolveRelTarget } from './rels';
import { saveBytes } from '../../media';

interface RawBlip {
  '@_r:embed'?: string;
}
interface RawBlipFill {
  'a:blip'?: RawBlip;
}
export interface RawPic {
  'p:blipFill'?: RawBlipFill;
  'p:spPr'?: RawSpPr;
}

export interface PicContext {
  archive: PptxArchive;
  // Полный путь к .rels файлу слайда — для resolveRelTarget('../media/...').
  slideRelsPath: string;
  // Маппинг rId → Relationship из этого .rels.
  rels: Map<string, PptxRelationship>;
}

// Извлекает расширение файла (без точки, lowercase) или 'bin' если нет.
function extOf(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m ? m[1].toLowerCase() : 'bin';
}

export async function parsePic(pic: RawPic, ctx: PicContext): Promise<ImageShape | null> {
  const xfrm = parseXfrm(pic['p:spPr']);
  if (xfrm.w <= 0 || xfrm.h <= 0) return null;

  const rId = pic['p:blipFill']?.['a:blip']?.['@_r:embed'];
  if (!rId) return null;
  const rel = ctx.rels.get(rId);
  if (!rel) return null;

  // Путь к файлу медиа в zip-е.
  const mediaPath = resolveRelTarget(ctx.slideRelsPath, rel.target);
  const bytes = await ctx.archive.getBytes(mediaPath);
  if (!bytes) return null;

  // Кладём в MediaManager и получаем 'app://media/<sha256>.<ext>'.
  const ext = extOf(mediaPath);
  const src = await saveBytes(bytes, ext);

  // naturalW/H приближаем размером контейнера. Точные пиксели можно вычислить
  // позже (декодирование через createImageBitmap) — на v1 не критично.
  const shape = createImage(xfrm.x, xfrm.y, xfrm.w, xfrm.h, src, xfrm.w, xfrm.h);
  if (xfrm.rotation) shape.rotation = xfrm.rotation;
  if (xfrm.flipH) shape.flipH = true;
  if (xfrm.flipV) shape.flipV = true;
  return shape;
}
