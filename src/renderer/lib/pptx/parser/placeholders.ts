// Сбор placeholder-ов из slideLayout / slideMaster (Спринт B.6-fix).
//
// В реальных .pptx у placeholder-ов на слайде (заголовок/тело/номер слайда)
// часто НЕТ собственного <a:xfrm> — размеры берутся из соответствующего
// placeholder-а в slideLayout, а если его там нет — из slideMaster. Без этого
// fallback'а парсер видит xfrm=0×0 и выбрасывает фигуру → почти все слайды
// «пустые».
//
// Реализация: для каждого `<p:sp>` с `<p:ph type=… idx=…>` в layout/master
// сохраняем его xfrm в Map по нескольким ключам (type|idx, type, idx),
// чтобы slide.ts мог найти по любому из них.

import { parseXml, asArray } from './xml';
import { parseXfrm, type RawSpPr, type Xfrm } from './spPr';

interface RawPhSp {
  'p:nvSpPr'?: { 'p:nvPr'?: { 'p:ph'?: { '@_type'?: string; '@_idx'?: string } } };
  'p:spPr'?: RawSpPr;
}
interface RawSpTreeLM {
  'p:sp'?: RawPhSp[];
  'p:grpSp'?: RawSpTreeLM[];
}
interface RawLayoutOrMaster {
  'p:sldLayout'?: { 'p:cSld'?: { 'p:spTree'?: RawSpTreeLM } };
  'p:sldMaster'?: { 'p:cSld'?: { 'p:spTree'?: RawSpTreeLM } };
}

// Map ключ → xfrm. Ключи кладутся в нескольких формах для надёжного матчинга.
export type PlaceholderXfrms = Map<string, Xfrm>;

// Ключ placeholder-а в форме `<type>|<idx>` (любая часть может быть пустой).
export function placeholderKey(type: string | undefined, idx: string | undefined): string {
  return `${type ?? ''}|${idx ?? ''}`;
}

function pushTree(tree: RawSpTreeLM, out: PlaceholderXfrms): void {
  for (const sp of asArray<RawPhSp>(tree['p:sp'])) {
    const ph = sp['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
    if (!ph) continue;
    const xfrm = parseXfrm(sp['p:spPr']);
    if (xfrm.w <= 0 || xfrm.h <= 0) continue;
    const type = ph['@_type'];
    const idx = ph['@_idx'];
    // Кладём в нескольких формах — точная (type|idx), по типу, по idx.
    // Не перезаписываем уже существующие ключи (более ранние в обходе
    // приоритетнее — обычно это сам placeholder, а не его вариации).
    const keys = [placeholderKey(type, idx), placeholderKey(type, undefined), placeholderKey(undefined, idx)];
    for (const k of keys) {
      if (k !== '|' && !out.has(k)) out.set(k, xfrm);
    }
  }
  for (const g of asArray<RawSpTreeLM>(tree['p:grpSp'])) pushTree(g, out);
}

// Парсит slideLayout-XML или slideMaster-XML и возвращает Map placeholder-ов.
// Если XML — null/пустой, возвращает пустую карту (это допустимо, парсер
// просто не сможет восстановить inherited xfrm для placeholder-ов).
export function parsePlaceholdersXml(xml: string | null): PlaceholderXfrms {
  const out: PlaceholderXfrms = new Map();
  if (!xml) return out;
  const root = parseXml(xml) as RawLayoutOrMaster;
  const tree = root['p:sldLayout']?.['p:cSld']?.['p:spTree'] ?? root['p:sldMaster']?.['p:cSld']?.['p:spTree'];
  if (tree) pushTree(tree, out);
  return out;
}

// Объединяет карты приоритетно: значения `override` побеждают значения `base`.
// Используется как master ⊕ layout (layout перебивает мастер).
export function mergePlaceholders(base: PlaceholderXfrms, override: PlaceholderXfrms): PlaceholderXfrms {
  const out = new Map(base);
  for (const [k, v] of override) out.set(k, v);
  return out;
}

// Пытается найти xfrm для placeholder-а по нескольким ключам в порядке точности.
export function lookupPlaceholderXfrm(
  map: PlaceholderXfrms,
  type: string | undefined,
  idx: string | undefined,
): Xfrm | undefined {
  return (
    map.get(placeholderKey(type, idx)) ??
    map.get(placeholderKey(type, undefined)) ??
    map.get(placeholderKey(undefined, idx))
  );
}
