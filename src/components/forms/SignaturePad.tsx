"use client";

import { RotateCcw, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function SignaturePad({ value, onChange, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [hasInk, setHasInk] = useState(Boolean(value));

  const configureCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1, 2);
    const saved = value || (hasInk ? canvas.toDataURL("image/png") : "");
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#173b2b";
    if (saved) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = saved;
    }
  }, [value, hasInk]);

  useEffect(() => {
    configureCanvas();
    const listener = () => configureCanvas();
    try { window.addEventListener("resize", listener); } catch {}
    return () => { try { window.removeEventListener("resize", listener); } catch {} };
  }, [configureCanvas]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = point(event);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    event.preventDefault();
    const next = point(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(last.current.x, last.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    last.current = next;
    setHasInk(true);
  };

  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange("");
  };

  return (
    <div className="signature-field">
      <div className="signature-label-row">
        <label><PenLine size={17} /> Handwritten signature</label>
        <button type="button" className="text-button" onClick={clear} disabled={!hasInk || disabled}><RotateCcw size={15} /> Clear</button>
      </div>
      <div className="signature-canvas-wrap">
        {!hasInk && <span className="signature-placeholder">Sign here with your finger or pointer</span>}
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label="Signature drawing area"
        />
        <span className="signature-line" />
      </div>
      <small>Your signature is attached to the exact order version submitted.</small>
    </div>
  );
}
