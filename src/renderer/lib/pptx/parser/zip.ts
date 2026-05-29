// Обёртка JSZip для .pptx (Спринт B.1). Один экземпляр на импорт; ленивый
// доступ к файлам (расшифровка происходит только когда они реально нужны).
//
// JSZip.loadAsync парсит «directory» зипа (заголовки), но НЕ декомпрессирует
// содержимое. Содержимое разворачивается по запросу .async('string'|'uint8array').
// Это и есть наш стриминг для 200 МБ .pptx: парсер ходит по слайдам по
// одному, decompress per-entry, не держит весь распакованный архив в памяти.

import JSZip from 'jszip';

export interface PptxArchive {
  // true если в зипе есть файл с таким относительным именем (со слэшами).
  has(name: string): boolean;
  // Возвращает содержимое как UTF-8 строку (для XML). Если файла нет — null.
  getText(name: string): Promise<string | null>;
  // Возвращает байты файла (для картинок/видео). null если нет.
  getBytes(name: string): Promise<ArrayBuffer | null>;
  // Список всех файлов архива (для дебага и поиска по маске).
  fileNames(): string[];
}

// Загружает .pptx как ArrayBuffer и возвращает архив-доступ.
// throws при кривом zip (не .pptx, повреждён, шифрованный).
export async function openPptxArchive(bytes: ArrayBuffer): Promise<PptxArchive> {
  const zip = await JSZip.loadAsync(bytes);

  return {
    has: (name) => zip.files[name] !== undefined,

    getText: async (name) => {
      const f = zip.files[name];
      if (!f) return null;
      return await f.async('string');
    },

    getBytes: async (name) => {
      const f = zip.files[name];
      if (!f) return null;
      const u8 = await f.async('uint8array');
      // u8.buffer может содержать «лишние» байты (slice по offset/length).
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    },

    fileNames: () => Object.keys(zip.files),
  };
}
