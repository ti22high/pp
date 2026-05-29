import { app } from 'electron';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

// MediaManager (Спринт A.1): хранение медиа на диске вместо data URL.
// Папка: <userData>/media/<sha256>.<ext>. Дедуп по sha256.
// Идея: renderer → IPC media:save → saveMedia → возвращает имя файла → renderer
// складывает в Shape.src = 'app://media/<name>'. Чтение — через app://-протокол
// (см. src/main/protocol.ts), который вызывает getMediaFilePath().

let mediaDirPromise: Promise<string> | null = null;

function getMediaDir(): Promise<string> {
  if (!mediaDirPromise) {
    mediaDirPromise = (async () => {
      const dir = join(app.getPath('userData'), 'media');
      await fs.mkdir(dir, { recursive: true });
      return dir;
    })();
  }
  return mediaDirPromise;
}

// Имя медиа-файла: 64 hex (sha256) + точка + расширение (1..8 буквенно-цифровых).
const SAFE_NAME_RE = /^[a-f0-9]{64}\.[a-z0-9]{1,8}$/i;

export function isSafeMediaName(name: string): boolean {
  return SAFE_NAME_RE.test(name);
}

function normalizeExt(ext: string): string {
  const e = (ext ?? '').toLowerCase().replace(/^\./, '').replace(/[^a-z0-9]/g, '');
  if (e.length === 0 || e.length > 8) return 'bin';
  return e;
}

// Сохраняет байты в medias-папку. Если файл с таким sha256 уже есть — возвращает
// существующее имя (idempotent, бесплатная дедупликация).
export async function saveMedia(bytes: Uint8Array, ext: string): Promise<string> {
  const dir = await getMediaDir();
  const sha = createHash('sha256').update(bytes).digest('hex');
  const name = `${sha}.${normalizeExt(ext)}`;
  const filePath = join(dir, name);
  try {
    await fs.access(filePath);
    return name;
  } catch {
    // Атомарная запись: пишем во временный файл, потом rename — не получим
    // битый файл, если процесс упадёт посреди записи.
    const tmp = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, bytes);
    await fs.rename(tmp, filePath);
    return name;
  }
}

// Возвращает абсолютный путь к файлу медиа, если он существует и имя безопасное.
export async function getMediaFilePath(name: string): Promise<string | null> {
  if (!isSafeMediaName(name)) return null;
  const dir = await getMediaDir();
  const filePath = join(dir, name);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

export async function mediaExists(name: string): Promise<boolean> {
  return (await getMediaFilePath(name)) !== null;
}
