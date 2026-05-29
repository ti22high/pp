import { protocol, net } from 'electron';
import { app } from 'electron';
import { pathToFileURL } from 'node:url';
import { join, normalize, sep } from 'node:path';
import { getMediaFilePath } from './media.js';

// Кастомный протокол app:// — нужен по двум причинам (см. SPEC §14.6):
// 1) file:// блокирует FontFace и CORS для медиа в renderer;
// 2) даём приложению единый способ адресовать ресурсы (fonts, media, templates),
//    которые в production лежат в asarUnpack, а в dev — в ./resources рядом с кодом.
//
// URL-схема:
//   app://fonts/<имя_файла>         → resources/fonts/<имя_файла>
//   app://katex-fonts/<имя_файла>   → resources/katex-fonts/<имя_файла>
//   app://templates/<имя_файла>     → resources/templates/<имя_файла>
//   app://media/<sha256>.<ext>      → userData/media/<sha256>.<ext>
//                                     (см. src/main/media.ts MediaManager)

// Вызывать ДО app.whenReady() — privileged схемы должны быть зарегистрированы заранее.
export function registerAppProtocolSchema(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false,
      },
    },
  ]);
}

// Корень ресурсов в dev и в production отличается:
// - dev: <repo>/resources
// - prod: <resourcesPath>  (electron-builder кладёт asarUnpack сюда)
function resourcesRoot(): string {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return join(app.getAppPath(), 'resources');
}

// Безопасное склеивание пути: запрещаем выход за пределы baseDir
// (защита от app://fonts/../../../etc/passwd).
function resolveSafe(baseDir: string, relPath: string): string | null {
  const decoded = decodeURIComponent(relPath).replace(/^\/+/, '');
  const joined = normalize(join(baseDir, decoded));
  const baseNorm = normalize(baseDir + sep);
  if (!joined.startsWith(baseNorm) && joined !== normalize(baseDir)) {
    return null;
  }
  return joined;
}

// Регистрируется ВНУТРИ app.whenReady().
export function registerAppProtocolHandlers(): void {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    // host = первая часть пути (fonts | katex-fonts | templates | media)
    const host = url.hostname;
    const path = url.pathname;

    // app://media/<sha256>.<ext> → MediaManager (Спринт A.3).
    if (host === 'media') {
      const name = decodeURIComponent(path).replace(/^\/+/, '');
      const filePath = await getMediaFilePath(name);
      if (!filePath) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    }

    const fontsDirs: Record<string, string> = {
      fonts: join(resourcesRoot(), 'fonts'),
      'katex-fonts': join(resourcesRoot(), 'katex-fonts'),
      templates: join(resourcesRoot(), 'templates'),
    };

    const baseDir = fontsDirs[host];
    if (!baseDir) {
      return new Response('Not found', { status: 404 });
    }

    const filePath = resolveSafe(baseDir, path);
    if (!filePath) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}
