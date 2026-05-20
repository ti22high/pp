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
    };
  }, [src]);
  return img;
}
