// Обёртка fast-xml-parser для .pptx (Спринт B.1).
//
// Критично (SPEC §14.4): fast-xml-parser по умолчанию для одного дочернего
// элемента возвращает объект, а для нескольких — массив. Это ломает обход
// XML слайда (один `<p:sp>` vs несколько). Решение — явный isArray callback
// со списком тегов, которые ВСЕГДА массивы.

import { XMLParser } from 'fast-xml-parser';

// Теги, которые в OOXML могут повторяться. Перечисляем все встречающиеся в
// PresentationML / DrawingML / SpreadsheetML, чтобы парсер всегда давал массив,
// даже для единственного элемента. Список рос инкрементально по мере парсинга.
const ALWAYS_ARRAY = new Set<string>([
  // PresentationML: дерево фигур и сами фигуры.
  'p:sp',
  'p:pic',
  'p:cxnSp',
  'p:graphicFrame',
  'p:grpSp',
  'p:sldId',
  'p:sldLayoutId',
  'p:sldMasterId',
  'p:notesMasterId',
  // DrawingML: текстовые runs, абзацы, параграфы.
  'a:p',
  'a:r',
  'a:t',
  'a:br',
  'a:fld',
  // DrawingML: таблицы.
  'a:tbl',
  'a:tr',
  'a:tc',
  'a:gridCol',
  // DrawingML: коннекторы/линии (точки).
  'a:gd',
  'a:pt',
  'a:cxn',
  'a:cxnLst',
  // DrawingML: пути в кастомных геометриях.
  'a:path',
  'a:lnTo',
  'a:moveTo',
  'a:cubicBezTo',
  'a:quadBezTo',
  'a:arcTo',
  'a:close',
  // Relationships.
  'Relationship',
  'Override',
  'Default',
  // Chart-XML (переиспользуем существующий парсер xlsxCharts.ts, но isArray
  // не повредит и тут):
  'c:ser',
  'c:dPt',
  'c:cat',
  'c:val',
  'c:numCache',
  'c:strCache',
  'c:pt',
  // Theme: ничего из clrScheme/srgbClr/schemeClr в массивы не превращаем —
  // они в норме одиночны (внутри `<a:dk1>` / `<a:solidFill>`). Если попадётся
  // colorMod (две `srgbClr` подряд) — добавим точечно.
]);

// Парсер с конфигурацией, общей для всех веток парсинга .pptx.
// removeNSPrefix=false НАМЕРЕННО — нам нужны префиксы (p:, a:, r:, c:)
// чтобы различать одноимённые элементы в разных пространствах имён.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false, // числа парсим вручную (EMU, sz/100, …) — иначе теряются ведущие нули
  parseTagValue: false,
  processEntities: true, // &amp; → & (важно для текста)
  // XXE-защита: внешние сущности не подгружаем (опция отсутствует у
  // fast-xml-parser, но он и так не делает HTTP-запросы).
  removeNSPrefix: false,
  trimValues: false, // пробелы внутри `<a:t> </a:t>` значимы
  isArray: (name) => ALWAYS_ARRAY.has(name),
});

// Парсит XML-строку в JS-объект. Бросает Error при невалидном XML.
export function parseXml(xml: string): Record<string, unknown> {
  return parser.parse(xml) as Record<string, unknown>;
}

// Хелпер: всегда возвращает массив, даже если значение undefined/null/один объект.
// Используется в местах, где isArray не сработал (например, динамические имена).
export function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}
