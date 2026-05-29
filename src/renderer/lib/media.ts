// Renderer-обёртка над MediaManager (Спринт A.4). Заменяет хранение картинок в
// виде base64 data URL на ссылки 'app://media/<sha256>.<ext>', чтобы стейт и
// undo-стек не раздувались мегабайтами base64.
//
// Используется в:
//   - insertImage.ts (вставка из диалога/drag-n-drop/clipboard)
//   - BackgroundEditor.tsx (фон слайда)
//   - lib/pptx/parser/pic.ts (импорт картинок из .pptx, Спринт B)
//   - миграция старых деков (data: → app://media/) при setDeck.

// data:<mime>[;...],<payload>
const DATA_URL_RE = /^data:([^;,]+)(?:;[^,]*)*,/i;

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
};

export function mimeToExt(mime: string): string {
  return MIME_TO_EXT[mime.toLowerCase()] ?? 'bin';
}

// Сохраняет байты через MediaManager (IPC) и возвращает 'app://media/<name>'.
export async function saveBytes(bytes: ArrayBuffer, ext: string): Promise<string> {
  const name = await window.api.media.save(bytes, ext);
  return `app://media/${name}`;
}

// Конвертирует data:-URL в 'app://media/...'. fetch умеет data:-URL нативно.
export async function dataUrlToMediaSrc(dataUrl: string): Promise<string> {
  const m = DATA_URL_RE.exec(dataUrl);
  const mime = m?.[1] ?? 'application/octet-stream';
  const buf = await (await fetch(dataUrl)).arrayBuffer();
  return await saveBytes(buf, mimeToExt(mime));
}

// File (из <input type=file>, drag-n-drop, clipboard) → 'app://media/...'.
// Расширение: сначала по MIME, иначе — по расширению имени файла.
export async function fileToMediaSrc(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const mimeExt = mimeToExt(file.type);
  const ext = mimeExt !== 'bin' ? mimeExt : (file.name.split('.').pop()?.toLowerCase() ?? 'bin');
  return await saveBytes(buf, ext);
}

export function isAppMediaUrl(s: string): boolean {
  return /^app:\/\/media\//.test(s);
}

export function isDataUrl(s: string): boolean {
  return /^data:/i.test(s);
}
