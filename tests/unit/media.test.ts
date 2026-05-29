import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mimeToExt,
  saveBytes,
  dataUrlToMediaSrc,
  fileToMediaSrc,
  isAppMediaUrl,
  isDataUrl,
} from '../../src/renderer/lib/media';

// Мок MediaManager-IPC: запоминаем переданные байты и возвращаем фейковое имя.
let lastSave: { bytes: ArrayBuffer; ext: string } | null = null;
beforeEach(() => {
  lastSave = null;
  (globalThis as unknown as { window: { api: unknown } }).window = {
    api: {
      media: {
        save: vi.fn(async (bytes: ArrayBuffer, ext: string) => {
          lastSave = { bytes, ext };
          return `${'a'.repeat(64)}.${ext}`;
        }),
        exists: vi.fn(async () => true),
      },
    },
  };
});

describe('mimeToExt', () => {
  it('основные image/video/audio MIME', () => {
    expect(mimeToExt('image/png')).toBe('png');
    expect(mimeToExt('image/JPEG')).toBe('jpg');
    expect(mimeToExt('image/svg+xml')).toBe('svg');
    expect(mimeToExt('video/mp4')).toBe('mp4');
    expect(mimeToExt('audio/mpeg')).toBe('mp3');
  });
  it('неизвестный → bin', () => {
    expect(mimeToExt('application/x-foo')).toBe('bin');
    expect(mimeToExt('')).toBe('bin');
  });
});

describe('saveBytes', () => {
  it('возвращает app://media/<name>', async () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    const url = await saveBytes(buf, 'png');
    expect(url.startsWith('app://media/')).toBe(true);
    expect(url.endsWith('.png')).toBe(true);
    expect(lastSave!.ext).toBe('png');
  });
});

describe('dataUrlToMediaSrc', () => {
  it('парсит mime и пересылает байты в MediaManager', async () => {
    // 1x1 PNG (минимальный валидный data URL).
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const url = await dataUrlToMediaSrc(dataUrl);
    expect(url.startsWith('app://media/')).toBe(true);
    expect(url.endsWith('.png')).toBe(true);
    expect(lastSave!.bytes.byteLength).toBeGreaterThan(0);
  });
});

describe('fileToMediaSrc', () => {
  it('берёт расширение из MIME', async () => {
    const file = new File([new Uint8Array([1, 2])], 'pic.weird', { type: 'image/png' });
    const url = await fileToMediaSrc(file);
    expect(url.endsWith('.png')).toBe(true);
  });
  it('падает на расширение имени, если MIME неизвестен', async () => {
    const file = new File([new Uint8Array([1, 2])], 'movie.WEBM', { type: '' });
    const url = await fileToMediaSrc(file);
    expect(url.endsWith('.webm')).toBe(true);
  });
});

describe('isAppMediaUrl / isDataUrl', () => {
  it('распознаёт типы строк', () => {
    expect(isAppMediaUrl('app://media/abc.png')).toBe(true);
    expect(isAppMediaUrl('data:image/png;base64,xx')).toBe(false);
    expect(isDataUrl('data:image/png;base64,xx')).toBe(true);
    expect(isDataUrl('app://media/abc.png')).toBe(false);
  });
});
