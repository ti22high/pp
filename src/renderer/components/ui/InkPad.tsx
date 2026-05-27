import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { recognize, type InkStroke, type InkMatch } from '@renderer/lib/inkRecognizer';
import { INK_TEMPLATES } from '@renderer/lib/inkTemplates';

interface InkPadProps {
  // Вызывается с LaTeX выбранного варианта (вставить в формулу).
  onPick: (latex: string) => void;
}

// Холст рукописного ввода (Phase 3.24b): рисуешь символ мышью/стилусом, на
// отпускании пера распознаётся ($P) и показываются варианты LaTeX. Многоштриховые
// символы (=, +, …) накапливаются, пока не нажмёшь «Очистить» или вариант.
export function InkPad({ onPick }: InkPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const drawingRef = useRef(false);
  const [matches, setMatches] = useState<InkMatch[]>([]);

  useEffect(() => {
    const c = canvasRef.current?.getContext('2d');
    if (!c) return;
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#1a73e8';
  }, []);

  const posOf = (e: ReactPointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: ReactPointerEvent) => {
    drawingRef.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    strokesRef.current.push([posOf(e)]);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!drawingRef.current) return;
    const p = posOf(e);
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    const prev = stroke[stroke.length - 1];
    stroke.push(p);
    const c = canvasRef.current?.getContext('2d');
    if (c && prev) {
      c.beginPath();
      c.moveTo(prev.x, prev.y);
      c.lineTo(p.x, p.y);
      c.stroke();
    }
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setMatches(recognize(strokesRef.current, INK_TEMPLATES, 4));
  };

  const clear = () => {
    strokesRef.current = [];
    setMatches([]);
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const pick = (latex: string) => {
    onPick(latex);
    clear();
  };

  return (
    <div className="inkpad">
      <canvas
        ref={canvasRef}
        width={240}
        height={160}
        className="inkpad__canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <div className="inkpad__bar">
        {matches.length === 0 ? (
          <span className="inkpad__hint">Нарисуй символ — покажу варианты</span>
        ) : (
          matches.map((m) => (
            <button
              key={m.latex + m.label}
              type="button"
              className="equation-palette__btn"
              title={m.latex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m.latex)}
            >
              {m.label}
            </button>
          ))
        )}
        <button type="button" className="inkpad__clear" onClick={clear}>
          Очистить
        </button>
      </div>
    </div>
  );
}
