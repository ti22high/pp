// Вставка изображений (Phase 3.1; миграция на MediaManager в Спринте A.5):
// картинки сохраняются на диск через MediaManager и попадают в Shape.src как
// 'app://media/<sha256>.<ext>'. Никаких base64-data-URL в стейте — недопустимо
// для больших файлов (200+ МБ) и для undo (snapshot-based, MAX=100).

import { useDeckStore } from '@renderer/stores/deck';
import { useUiStore } from '@renderer/stores/ui';
import { useSelectionStore } from '@renderer/stores/selection';
import { appendShape, createImage } from '@renderer/lib/model/factory';
import { fileToMediaSrc, dataUrlToMediaSrc, isDataUrl } from '@renderer/lib/media';

// Максимальная доля площади слайда, которую занимает вставляемая картинка
// (вписываем по большей стороне с сохранением пропорций).
const MAX_FRACTION = 0.6;

// Узнаёт натуральные размеры картинки по любому URL (data:, app://, blob:).
function probeSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

// Создаёт imageShape по src (ожидается 'app://media/...') и добавляет на активный
// слайд по центру, вписывая в MAX_FRACTION площади слайда. Выделяет вставленную.
async function insertImageFromSrc(src: string): Promise<void> {
  const deck = useDeckStore.getState().deck;
  const slideId = useUiStore.getState().activeSlideId;
  if (!deck || !slideId) return;

  let nat: { w: number; h: number };
  try {
    nat = await probeSize(src);
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

  const shape = createImage(x, y, w, h, src, nat.w, nat.h);
  useDeckStore.getState().setDeck(appendShape(deck, slideId, shape));
  useSelectionStore.getState().select([shape.id]);
}

// Вставка из data URL (clipboard, paste). data: конвертируется в MediaManager.
export async function insertImageFromDataUrl(dataUrl: string): Promise<void> {
  const src = isDataUrl(dataUrl) ? await dataUrlToMediaSrc(dataUrl) : dataUrl;
  await insertImageFromSrc(src);
}

// Вставка из File (диалог или drag-n-drop). Игнорирует не-изображения.
export async function insertImageFromFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) return;
  const src = await fileToMediaSrc(file);
  await insertImageFromSrc(src);
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
  const src = await fileToMediaSrc(file);
  let nat: { w: number; h: number };
  try {
    nat = await probeSize(src);
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
    sh.src = src;
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
// (rect/ellipse/path). fill={kind:'image', src='app://media/...'}.
async function setShapeFillFromFile(
  slideId: string,
  shapeId: string,
  file: File,
): Promise<void> {
  if (!file.type.startsWith('image/')) return;
  const src = await fileToMediaSrc(file);
  useDeckStore.setState((state) => {
    if (!state.deck) return;
    const slide = state.deck.slides[slideId];
    if (!slide) return;
    const sh = slide.shapes.find((x) => x.id === shapeId);
    if (!sh) return;
    sh.fill = { kind: 'image', src };
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
