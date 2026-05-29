// Парсер OPC-relationships файлов (Спринт B.1).
//
// Каждый XML-файл в .pptx может иметь сопутствующий `<имя>.rels`, который
// описывает связи (например, slide1.xml → media/image1.png). Парсер
// возвращает Map: rId → {target, type}.

import { parseXml, asArray } from './xml';

export interface PptxRelationship {
  id: string;
  type: string;
  target: string; // относительный путь от .rels-файла
}

type RawRel = { '@_Id': string; '@_Type': string; '@_Target': string };

// Парсит содержимое `*.rels` (XML) в Map по rId.
export function parseRels(xml: string): Map<string, PptxRelationship> {
  const root = parseXml(xml) as { Relationships?: { Relationship?: RawRel[] } };
  const rels = asArray<RawRel>(root.Relationships?.Relationship);
  const map = new Map<string, PptxRelationship>();
  for (const r of rels) {
    if (!r['@_Id']) continue;
    map.set(r['@_Id'], {
      id: r['@_Id'],
      type: r['@_Type'] ?? '',
      target: r['@_Target'] ?? '',
    });
  }
  return map;
}

// Резолвит относительный путь в .rels к абсолютному имени в zip.
// Например base='ppt/slides/slide1.xml.rels', target='../media/image1.png' →
// 'ppt/media/image1.png'.
export function resolveRelTarget(relsFilePath: string, target: string): string {
  // .rels-файл лежит в '<dir>/_rels/<name>.rels'; путь относителен <dir>.
  const dir = relsFilePath.replace(/\/_rels\/[^/]+$/, '');
  const parts = dir.split('/').filter(Boolean);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}
