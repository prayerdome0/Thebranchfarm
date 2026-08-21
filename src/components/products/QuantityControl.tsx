"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityControl({ value, onChange, min = 1, max = 999, label = "Quantity" }: {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="quantity-wrap">
      <span className="sr-only">{label}</span>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity"><Minus size={16} /></button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value || String(min), 10);
          onChange(Math.max(min, Math.min(max, Number.isNaN(parsed) ? min : parsed)));
        }}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity"><Plus size={16} /></button>
    </div>
  );
}
