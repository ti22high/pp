// Парсер ppt/presentation.xml (Спринт B.2): размер слайда (cx/cy в EMU),
// список ID слайдов и slideMaster-ов, разрешённых через .rels.

import type { PptxArchive } from './zip';
import { parseXml, asArray } from './xml';
import { emuToPx } from './emu';
import { parseRels, resolveRelTarget } from './rels';

export interface PresentationInfo {
  // Размер слайда в пикселях (наша единица).
  size: { w: number; h: number };
  // Абсолютные пути файлов слайдов в zip (в порядке из p:sldIdLst).
  slidePaths: string[];
  // Абсолютные пути всех slideMaster файлов.
  slideMasterPaths: string[];
}

// Дефолтный размер при отсутствии p:sldSz — 10×7.5 inch 4:3, как в PowerPoint.
const DEFAULT_W_EMU = 9144000;
const DEFAULT_H_EMU = 6858000;

const PRESENTATION_PATH = 'ppt/presentation.xml';
const PRESENTATION_RELS_PATH = 'ppt/_rels/presentation.xml.rels';

interface RawSldId {
  '@_id'?: string;
  '@_r:id'?: string;
}
interface RawSldSz {
  '@_cx'?: string;
  '@_cy'?: string;
}
interface RawPresentation {
  'p:presentation'?: {
    'p:sldSz'?: RawSldSz;
    'p:sldIdLst'?: { 'p:sldId'?: RawSldId[] };
    'p:sldMasterIdLst'?: { 'p:sldMasterId'?: RawSldId[] };
  };
}

export async function parsePresentation(zip: PptxArchive): Promise<PresentationInfo> {
  const xml = await zip.getText(PRESENTATION_PATH);
  if (!xml) throw new Error(`не найден ${PRESENTATION_PATH} — это не валидный .pptx`);

  const root = parseXml(xml) as RawPresentation;
  const pres = root['p:presentation'];
  if (!pres) throw new Error(`в ${PRESENTATION_PATH} нет корневого <p:presentation>`);

  const sz = pres['p:sldSz'];
  const cx = sz?.['@_cx'] ? parseInt(sz['@_cx'], 10) : DEFAULT_W_EMU;
  const cy = sz?.['@_cy'] ? parseInt(sz['@_cy'], 10) : DEFAULT_H_EMU;
  const size = {
    w: emuToPx(Number.isFinite(cx) ? cx : DEFAULT_W_EMU),
    h: emuToPx(Number.isFinite(cy) ? cy : DEFAULT_H_EMU),
  };

  // Резолвим slide rIds через .rels.
  const relsXml = await zip.getText(PRESENTATION_RELS_PATH);
  const rels = relsXml ? parseRels(relsXml) : new Map();

  const slidePaths: string[] = [];
  const slideMasterPaths: string[] = [];

  for (const s of asArray<RawSldId>(pres['p:sldIdLst']?.['p:sldId'])) {
    const rid = s['@_r:id'];
    if (!rid) continue;
    const rel = rels.get(rid);
    if (!rel) continue;
    slidePaths.push(resolveRelTarget(PRESENTATION_RELS_PATH, rel.target));
  }

  for (const m of asArray<RawSldId>(pres['p:sldMasterIdLst']?.['p:sldMasterId'])) {
    const rid = m['@_r:id'];
    if (!rid) continue;
    const rel = rels.get(rid);
    if (!rel) continue;
    slideMasterPaths.push(resolveRelTarget(PRESENTATION_RELS_PATH, rel.target));
  }

  return { size, slidePaths, slideMasterPaths };
}
