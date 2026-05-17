/// <reference types="vite/client" />

// Делает window.api типизированным в коде рендерера.
// Реальная реализация — в src/preload/index.ts (contextBridge).
import type { PreloadApi } from '../preload/types';

declare global {
  interface Window {
    api: PreloadApi;
  }
}

export {};
