"use client";

import { CircleAlert, Cloud, Save, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { getAllProducts, getFarmSettings, saveFarmSettings } from "@/lib/firebase/data";
import { settingsSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { FarmSettings, Product } from "@/types";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<FarmSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getFarmSettings().then(setForm);
    getAllProducts().then(setProducts);
  }, []);

  const update = (key: keyof FarmSettings, value: string) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setError("");
    const parsed = settingsSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information.");
      return;
    }
    setSaving(true);
    try {
      await saveFarmSettings({
        farmName: parsed.data.farmName,
        slogan: parsed.data.slogan || "",
        location: parsed.data.location,
        phone: parsed.data.phone || "",
        whatsapp: parsed.data.whatsapp || "",
        email: parsed.data.email || "",
        currency: parsed.data.currency,
        deliveryFee: parsed.data.deliveryFee,
        freeDeliveryThreshold: parsed.data.freeDeliveryThreshold,
        promoCode: parsed.data.promoCode,
        promoDiscountPercent: parsed.data.promoDiscountPercent,
        heroProductId: parsed.data.heroProductId,
        cloudinaryCloudName: parsed.data.cloudinaryCloudName || "",
        cloudinaryUploadPreset: parsed.data.cloudinaryUploadPreset || "branch_farm",
      });
      showToast("Settings saved.", "success");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="dashboard-stack">
        <section className="dashboard-section-title">
          <div>
            <h2>Settings</h2>
            <p>Farm details and store configuration.</p>
          </div>
        </section>

        {!form ? (
          <Loading label="Loading settings…" />
        ) : (
          <form onSubmit={submit} className="settings-form">
            <section className="dashboard-panel">
              <div className="settings-section-head">
                <span>
                  <Store size={19} />
                </span>
                <div>
                  <h3>Farm details</h3>
                  <p>Shown across the website and workspace.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Farm name *</span>
                  <input value={form.farmName} onChange={(e) => update("farmName", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Slogan</span>
                  <input value={form.slogan} onChange={(e) => update("slogan", e.target.value)} />
                </label>
                <label className="field field-full">
                  <span>Location *</span>
                  <input value={form.location} onChange={(e) => update("location", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </label>
                <label className="field">
                  <span>WhatsApp</span>
                  <input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input value={form.email} onChange={(e) => update("email", e.target.value)} />
                </label>
                <label className="field">
                  <span>Currency symbol *</span>
                  <input value={form.currency} onChange={(e) => update("currency", e.target.value)} required />
                </label>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="settings-section-head">
                <span>
                  <Store size={19} />
                </span>
                <div>
                  <h3>Online shop</h3>
                  <p>Delivery pricing, promotions and the homepage hero.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Delivery fee ({form.currency || "E"})</span>
                  <input
                    type="number"
                    min={0}
                    value={form.deliveryFee}
                    onChange={(e) => update("deliveryFee", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Free delivery above ({form.currency || "E"})</span>
                  <input
                    type="number"
                    min={0}
                    value={form.freeDeliveryThreshold}
                    onChange={(e) => update("freeDeliveryThreshold", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Promo code</span>
                  <input
                    value={form.promoCode || ""}
                    onChange={(e) => update("promoCode", e.target.value)}
                    placeholder="e.g. FARM5 (leave blank to disable)"
                  />
                </label>
                <label className="field">
                  <span>Promo discount (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.promoDiscountPercent ?? 0}
                    onChange={(e) => update("promoDiscountPercent", e.target.value)}
                  />
                </label>
                <label className="field field-full">
                  <span>Homepage hero product</span>
                  <select
                    value={form.heroProductId || ""}
                    onChange={(e) => update("heroProductId", e.target.value)}
                  >
                    <option value="">First featured product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="settings-section-head">
                <span>
                  <Cloud size={19} />
                </span>
                <div>
                  <h3>Media uploads — Cloudinary</h3>
                  <p>
                    Product photos and business paperwork (quotations, receipts, invoices) upload
                    straight to Cloudinary with an unsigned preset.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Cloudinary cloud name</span>
                  <input
                    value={form.cloudinaryCloudName || ""}
                    onChange={(e) => update("cloudinaryCloudName", e.target.value)}
                    placeholder="e.g. thebranchfarm (from your Cloudinary dashboard)"
                  />
                </label>
                <label className="field">
                  <span>Unsigned upload preset</span>
                  <input
                    value={form.cloudinaryUploadPreset || ""}
                    onChange={(e) => update("cloudinaryUploadPreset", e.target.value)}
                    placeholder="branch_farm"
                  />
                  <small>
                    The preset must be UNSIGNED in Cloudinary. Leave as branch_farm unless you
                    renamed it.
                  </small>
                </label>
              </div>
            </section>

            {error && (
              <div className="form-alert error">
                <CircleAlert size={17} /> {error}
              </div>
            )}
            <div className="settings-save-bar">
              <p>Changes apply to the public shop immediately.</p>
              <button className="button button-primary" disabled={saving}>
                {saving ? (
                  <>
                    <i className="button-spinner" /> Saving…
                  </>
                ) : (
                  <>
                    <Save size={17} /> Save settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
