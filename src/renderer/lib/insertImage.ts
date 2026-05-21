// Вставка изображений (Phase 3.1): из File-диалога, drag-n-drop и буфера.
// Картинка кодируется в data URL и кладётся в imageShape.src. MediaManager
// (хранение в userData/media + app://) заменит data URL позднее — схема не
// меняется (src остаётся string).

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createImage } from '@renderer/lib/model/factory';

// Максимальная доля площади слайда, которую занимает вставляемая картинка
// (вписываем по большей стороне с сохранением пропорций).
const MAX_FRACTION = 0.6;

// Читает File в data URL.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Узнаёт натуральные размеры картинки по data URL.
function probeSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = dataUrl;
  });
}

// Создаёт imageShape из data URL и добавляет на активный слайд по центру,
// вписывая в MAX_FRACTION площади слайда. Выделяет вставленную фигуру.
export async function insertImageFromDataUrl(dataUrl: string): Promise<void> {
  const deck = useDeckStore.getState().deck;
  const slideId = useUiStore.getState().activeSlideId;
  if (!deck || !slideId) return;

  let nat: { w: number; h: number };
  try {
    nat = await probeSize(dataUrl);
  } catch {
    return;
  }
  if (nat.w <= 0 || nat.h <= 0) return;

  const slideW = deck.size.w;
  const slideH = deck.size.h;
  const maxW = slideW * MAX_FRACTION;
  const maxH = slideH * MAX_FRACTION;
  // Вписываем с сохранением пропорций, но не увеличиваем мелкие картинки.
  const scale = Math.min(maxW / nat.w, maxH / nat.h, 1);
  const w = Math.round(nat.w * scale);
  const h = Math.round(nat.h * scale);
  const x = Math.round((slideW - w) / 2);
  const y = Math.round((slideH - h) / 2);

  const shape = createImage(x, y, w, h, dataUrl, nat.w, nat.h);
  useDeckStore.getState().setDeck(appendShape(deck, slideId, shape));
  useSelectionStore.getState().select([shape.id]);
}

// Вставка из File (диалог или drag-n-drop). Игнорирует не-изображения.
export async function insertImageFromFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) return;
  const dataUrl = await fileToDataUrl(file);
  await insertImageFromDataUrl(dataUrl);
}

// Открывает системный файловый диалог (через скрытый input) и вставляет выбор.
export function openImageFileDialog(): void {
  pickImageFile((file) => void insertImageFromFile(file));
}

// Заменяет источник существующей картинки (Phase 3.6). Сохраняет позицию
// (левый-верхний угол) и ширину, высоту пересчитывает по новым пропорциям —
// чтобы не было искажений. Сбрасывает crop/maskShape (они относились к старым
// пикселям). Перекраску/яркость/контраст оставляем как настройки кадра.
export async function replaceImageFromFile(
  slideId: string,
  shapeId: string,
  file: File,
): Promise<void> {
  if (!file.type.startsWith('image/')) return;
  const dataUrl = await fileToDataUrl(file);
  let nat: { w: number; h: number };
  try {
    nat = await probeSize(dataUrl);
  } catch {
    return;
  }
  if (nat.w <= 0 || nat.h <= 0) return;

  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh || sh.type !== 'image') return;
    sh.src = dataUrl;
    sh.naturalW = nat.w;
    sh.naturalH = nat.h;
    sh.h = Math.round(sh.w * (nat.h / nat.w));
    sh.crop = undefined;
    sh.maskShape = undefined;
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Открывает файловый диалог для замены источника указанной картинки.
export function openReplaceImageDialog(slideId: string, shapeId: string): void {
  pickImageFile((file) => void replaceImageFromFile(slideId, shapeId, file));
}

// Image-fill (Phase 3.19): записывает картинку как заливку фигуры
// (rect/ellipse/path). Картинка кодируется в data URL и кладётся в
// fill={kind:'image',src}. Геометрия фигуры не меняется — картинка тянется
// под bbox при рендере (см. paint.ts/resolveFill).
async function setShapeFillFromFile(
  slideId: string,
  shapeId: string,
  file: File,
): Promise<void> {
  if (!file.type.startsWith('image/')) return;
  const dataUrl = await fileToDataUrl(file);
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh) return;
    sh.fill = { kind: 'image', src: dataUrl };
    state.deck.modifiedAt = new Date().toISOString();
  });
}

// Открывает файловый диалог и ставит выбранную картинку как заливку фигуры.
export function openFillImageDialog(slideId: string, shapeId: string): void {
  pickImageFile((file) => void setShapeFillFromFile(slideId, shapeId, file));
}

// Общий помощник: скрытый <input type=file> с фильтром на изображения.
function pickImageFile(onPick: (file: File) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onPick(file);
    input.remove();
  });
  document.body.appendChild(input);
  input.click();
}
