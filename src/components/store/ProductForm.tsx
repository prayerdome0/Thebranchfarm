"use client";

import { useState } from "react";
import { CircleAlert, CloudUpload, Trash2 } from "lucide-react";
import { PhotoField } from "@/components/farm/PhotoField";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { PRODUCT_CATEGORIES, PRODUCT_KIND_LABELS, CLOUDINARY } from "@/lib/constants";
import { asStoredCloudinaryAsset, resolveCloudinaryConfig, uploadProductImageToCloudinary } from "@/lib/cloudinary";
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
    shortDescription: initial?.shortDescription || initial?.description?.slice(0, 120) || "",
    price: initial?.price ?? 0,
    salePrice: initial?.salePrice ?? undefined,
    unit: initial?.unit || "Tray",
    stock: initial?.stock ?? 0,
    trackInventory: initial?.trackInventory ?? true,
    allowBackorder: initial?.allowBackorder ?? false,
    comingSoon: initial?.comingSoon ?? false,
    active: initial?.active ?? true,
    published: initial?.published ?? initial?.active ?? true,
    featured: initial?.featured ?? false,
    image: initial?.image,
    imagePath: initial?.imagePath,
    images: initial?.images || [],
    imagePaths: initial?.imagePaths || [],
    fileUrl: initial?.fileUrl,
    publicId: initial?.publicId,
  } as any));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const { settings } = useStoreConfig();

  const uploadImage = async (file: File, onProgress?: (percent: number) => void) =>
    asStoredCloudinaryAsset(await uploadProductImageToCloudinary(file, resolveCloudinaryConfig(settings), onProgress));

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = productSchema.safeParse({
      name: form.name,
      kind: form.kind,
      category: form.category,
      description: form.description,
      price: form.price,
      salePrice: form.salePrice,
      unit: form.unit,
      stock: form.stock,
      trackInventory: form.trackInventory,
      allowBackorder: form.allowBackorder,
      comingSoon: form.comingSoon,
      active: form.active,
      featured: form.featured,
    });
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
        ...form,
        ...parsed.data,
        salePrice,
        price: Number(parsed.data.price),
        stock: Number(parsed.data.stock),
        shortDescription: (form as any).shortDescription,
        published: form.active,
      } as any);
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
      {serverError && <div className="form-alert error"><CircleAlert size={18} /> {serverError}</div>}

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Product — image, name, price, unit, availability, description</h2>
        <div className="auth-field-grid">
          <label className="field"><span>Product name *</span><input value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus placeholder="Fresh Farm Eggs" />{errors.name && <small className="field-error">{errors.name}</small>}</label>
          <label className="field"><span>Type *</span>
            <select value={form.kind} onChange={(e) => {
              const kind = e.target.value as ProductKind;
              update("kind", kind);
              const first = PRODUCT_CATEGORIES.find((item) => item.kind === kind);
              if (first) update("category", first.value);
            }}>
              <option value="produce">{PRODUCT_KIND_LABELS.produce}</option>
              <option value="livestock">{PRODUCT_KIND_LABELS.livestock}</option>
            </select>
          </label>
        </div>
        <div className="auth-field-grid">
          <label className="field"><span>Category *</span>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}>
              {categories.map((item) => (<option key={item.value} value={item.value}>{item.label}</option>))}
            </select>
            {errors.category && <small className="field-error">{errors.category}</small>}
          </label>
          <label className="field"><span>Unit * (e.g. Tray, kg, litre, each)</span><input value={form.unit} onChange={(e) => update("unit", e.target.value)} placeholder="Tray" />{errors.unit && <small className="field-error">{errors.unit}</small>}</label>
        </div>
        <label className="field"><span>Short description</span><input value={(form as any).shortDescription} onChange={(e) => update("shortDescription" as any, e.target.value as any)} placeholder="Short description for cards" /></label>
        <label className="field"><span>Full description *</span><textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Full description for product page" />{errors.description && <small className="field-error">{errors.description}</small>}</label>
      </section>

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Price: E___, Unit: Tray, Availability: Available — plus stock, featured, publish</h2>
        <div className="auth-field-grid">
          <label className="field"><span>Price (E) *</span><input type="number" min={0} step="0.01" value={form.price || ""} onChange={(e) => update("price", Number(e.target.value))} placeholder="E___" />{errors.price && <small className="field-error">{errors.price}</small>}</label>
          <label className="field"><span>Sale price (E) optional</span><input type="number" min={0} step="0.01" value={form.salePrice || ""} onChange={(e) => update("salePrice", e.target.value === "" ? undefined : Number(e.target.value))} /></label>
        </div>
        <div className="auth-field-grid">
          <label className="field"><span>Stock / Availability</span><input type="number" min={0} value={form.stock} onChange={(e) => update("stock", Number(e.target.value))} placeholder="Available quantity" />{errors.stock && <small className="field-error">{errors.stock}</small>}</label>
          <label className="field"><span>Availability display</span><input value={form.trackInventory ? (form.stock > 0 ? "Available" : "Out of stock") : "Available"} readOnly /></label>
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <label className="check-field" style={{ marginTop: 0 }}><input type="checkbox" checked={form.trackInventory} onChange={(e) => update("trackInventory", e.target.checked)} /><span><i>✓</i> Track inventory</span></label>
          <label className="check-field" style={{ marginTop: 0 }}><input type="checkbox" checked={form.allowBackorder} onChange={(e) => update("allowBackorder", e.target.checked)} /><span><i>✓</i> Allow pre-order</span></label>
          <label className="check-field" style={{ marginTop: 0 }}><input type="checkbox" checked={form.comingSoon || false} onChange={(e) => update("comingSoon", e.target.checked)} /><span><i>✓</i> Coming soon</span></label>
          <label className="check-field" style={{ marginTop: 0 }}><input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} /><span><i>✓</i> Publish/unpublish (active)</span></label>
          <label className="check-field" style={{ marginTop: 0 }}><input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} /><span><i>✓</i> Set featured product</span></label>
        </div>
        <small>Admin can add, edit, delete, upload image, change price, change stock/availability, set featured, publish/unpublish, add description, set unit — no code editing. Stored Cloudinary {CLOUDINARY.cloudName} / {CLOUDINARY.uploadPreset}, no folders.</small>
      </section>

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Product images — Cloudinary, no folders</h2>
        <PhotoField
          value={form.image}
          path={form.imagePath}
          upload={uploadImage}
          onChange={(result) => { update("image", result.url); update("imagePath", result.path); (update as any)("fileUrl", result.url); (update as any)("publicId", (result.path || "").replace("cloudinary:", "")); }}
          hint={`Primary product image. Uploaded to Cloudinary ${CLOUDINARY.cloudName} with preset ${CLOUDINARY.uploadPreset}, no folders. fileUrl + publicId saved, recordType product.`}
        />
        <div>
          <span style={{ fontSize: ".76rem", fontWeight: 750 }}>Additional gallery images</span>
          <div className="product-gallery-editor">
            {(form.images || []).map((url, index) => (
              <span className="gallery-editor-thumb" key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button type="button" onClick={() => removeImage(index)} aria-label="Remove"><Trash2 size={13} /></button>
              </span>
            ))}
            <label className="gallery-editor-add"><CloudUpload size={18} /><span>Add</span><input type="file" accept="image/*" onChange={(e) => addImage(e.target.files?.[0])} /></label>
          </div>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {onCancel && <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>}
        <button className="button button-primary" disabled={saving}>{saving ? <><i className="button-spinner" /> Saving…</> : submitLabel}</button>
      </div>
    </form>
  );
}
