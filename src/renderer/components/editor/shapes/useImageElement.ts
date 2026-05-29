import { useEffect, useState } from 'react';

// Загружает HTMLImageElement из src (data URL или app://media/...).
// Возвращает null, пока картинка не готова, — Konva.Image не должен получить
// undefined. Общий хук для ImageShapeView и фона слайда.
export function useImageElement(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const next = new window.Image();
    let cancelled = false;
    next.onload = () => {
      if (!cancelled) setImg(next);
    };
    next.onerror = () => {
      if (!cancelled) setImg(null);
    };
    next.src = src;
    return () => {
      cancelled = true;
      // Обрываем загрузку и обнуляем src, чтобы браузер мог освободить bitmap
      // (Спринт A.9): без этого на смене слайдов в 300-слайдовом деке
      // HTMLImageElement-ы копятся в памяти даже после размонтажа Konva-ноды.
      next.onload = null;
      next.onerror = null;
      next.src = '';
      setImg(null);
    };
  }, [src]);
  return img;
}
