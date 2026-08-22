"use client";

import { CircleAlert, KeyRound, Save, ShieldCheck, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChangePassword } from "@/components/auth/ChangePassword";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { getFarmSettings, saveFarmSettings } from "@/lib/firebase/data";
import { settingsSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { FarmSettings } from "@/types";
import { BUSINESS } from "@/lib/constants";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<FarmSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getFarmSettings().then(setForm);
  }, []);

  const update = (key: keyof FarmSettings, value: string) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setError("");
    const parsed = settingsSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Review info");
      return;
    }
    setSaving(true);
    try {
      await saveFarmSettings({
        farmName: parsed.data.farmName,
        slogan: parsed.data.slogan || BUSINESS.slogan,
        location: parsed.data.location,
        fullLocation: BUSINESS.fullLocation,
        phone: parsed.data.phone || BUSINESS.phoneDisplay,
        whatsapp: parsed.data.whatsapp || BUSINESS.whatsappDisplay,
        email: parsed.data.email || BUSINESS.email,
        currency: parsed.data.currency,
        deliveryFee: parsed.data.deliveryFee,
        freeDeliveryThreshold: parsed.data.freeDeliveryThreshold,
        deliveryInfo: `${BUSINESS.deliveryFree} ${BUSINESS.deliveryOther}`,
        deliveryFree: BUSINESS.deliveryFree,
        deliveryOther: BUSINESS.deliveryOther,
        promoCode: parsed.data.promoCode,
        promoDiscountPercent: parsed.data.promoDiscountPercent,
        heroProductId: parsed.data.heroProductId,
        cloudinaryCloudName: "",
        cloudinaryUploadPreset: "",
        businessInfo: `${parsed.data.farmName} - ${parsed.data.slogan} - ${parsed.data.location}`,
      });
      showToast("Settings saved", "success");
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
            <p>Only useful business configuration: farm name, slogan, phone, WhatsApp, email, location, delivery information, currency, business information.</p>
          </div>
        </section>

        {!form ? <Loading label="Loading settings…" /> : (
          <form onSubmit={submit} className="settings-form">
            <section className="dashboard-panel">
              <div className="settings-section-head">
                <span><Store size={19} /></span>
                <div><h3>{BUSINESS.name} — {BUSINESS.slogan}</h3><p>Business information</p></div>
              </div>
              <div className="form-grid">
                <label className="field"><span>Farm name *</span><input value={form.farmName} onChange={(e) => update("farmName", e.target.value)} required /></label>
                <label className="field"><span>Slogan *</span><input value={form.slogan} onChange={(e) => update("slogan", e.target.value)} placeholder="Nayi Plug" /></label>
                <label className="field field-full"><span>Location *</span><input value={form.location} onChange={(e) => update("location", e.target.value)} required placeholder="Mahlabane, Eswatini" /></label>
                <label className="field"><span>Phone *</span><input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder={BUSINESS.phoneDisplay} /></label>
                <label className="field"><span>WhatsApp *</span><input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder={BUSINESS.whatsappDisplay} /></label>
                <label className="field"><span>Email</span><input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder={BUSINESS.email} /></label>
                <label className="field"><span>Currency *</span><input value={form.currency} onChange={(e) => update("currency", e.target.value)} required placeholder="E" /></label>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="settings-section-head">
                <span><Store size={19} /></span>
                <div><h3>Delivery information</h3><p>Clearly displayed to customers</p></div>
              </div>
              <div className="form-grid">
                <label className="field"><span>Delivery Fee (E)</span><input type="number" min={0} value={form.deliveryFee} onChange={(e) => update("deliveryFee", e.target.value)} /></label>
                <label className="field"><span>Free delivery above (E)</span><input type="number" min={0} value={form.freeDeliveryThreshold} onChange={(e) => update("freeDeliveryThreshold", e.target.value)} /></label>
                <div className="field field-full" style={{ padding: 12, background: "var(--green-50)", borderRadius: 8, fontSize: ".8rem" }}>
                  <strong>{BUSINESS.deliveryFree}</strong><br />{BUSINESS.deliveryOther}<br />Media uploads: signed server-side, no folders — nothing storage-related is exposed to the browser.
                </div>
              </div>
            </section>

            {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}

            <section className="dashboard-panel">
              <div className="settings-section-head">
                <span><ShieldCheck size={19} /></span>
                <div><h3>Change password</h3><p>Update your own administrator sign-in password</p></div>
              </div>
              <ChangePassword />
              <p style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14, color: "var(--muted)", fontSize: ".65rem" }}>
                <KeyRound size={14} /> Only you can change your password — the new one works immediately on the next sign-in.
              </p>
            </section>

            <div className="settings-save-bar">
              <p>Changes apply immediately to shop, header, footer, receipts, invoices.</p>
              <button className="button button-primary" disabled={saving}>{saving ? <><i className="button-spinner" /> Saving…</> : <><Save size={17} /> Save settings</>}</button>
            </div>
          </form>
        )}
      </div>
    </ProtectedRoute>
  );
}
