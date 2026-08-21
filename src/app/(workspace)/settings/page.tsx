"use client";

import { CircleAlert, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { getFarmSettings, saveFarmSettings } from "@/lib/firebase/data";
import { settingsSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type { FarmSettings } from "@/types";

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
    const parsed = settingsSchema.safeParse({
      farmName: form.farmName,
      slogan: form.slogan,
      location: form.location,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      currency: form.currency,
    });
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
            <p>Farm details shown across the workspace.</p>
          </div>
        </section>

        {!form ? (
          <Loading label="Loading settings…" />
        ) : (
          <section className="dashboard-panel">
            <form onSubmit={submit} className="settings-form">
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
              {error && (
                <div className="form-alert error">
                  <CircleAlert size={17} /> {error}
                </div>
              )}
              <div className="settings-save-bar">
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
          </section>
        )}
      </div>
    </ProtectedRoute>
  );
}
