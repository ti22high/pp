// Каталог preset-фигур для Shape library (Phase 3.20). Каждая фигура — это
// замкнутый SVG-path в координатной коробке 0..100 (PathShapeView нормализует
// natural-bbox и тянет под размер вставленной фигуры). Вставляются как
// pathShape (см. factory.createPreset).
//
// SPEC §1 хочет полный набор ECMA-376 ST_ShapeType (~187 пресетов). Здесь —
// практичный расширяемый набор типовых фигур по категориям; полный список
// растёт инкрементально, плюс 3.32 даёт импорт собственных SVG. См.
// DECISIONS.md 2026-05-21.

export interface PresetShape {
  key: string;
  label: string;
  path: string;
  // Если задано — вставляем нативный примитив (rect/ellipse/line), а не
  // pathShape: сохраняем семантику типа (cornerRadius, экспорт prstGeom и т.п.).
  // path при этом используется только для превью в панели.
  native?: 'rect' | 'ellipse' | 'line' | 'arrowLine';
}

export interface PresetCategory {
  key: string;
  label: string;
  shapes: PresetShape[];
}

// Точка на окружности r вокруг центра коробки (50,50), угол в градусах.
const CX = 50;
const CY = 50;
const R = 50;
function pt(angleDeg: number, radius: number): string {
  const a = (angleDeg * Math.PI) / 180;
  return `${(CX + radius * Math.cos(a)).toFixed(2)},${(CY + radius * Math.sin(a)).toFixed(2)}`;
}
// Правильный многоугольник, вписанный в коробку (по умолчанию вершиной вверх).
function regularPolygon(sides: number, startDeg = -90): string {
  const step = 360 / sides;
  const pts = Array.from({ length: sides }, (_, i) => pt(startDeg + i * step, R));
  return `M${pts.join(' L')} Z`;
}
// Звезда: 2*points вершин, чередование внешнего R и внутреннего R*innerRatio.
function starPolygon(points: number, innerRatio: number, startDeg = -90): string {
  const step = 180 / points;
  const pts = Array.from({ length: points * 2 }, (_, i) =>
    pt(startDeg + i * step, i % 2 === 0 ? R : R * innerRatio),
  );
  return `M${pts.join(' L')} Z`;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    key: 'basic',
    label: 'Базовые',
    shapes: [
      { key: 'rect', label: 'Прямоугольник', path: 'M0,0 H100 V100 H0 Z', native: 'rect' },
      {
        key: 'roundRect',
        label: 'Скруглённый прямоугольник',
        path: 'M18,0 H82 Q100,0 100,18 V82 Q100,100 82,100 H18 Q0,100 0,82 V18 Q0,0 18,0 Z',
      },
      { key: 'ellipse', label: 'Эллипс', path: 'M0,50 A50,50 0 1 0 100,50 A50,50 0 1 0 0,50 Z', native: 'ellipse' },
      { key: 'triangle', label: 'Треугольник', path: 'M50,0 L100,100 L0,100 Z' },
      { key: 'rightTriangle', label: 'Прямоугольный треугольник', path: 'M0,0 L0,100 L100,100 Z' },
      { key: 'diamond', label: 'Ромб', path: 'M50,0 L100,50 L50,100 L0,50 Z' },
      { key: 'parallelogram', label: 'Параллелограмм', path: 'M25,0 H100 L75,100 H0 Z' },
      { key: 'trapezoid', label: 'Трапеция', path: 'M25,0 H75 L100,100 H0 Z' },
      { key: 'pentagon', label: 'Пятиугольник', path: regularPolygon(5) },
      { key: 'hexagon', label: 'Шестиугольник', path: regularPolygon(6, 0) },
      { key: 'heptagon', label: 'Семиугольник', path: regularPolygon(7) },
      { key: 'octagon', label: 'Восьмиугольник', path: 'M30,0 H70 L100,30 V70 L70,100 H30 L0,70 V30 Z' },
      { key: 'cross', label: 'Крест', path: 'M35,0 H65 V35 H100 V65 H65 V100 H35 V65 H0 V35 H35 Z' },
    ],
  },
  {
    key: 'lines',
    label: 'Линии',
    shapes: [
      { key: 'line', label: 'Линия', path: 'M6,50 H94', native: 'line' },
      { key: 'arrow', label: 'Стрелка', path: 'M6,50 H88 M80,42 L92,50 L80,58', native: 'arrowLine' },
    ],
  },
  {
    key: 'arrows',
    label: 'Стрелки',
    shapes: [
      { key: 'arrowRight', label: 'Стрелка вправо', path: 'M0,30 H60 V12 L100,50 L60,88 V70 H0 Z' },
      { key: 'arrowLeft', label: 'Стрелка влево', path: 'M100,30 H40 V12 L0,50 L40,88 V70 H100 Z' },
      { key: 'arrowUp', label: 'Стрелка вверх', path: 'M30,100 V40 H12 L50,0 L88,40 H70 V100 Z' },
      { key: 'arrowDown', label: 'Стрелка вниз', path: 'M30,0 V60 H12 L50,100 L88,60 H70 V0 Z' },
      { key: 'arrowLeftRight', label: 'Влево-вправо', path: 'M0,50 L30,18 V38 H70 V18 L100,50 L70,82 V62 H30 V82 Z' },
      { key: 'arrowUpDown', label: 'Вверх-вниз', path: 'M50,0 L82,30 H62 V70 H82 L50,100 L18,70 H38 V30 H18 Z' },
      { key: 'chevron', label: 'Шеврон', path: 'M0,0 H60 L100,50 L60,100 H0 L40,50 Z' },
      { key: 'pentagonArrow', label: 'Стрелка-указатель', path: 'M0,0 H65 L100,50 L65,100 H0 Z' },
    ],
  },
  {
    key: 'flowchart',
    label: 'Блок-схема',
    shapes: [
      { key: 'fcProcess', label: 'Процесс', path: 'M0,0 H100 V100 H0 Z' },
      { key: 'fcDecision', label: 'Решение', path: 'M50,0 L100,50 L50,100 L0,50 Z' },
      {
        key: 'fcTerminator',
        label: 'Начало/конец',
        path: 'M25,0 H75 Q100,0 100,50 Q100,100 75,100 H25 Q0,100 0,50 Q0,0 25,0 Z',
      },
      { key: 'fcData', label: 'Данные', path: 'M25,0 H100 L75,100 H0 Z' },
      { key: 'fcDocument', label: 'Документ', path: 'M0,0 H100 V78 Q75,100 50,82 Q25,64 0,82 Z' },
      { key: 'fcDatabase', label: 'База данных', path: 'M0,12 C0,4 100,4 100,12 V88 C100,96 0,96 0,88 Z' },
    ],
  },
  {
    key: 'stars',
    label: 'Звёзды и выноски',
    shapes: [
      { key: 'star4', label: 'Звезда 4', path: starPolygon(4, 0.38) },
      { key: 'star5', label: 'Звезда 5', path: starPolygon(5, 0.5) },
      { key: 'star6', label: 'Звезда 6', path: starPolygon(6, 0.5) },
      { key: 'star8', label: 'Звезда 8', path: starPolygon(8, 0.6) },
      { key: 'explosion', label: 'Взрыв', path: starPolygon(10, 0.45) },
      { key: 'heart', label: 'Сердце', path: 'M50,88 C18,60 0,40 0,22 C0,9 11,0 24,0 C36,0 45,8 50,18 C55,8 64,0 76,0 C89,0 100,9 100,22 C100,40 82,60 50,88 Z' },
      { key: 'lightning', label: 'Молния', path: 'M42,0 L18,52 H38 L28,100 L78,42 H56 L70,0 Z' },
      { key: 'moon', label: 'Месяц', path: 'M50,0 A50,50 0 1 0 50,100 A38,50 0 1 1 50,0 Z' },
      { key: 'calloutRect', label: 'Выноска', path: 'M0,0 H100 V65 H45 L25,92 L28,65 H0 Z' },
    ],
  },
];
