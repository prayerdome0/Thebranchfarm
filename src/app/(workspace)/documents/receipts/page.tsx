"use client";

import { useEffect, useState } from "react";
import { Plus, FileText, Download, Upload, X, CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { watchReceipts, createReceipt, getOrders } from "@/lib/firebase/data";
import { resolveCloudinaryConfig, uploadGenericFileToCloudinary } from "@/lib/cloudinary";
import { BUSINESS, PAYMENT_METHODS } from "@/lib/constants";
import type { Receipt, Order } from "@/types";

export default function ReceiptsPage() {
  const { showToast } = useToast();
  const { settings, formatMoney } = useStoreConfig();
  const [list, setList] = useState<Receipt[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    receiptNumber: "",
    orderNumber: "",
    customer: "",
    date: new Date().toISOString().slice(0,10),
    amount: "",
    paymentMethod: PAYMENT_METHODS[0] as string,
    description: "",
  });

  useEffect(() => {
    const stop = watchReceipts((l) => { setList(l); setLoading(false); });
    getOrders().then(setOrders);
    return () => stop();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiptNumber || !form.customer || !form.amount) { setError("Enter receipt number, customer, amount"); return; }
    setSaving(true);
    try {
      let fileUrl = "";
      let publicId = "";
      if (file) {
        const config = resolveCloudinaryConfig(settings);
        const uploaded = await uploadGenericFileToCloudinary(file, config, "receipt");
        fileUrl = uploaded.url;
        publicId = uploaded.publicId;
      }
      await createReceipt({
        receiptNumber: form.receiptNumber,
        orderNumber: form.orderNumber,
        customer: form.customer,
        date: form.date,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        description: form.description,
        fileUrl,
        publicId,
        relatedOrderId: form.orderNumber,
      } as any);
      showToast("Receipt saved", "success");
      setShowForm(false);
      setForm({ receiptNumber: "", orderNumber: "", customer: "", date: new Date().toISOString().slice(0,10), amount: "", paymentMethod: PAYMENT_METHODS[0], description: "" });
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
        <div><h2>Receipts</h2><p>Admin can create receipts from completed/paid orders. Include receipt number, order number, customer, date, amount, payment method, description. File stored in Cloudinary.</p></div>
        <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> New Receipt</button>
      </section>

      {loading ? <Loading label="Loading receipts…" /> : list.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table" style={{ minWidth: 800 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1fr 1fr .6fr .6fr auto" }}>
              <span>Receipt</span><span>Order</span><span>Customer</span><span>Date</span><span>Amount</span><span />
            </div>
            {list.map((r) => (
              <article key={r.id} style={{ gridTemplateColumns: "1fr 1fr 1fr .6fr .6fr auto" }}>
                <span><strong>{r.receiptNumber}</strong><small>{r.paymentMethod}</small></span>
                <span>{r.orderNumber}</span>
                <span>{r.customer}</span>
                <span>{r.date}</span>
                <span>{formatMoney(r.amount)}</span>
                <span>{r.fileUrl && <a className="button button-secondary button-small" href={r.fileUrl} target="_blank" rel="noreferrer"><Download size={14} /> File</a>}</span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No receipts" description="Create receipts from completed/paid orders." />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="record-modal small-modal">
            <header><div><span className="eyebrow">{BUSINESS.name}</span><h2>New Receipt</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></header>
            <form onSubmit={submit} style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="form-grid">
                <label className="field"><span>Receipt Number *</span><input value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} placeholder="REC-0001" /></label>
                <label className="field"><span>Order Number</span>
                  <select value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}>
                    <option value="">Select order</option>
                    {orders.slice(0,50).map((o) => (<option key={o.id} value={o.reference}>{o.reference} - {o.customer.name} - {formatMoney(o.total)}</option>))}
                  </select>
                </label>
              </div>
              <label className="field"><span>Customer *</span><input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
              <div className="form-grid">
                <label className="field"><span>Date</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="field"><span>Amount *</span><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
              </div>
              <label className="field"><span>Payment Method</span>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </label>
              <label className="field"><span>Description</span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="field"><span>Receipt file — Cloudinary no folders</span>
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
