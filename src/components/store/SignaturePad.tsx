"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eraser, PenLine, Undo2 } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  /** Label shown above the pad, e.g. "Customer signature". */
  label?: string;
  hint?: string;
  /** Data URL of a previously saved signature — drawn on open so it can be re-inked or cleared. */
  initialValue?: string;
}

const INK = "#173f2e";
const MAX_UNDO = 25;

/**
 * Touch-first signature capture: sign with a finger, mouse or stylus, then
 * Clear / Undo / Save Signature. The saved value is a PNG data-URL cropped to
 * the ink, so it looks clean on the printed and downloaded document.
 */
export function SignaturePad({
  onSave,
  label = "Customer signature",
  hint,
  initialValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<string[]>([]);
  const drawing = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [hasInk, setHasInk] = useState(Boolean(initialValue));
  const [undoCount, setUndoCount] = useState(0);

  const ctxOf = () => canvasRef.current?.getContext("2d") || null;

  const prepare = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
  }, []);

  const restoreSnapshot = useCallback((data: string) => {
    const canvas = canvasRef.current;
    const ctx = ctxOf();
    if (!canvas || !ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    if (!data) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, w, h);
    img.src = data;
  }, []);

  useEffect(() => {
    prepare();
    undoStack.current = [];
    if (!initialValue) {
      const ctx = ctxOf();
      const { w, h } = sizeRef.current;
      if (ctx) ctx.clearRect(0, 0, w, h);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const ctx = ctxOf();
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      const maxW = w * 0.78;
      const maxH = h * 0.68;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1.5);
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      undoStack.current = [""];
      setUndoCount(1);
      setHasInk(true);
    };
    img.src = initialValue;
  }, [initialValue, prepare]);

  const point = (event: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = ctxOf();
    const p = point(event);
    if (!canvas || !ctx || !p) return;
    event.preventDefault();
    if (undoStack.current.length < MAX_UNDO) undoStack.current.push(canvas.toDataURL());
    setUndoCount(undoStack.current.length);
    drawing.current = true;
    setHasInk(true);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.2, p.y + 0.2);
    ctx.stroke();
    canvas.setPointerCapture(event.pointerId);
  };

  const move = (event: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ctxOf();
    const p = point(event);
    if (!ctx || !p) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const ctx = ctxOf();
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    undoStack.current = [];
    setUndoCount(0);
    setHasInk(false);
  };

  const undo = () => {
    const snapshot = undoStack.current.pop();
    if (snapshot == null) return;
    restoreSnapshot(snapshot);
    setUndoCount(undoStack.current.length);
    setHasInk(undoStack.current.length > 0);
  };

  /** Export the signature cropped to the ink bounding box. */
  const save = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      onSave(canvas.toDataURL("image/png"));
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const pad = 10 * dpr;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(w - sx, maxX - minX + pad * 2);
    const sh = Math.min(h - sy, maxY - minY + pad * 2);
    const scale = Math.min(1, 640 / sw);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(sw * scale));
    out.height = Math.max(1, Math.round(sh * scale));
    const outCtx = out.getContext("2d");
    if (!outCtx) {
      onSave(canvas.toDataURL("image/png"));
      return;
    }
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
    onSave(out.toDataURL("image/png"));
  };

  return (
    <div className="signature-field">
      <div className="signature-label-row">
        <label>
          <PenLine size={16} /> {label}
        </label>
        <div style={{ display: "flex", gap: 14 }}>
          <button type="button" className="text-button" onClick={undo} disabled={!undoCount}>
            <Undo2 size={14} /> Undo
          </button>
          <button type="button" className="text-button" onClick={clear} disabled={!hasInk}>
            <Eraser size={14} /> Clear
          </button>
        </div>
      </div>
      <div className="signature-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {!hasInk && <span className="signature-placeholder">Sign here with your finger</span>}
        <i className="signature-line" />
      </div>
      <small>{hint || "Capture a signature as proof of delivery or collection."}</small>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          type="button"
          className="button button-primary button-small"
          onClick={save}
          disabled={!hasInk}
        >
          <Check size={15} /> Save signature
        </button>
      </div>
    </div>
  );
}
