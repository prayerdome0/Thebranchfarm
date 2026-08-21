"use client";

import { useState } from "react";
import { CircleAlert, CloudUpload, Trash2 } from "lucide-react";
import { PhotoField } from "@/components/farm/PhotoField";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { PRODUCT_CATEGORIES, PRODUCT_KIND_LABELS } from "@/lib/constants";
import {
  cloudinaryEnabled,
  resolveCloudinaryConfig,
  uploadProductImageToCloudinary,
} from "@/lib/cloudinary";
import { uploadProductImage } from "@/lib/firebase/storage";
import { productSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { Product, ProductKind } from "@/types";

export type ProductFormValues = Omit<Product, "id">;

export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Product | null;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ProductFormValues>(() => ({
    name: initial?.name || "",
    kind: initial?.kind || "produce",
    category: initial?.category || PRODUCT_CATEGORIES[0].value,
    description: initial?.description || "",
    price: initial?.price ?? 0,
    salePrice: initial?.salePrice ?? undefined,
    unit: initial?.unit || "",
    stock: initial?.stock ?? 0,
    trackInventory: initial?.trackInventory ?? true,
    allowBackorder: initial?.allowBackorder ?? false,
    comingSoon: initial?.comingSoon ?? false,
    active: initial?.active ?? true,
    featured: initial?.featured ?? false,
    image: initial?.image,
    imagePath: initial?.imagePath,
    images: initial?.images || [],
    imagePaths: initial?.imagePaths || [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const { settings } = useStoreConfig();

  /**
   * Product photos upload straight to Cloudinary with the unsigned
   * `branch_farm` preset (Settings → Media uploads). If Cloudinary is not
   * configured yet we fall back to Firebase Storage so uploads keep working.
   */
  const uploadImage = async (file: File, onProgress?: (percent: number) => void) => {
    const config = resolveCloudinaryConfig(settings);
    if (cloudinaryEnabled(config)) {
      const result = await uploadProductImageToCloudinary(file, config, onProgress);
      return { url: result.url, path: `cloudinary:${result.publicId}` };
    }
    const result = await uploadProductImage(file, onProgress);
    return { url: result.downloadUrl, path: result.storagePath };
  };

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    setServerError("");
    setSaving(true);
    try {
      const salePrice = parsed.data.salePrice != null && parsed.data.salePrice > 0 ? parsed.data.salePrice : null;
      await onSubmit({
        ...parsed.data,
        salePrice,
        price: Number(parsed.data.price),
        stock: Number(parsed.data.stock),
        image: form.image,
        imagePath: form.imagePath,
        images: form.images,
        imagePaths: form.imagePaths,
      });
    } catch (cause) {
      setServerError(friendlyError(cause));
      setSaving(false);
    }
  };

  const addImage = async (file?: File) => {
    if (!file) return;
    try {
      const result = await uploadImage(file);
      update("images", [...(form.images || []), result.url]);
      update("imagePaths", [...(form.imagePaths || []), result.path]);
    } catch (cause) {
      setServerError(friendlyError(cause));
    }
  };

  const removeImage = (index: number) => {
    update("images", (form.images || []).filter((_, i) => i !== index));
    update("imagePaths", (form.imagePaths || []).filter((_, i) => i !== index));
  };

  const categories = PRODUCT_CATEGORIES.filter((item) => item.kind === form.kind);

  return (
    <form className="dashboard-stack" onSubmit={submit} noValidate>
      {serverError && (
        <div className="form-alert error">
          <CircleAlert size={18} /> {serverError}
        </div>
      )}

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Product details</h2>

        <div className="auth-field-grid">
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus />
            {errors.name && <small className="field-error">{errors.name}</small>}
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as ProductKind;
                update("kind", kind);
                const firstCategory = PRODUCT_CATEGORIES.find((item) => item.kind === kind);
                if (firstCategory) update("category", firstCategory.value);
              }}
            >
              <option value="produce">{PRODUCT_KIND_LABELS.produce}</option>
              <option value="livestock">{PRODUCT_KIND_LABELS.livestock}</option>
            </select>
          </label>
        </div>

        <div className="auth-field-grid">
          <label className="field">
            <span>Category</span>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.category && <small className="field-error">{errors.category}</small>}
          </label>
          <label className="field">
            <span>Unit</span>
            <input
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
              placeholder="dozen, kg, litre, each…"
            />
            {errors.unit && <small className="field-error">{errors.unit}</small>}
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
          {errors.description && <small className="field-error">{errors.description}</small>}
        </label>
      </section>

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Pricing &amp; stock</h2>
        <div className="auth-field-grid">
          <label className="field">
            <span>Price (E)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price || ""}
              onChange={(e) => update("price", Number(e.target.value))}
            />
            {errors.price && <small className="field-error">{errors.price}</small>}
          </label>
          <label className="field">
            <span>
              Sale price (E) <em>optional</em>
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.salePrice || ""}
              onChange={(e) => update("salePrice", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </label>
        </div>

        <div className="auth-field-grid">
          <label className="field">
            <span>Stock on hand</span>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => update("stock", Number(e.target.value))}
            />
            {errors.stock && <small className="field-error">{errors.stock}</small>}
          </label>
        </div>

        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <label className="check-field" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={form.trackInventory}
              onChange={(e) => update("trackInventory", e.target.checked)}
            />
            <span>
              <i>✓</i> Track inventory (decrement on orders)
            </span>
          </label>
          <label className="check-field" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={form.allowBackorder}
              onChange={(e) => update("allowBackorder", e.target.checked)}
            />
            <span>
              <i>✓</i> Allow pre-order when out of stock
            </span>
          </label>
          <label className="check-field" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={form.comingSoon || false}
              onChange={(e) => update("comingSoon", e.target.checked)}
            />
            <span>
              <i>✓</i> Coming soon (listed, not buyable yet)
            </span>
          </label>
          <label className="check-field" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update("active", e.target.checked)}
            />
            <span>
              <i>✓</i> Visible in the shop
            </span>
          </label>
          <label className="check-field" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
            />
            <span>
              <i>✓</i> Featured on the homepage
            </span>
          </label>
        </div>
      </section>

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Images</h2>
        <PhotoField
          value={form.image}
          path={form.imagePath}
          upload={uploadImage}
          onChange={(result) => {
            update("image", result.url);
            update("imagePath", result.path);
          }}
          hint="Main image shown in listings. Uploaded to Cloudinary (unsigned branch_farm preset) — or Firebase Storage when Cloudinary is not configured. JPG, PNG or WebP up to 8 MB."
        />

        <div>
          <span style={{ fontSize: ".76rem", fontWeight: 750 }}>Additional gallery images</span>
          <div className="product-gallery-editor">
            {(form.images || []).map((url, index) => (
              <span className="gallery-editor-thumb" key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button type="button" onClick={() => removeImage(index)} aria-label="Remove image">
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
            <label className="gallery-editor-add">
              <CloudUpload size={18} />
              <span>Add</span>
              <input type="file" accept="image/*" onChange={(e) => addImage(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {onCancel && (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="button button-primary" disabled={saving}>
          {saving ? (
            <>
              <i className="button-spinner" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
