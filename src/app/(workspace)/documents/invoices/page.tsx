"use client";

import { useEffect, useState } from "react";
import { Plus, FileText, Download, Upload, X, CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { watchInvoices, createInvoice } from "@/lib/firebase/data";
import { resolveCloudinaryConfig, uploadGenericFileToCloudinary } from "@/lib/cloudinary";
import { BUSINESS, INVOICE_STATUSES } from "@/lib/constants";
import type { Invoice } from "@/types";

export default function InvoicesPage() {
  const { showToast } = useToast();
  const { settings, formatMoney } = useStoreConfig();
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    invoiceNumber: "",
    customer: "",
    date: new Date().toISOString().slice(0,10),
    notes: "",
    discount: "0",
    delivery: "0",
    paymentStatus: "Unpaid" as Invoice["paymentStatus"],
    items: [{ name: "", quantity: 1, price: 0, unit: "each" }],
  });

  useEffect(() => {
    const stop = watchInvoices((l) => { setList(l); setLoading(false); });
    return () => stop();
  }, []);

  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const total = subtotal - (Number(form.discount) || 0) + (Number(form.delivery) || 0);

  const updateItem = (idx: number, key: string, value: any) => {
    setForm((f) => {
      const items = [...f.items];
      (items[idx] as any)[key] = value;
      return { ...f, items };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer || !form.invoiceNumber) { setError("Enter invoice number and customer"); return; }
    setSaving(true);
    try {
      let fileUrl = "";
      let publicId = "";
      if (file) {
        const config = resolveCloudinaryConfig(settings);
        const uploaded = await uploadGenericFileToCloudinary(file, config, "invoice");
        fileUrl = uploaded.url;
        publicId = uploaded.publicId;
      }
      await createInvoice({
        invoiceNumber: form.invoiceNumber,
        customer: form.customer,
        date: form.date,
        items: form.items,
        subtotal,
        discount: Number(form.discount) || 0,
        delivery: Number(form.delivery) || 0,
        total,
        paymentStatus: form.paymentStatus,
        notes: form.notes,
        fileUrl,
        publicId,
      } as any);
      showToast("Invoice saved", "success");
      setShowForm(false);
      setForm({ invoiceNumber: "", customer: "", date: new Date().toISOString().slice(0,10), notes: "", discount: "0", delivery: "0", paymentStatus: "Unpaid", items: [{ name: "", quantity: 1, price: 0, unit: "each" }] });
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
        <div><h2>Invoices</h2><p>Invoice Number, Customer, Date, Products/services, Quantity, Price, Subtotal, Discount, Delivery, Total, Payment status, Notes. Statuses: Unpaid, Partially Paid, Paid, Cancelled. File stored in Cloudinary.</p></div>
        <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> New Invoice</button>
      </section>

      {loading ? <Loading label="Loading invoices…" /> : list.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table" style={{ minWidth: 800 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1.2fr .7fr .6fr .7fr auto" }}>
              <span>Number</span><span>Customer</span><span>Date</span><span>Status</span><span>Total</span><span />
            </div>
            {list.map((inv) => (
              <article key={inv.id} style={{ gridTemplateColumns: "1fr 1.2fr .7fr .6fr .7fr auto" }}>
                <span><strong>{inv.invoiceNumber}</strong></span>
                <span>{inv.customer}</span>
                <span>{inv.date}</span>
                <span><span className={`status-badge status-${inv.paymentStatus.toLowerCase().replace(" ", "-")}`}>{inv.paymentStatus}</span></span>
                <span>{formatMoney(inv.total)}</span>
                <span>{inv.fileUrl && <a className="button button-secondary button-small" href={inv.fileUrl} download={`${inv.invoiceNumber}.pdf`} target="_blank" rel="noreferrer"><Download size={14} /> Download</a>}</span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No invoices" description="Create/manage invoices with payment status." />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="record-modal">
            <header><div><span className="eyebrow">{BUSINESS.name}</span><h2>New Invoice</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></header>
            <form onSubmit={submit} style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="form-grid">
                <label className="field"><span>Invoice Number *</span><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="INV-00021" /></label>
                <label className="field"><span>Date *</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              </div>
              <label className="field"><span>Customer *</span><input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
              <label className="field"><span>Payment Status</span>
                <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as any })}>
                  {INVOICE_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </label>

              <div><strong>Products/services</strong>
                {form.items.map((it, idx) => (
                  <div key={idx} className="form-grid" style={{ marginTop: 8 }}>
                    <label className="field"><span>Item</span><input value={it.name} onChange={(e) => updateItem(idx, "name", e.target.value)} /></label>
                    <label className="field"><span>Qty</span><input type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} /></label>
                    <label className="field"><span>Price</span><input type="number" value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} /></label>
                  </div>
                ))}
                <button type="button" className="button button-secondary button-small" style={{ marginTop: 8 }} onClick={() => setForm({ ...form, items: [...form.items, { name: "", quantity: 1, price: 0, unit: "each" }] })}>Add item</button>
              </div>

              <div className="form-grid">
                <label className="field"><span>Subtotal</span><input value={subtotal} readOnly /></label>
                <label className="field"><span>Discount</span><input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></label>
                <label className="field"><span>Delivery</span><input type="number" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })} /></label>
                <label className="field"><span>Total</span><input value={total} readOnly /></label>
              </div>

              <label className="field"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>

              <label className="field"><span>Invoice file — Cloudinary no folders</span>
                <span className="button button-secondary file-button"><Upload size={16} /> {file ? file.name : "Choose file"}<input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></span>
              </label>

              {error && <div className="form-alert error"><CircleAlert size={16} /> {error}</div>}

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
