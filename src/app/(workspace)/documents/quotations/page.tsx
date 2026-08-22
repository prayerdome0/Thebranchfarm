"use client";

import { useEffect, useState } from "react";
import { Plus, FileText, Download, Trash2, Upload, X, CircleAlert, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { watchQuotations, createQuotation } from "@/lib/firebase/data";
import { resolveCloudinaryConfig, uploadGenericFileToCloudinary } from "@/lib/cloudinary";
import { BUSINESS } from "@/lib/constants";
import type { Quotation } from "@/types";

export default function QuotationsPage() {
  const { showToast } = useToast();
  const { settings, formatMoney } = useStoreConfig();
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    quotationNumber: "",
    customer: "",
    customerPhone: "",
    date: new Date().toISOString().slice(0,10),
    notes: "",
    discount: "0",
    items: [{ name: "", quantity: 1, price: 0, unit: "each" }],
  });

  useEffect(() => {
    const stop = watchQuotations((l) => { setList(l); setLoading(false); });
    return () => stop();
  }, []);

  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const discount = Number(form.discount) || 0;
  const total = subtotal - discount;

  const updateItem = (idx: number, key: string, value: any) => {
    setForm((f) => {
      const items = [...f.items];
      (items[idx] as any)[key] = value;
      return { ...f, items };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.customer || !form.quotationNumber) { setError("Enter quotation number and customer"); return; }
    setSaving(true);
    try {
      let fileUrl = "";
      let publicId = "";
      if (file) {
        const config = resolveCloudinaryConfig(settings);
        const uploaded = await uploadGenericFileToCloudinary(file, config, "quotation");
        fileUrl = uploaded.url;
        publicId = uploaded.publicId;
      }
      await createQuotation({
        quotationNumber: form.quotationNumber,
        customer: form.customer,
        customerPhone: form.customerPhone,
        date: form.date,
        items: form.items,
        subtotal,
        discount,
        total,
        notes: form.notes,
        fileUrl,
        publicId,
      } as any);
      showToast("Quotation saved", "success");
      setShowForm(false);
      setForm({ quotationNumber: "", customer: "", customerPhone: "", date: new Date().toISOString().slice(0,10), notes: "", discount: "0", items: [{ name: "", quantity: 1, price: 0, unit: "each" }] });
      setFile(null);
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div><h2>Quotations</h2><p>Create/manage quotations. Quotation number, customer, date, items, quantity, price, subtotal, discount, total, notes. File stored in Cloudinary dhad95cch / branch_farm_unsigned, no folders.</p></div>
        <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> New Quotation</button>
      </section>

      {loading ? <Loading label="Loading quotations…" /> : list.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table" style={{ minWidth: 800 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1.2fr .7fr .6fr .6fr auto" }}>
              <span>Number</span><span>Customer</span><span>Date</span><span>Total</span><span>Items</span><span />
            </div>
            {list.map((q) => (
              <article key={q.id} style={{ gridTemplateColumns: "1fr 1.2fr .7fr .6fr .6fr auto" }}>
                <span><strong>{q.quotationNumber}</strong><small>{q.customerPhone}</small></span>
                <span>{q.customer}</span>
                <span>{q.date}</span>
                <span>{formatMoney(q.total)}</span>
                <span>{q.items.length}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  {q.fileUrl && <a className="button button-secondary button-small" href={q.fileUrl} target="_blank" rel="noreferrer"><Download size={14} /> File</a>}
                </span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No quotations" description="Create quotations with items, quantity, price, subtotal, discount, total, notes. Save, generate, view, download, send." />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="record-modal">
            <header><div><span className="eyebrow">{BUSINESS.name}</span><h2>New Quotation</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></header>
            <form onSubmit={submit} style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="form-grid">
                <label className="field"><span>Quotation Number *</span><input value={form.quotationNumber} onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })} placeholder="Q-0001" /></label>
                <label className="field"><span>Date *</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              </div>
              <div className="form-grid">
                <label className="field"><span>Customer *</span><input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" /></label>
                <label className="field"><span>Customer Phone</span><input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="+268…" /></label>
              </div>

              <div><strong>Items</strong>
                {form.items.map((it, idx) => (
                  <div key={idx} className="form-grid" style={{ marginTop: 8 }}>
                    <label className="field"><span>Item</span><input value={it.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="Product/service" /></label>
                    <label className="field"><span>Qty</span><input type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} /></label>
                    <label className="field"><span>Price</span><input type="number" value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} /></label>
                    <label className="field"><span>Unit</span><input value={it.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} /></label>
                  </div>
                ))}
                <button type="button" className="button button-secondary button-small" style={{ marginTop: 8 }} onClick={() => setForm({ ...form, items: [...form.items, { name: "", quantity: 1, price: 0, unit: "each" }] })}>Add item</button>
              </div>

              <div className="form-grid">
                <label className="field"><span>Subtotal</span><input value={subtotal} readOnly /></label>
                <label className="field"><span>Discount</span><input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></label>
                <label className="field"><span>Total</span><input value={total} readOnly /></label>
              </div>

              <label className="field"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

              <label className="field"><span>Quotation file (PDF) — stored in Cloudinary, no folders</span>
                <span className="button button-secondary file-button"><Upload size={16} /> {file ? file.name : "Choose file"}<input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></span>
              </label>

              {error && <div className="form-alert error"><CircleAlert size={16} /> {error}</div>}

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save / Generate"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
