"use client";

import { useState } from "react";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { productToLine } from "@/lib/documents";
import type { Product, QuotationLine } from "@/types";

interface ItemsEditorProps {
  items: QuotationLine[];
  onChange: (items: QuotationLine[]) => void;
  /** Farm / store catalogue the admin can pick products from. */
  products: Product[];
  formatMoney: (value: number) => string;
}

/**
 * Line-item editor shared by the quotation and receipt forms: pick products
 * from the farm catalogue (or add ad-hoc items), then adjust quantity, unit
 * and price. Line amounts and the subtotal recalculate live.
 */
export function ItemsEditor({ items, onChange, products, formatMoney }: ItemsEditorProps) {
  const activeProducts = products.filter((product) => product.active && !product.comingSoon);
  const [pendingProduct, setPendingProduct] = useState("");

  const addProduct = () => {
    const product = activeProducts.find((item) => item.id === pendingProduct);
    if (!product) return;
    const existing = items.find((line) => line.productId === product.id);
    if (existing) {
      onChange(
        items.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      );
    } else {
      onChange([...items, productToLine(product)]);
    }
    setPendingProduct("");
  };

  const update = (index: number, key: keyof QuotationLine, value: string | number) => {
    onChange(
      items.map((line, i) =>
        i === index
          ? { ...line, [key]: key === "quantity" || key === "price" ? Number(value) : value }
          : line,
      ),
    );
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="items-editor">
      {activeProducts.length > 0 && (
        <div className="items-picker">
          <select
            value={pendingProduct}
            onChange={(e) => setPendingProduct(e.target.value)}
            aria-label="Pick a product from the farm catalogue"
          >
            <option value="">Pick a product from the farm / store…</option>
            {activeProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {formatMoney(Number(product.salePrice || product.price))}/{product.unit || "each"}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={addProduct}
            disabled={!pendingProduct}
          >
            <PackagePlus size={15} /> Add product
          </button>
        </div>
      )}

      {items.length === 0 && (
        <p className="items-empty">No items yet — pick a product above or add a custom item.</p>
      )}

      {items.map((item, index) => {
        const amount = (Number(item.quantity) || 0) * (Number(item.price) || 0);
        return (
          <div className="item-row" key={`${item.productId || "custom"}-${index}`}>
            <div className="item-row-main">
              <input
                value={item.name}
                onChange={(e) => update(index, "name", e.target.value)}
                placeholder="Item / service"
                aria-label={`Item ${index + 1} name`}
              />
              <div className="item-row-numbers">
                <label>
                  <small>Qty</small>
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => update(index, "quantity", e.target.value)}
                  />
                </label>
                <label>
                  <small>Unit</small>
                  <input
                    value={item.unit || ""}
                    onChange={(e) => update(index, "unit", e.target.value)}
                    placeholder="each"
                  />
                </label>
                <label>
                  <small>Price</small>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price}
                    onChange={(e) => update(index, "price", e.target.value)}
                  />
                </label>
                <strong className="item-row-amount">{formatMoney(amount)}</strong>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => remove(index)}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="button button-ghost button-small"
        onClick={() => onChange([...items, { name: "", quantity: 1, price: 0, unit: "each" }])}
      >
        <Plus size={15} /> Add custom item
      </button>
    </div>
  );
}
