// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Электрон в тестах недоступен — подменяем app.getPath на временную папку.
let tempDir: string;
vi.mock('electron', () => ({
  app: {
    getPath: (key: string) => {
      if (key === 'userData') return tempDir;
      throw new Error(`unexpected getPath(${key})`);
    },
  },
}));

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'media-test-'));
});
afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// Импорт ПОСЛЕ vi.mock — иначе модуль свяжется с настоящим electron.
const { saveMedia, getMediaFilePath, mediaExists, isSafeMediaName } = await import(
  '../../../src/main/media'
);

const u8 = (s: string) => new TextEncoder().encode(s);

describe('MediaManager.saveMedia', () => {
  it('идемпотентность: одинаковые байты → одно имя файла', async () => {
    const a = await saveMedia(u8('hello'), 'png');
    const b = await saveMedia(u8('hello'), 'png');
    expect(a).toBe(b);
  });

  it('разные байты → разные имена', async () => {
    const a = await saveMedia(u8('foo'), 'png');
    const b = await saveMedia(u8('bar'), 'png');
    expect(a).not.toBe(b);
  });

  it('имя — это <sha256>.<ext>', async () => {
    const name = await saveMedia(u8('x'), 'jpg');
    expect(name).toMatch(/^[a-f0-9]{64}\.jpg$/);
  });

  it('нормализация расширения: точка/мусор → bin или чистое', async () => {
    const a = await saveMedia(u8('aa'), '.PNG');
    expect(a.endsWith('.png')).toBe(true);
    const b = await saveMedia(u8('bb'), '');
    expect(b.endsWith('.bin')).toBe(true);
    const c = await saveMedia(u8('cc'), 'much-too-long-extension');
    expect(c.endsWith('.bin')).toBe(true);
  });

  it('содержимое файла совпадает с записанным', async () => {
    const bytes = u8('payload-12345');
    const name = await saveMedia(bytes, 'bin');
    const filePath = await getMediaFilePath(name);
    expect(filePath).not.toBeNull();
    const read = readFileSync(filePath!);
    expect(new Uint8Array(read)).toEqual(bytes);
  });
});

describe('MediaManager.getMediaFilePath / mediaExists', () => {
  it('существующий файл → путь, несуществующий → null', async () => {
    const name = await saveMedia(u8('present'), 'png');
    expect(await getMediaFilePath(name)).toBeTruthy();
    expect(await mediaExists(name)).toBe(true);

    const fake = 'a'.repeat(64) + '.png';
    expect(await getMediaFilePath(fake)).toBeNull();
    expect(await mediaExists(fake)).toBe(false);
  });

  it('блокирует имена с path traversal и спецсимволами', async () => {
    expect(await getMediaFilePath('../etc/passwd')).toBeNull();
    expect(await getMediaFilePath('abc/def.png')).toBeNull();
    expect(await getMediaFilePath('not-a-hash.png')).toBeNull();
  });
});

describe('isSafeMediaName', () => {
  it('принимает только sha256+ext', () => {
    expect(isSafeMediaName('a'.repeat(64) + '.png')).toBe(true);
    expect(isSafeMediaName('a'.repeat(64) + '.JPG')).toBe(true);
    expect(isSafeMediaName('a'.repeat(63) + '.png')).toBe(false);
    expect(isSafeMediaName('a'.repeat(64))).toBe(false);
    expect(isSafeMediaName('../etc')).toBe(false);
    expect(isSafeMediaName('a'.repeat(64) + '.toolongextension')).toBe(false);
  });
});
