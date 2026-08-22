"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, FileText, Download, Eye, PenLine, Printer, Search, X, CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { SignaturePad } from "@/components/store/SignaturePad";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { watchInvoices, createInvoice } from "@/lib/firebase/data";
import { buildInvoiceDocumentInput, generateInvoiceNumber } from "@/lib/documents";
import { generateAndStoreDocument, openPrintableDocument } from "@/lib/documentFile";
import { BUSINESS, INVOICE_STATUSES } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import type { Invoice } from "@/types";

interface InvoiceForm {
  invoiceNumber: string;
  customer: string;
  date: string;
  notes: string;
  discount: string;
  delivery: string;
  paymentStatus: Invoice["paymentStatus"];
  preparedBy: string;
  signature: string;
  signedByName: string;
  items: { name: string; quantity: number; price: number; unit: string }[];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function blankForm(invoiceNumber = "", preparedBy = ""): InvoiceForm {
  return {
    invoiceNumber,
    customer: "",
    date: today(),
    notes: "",
    discount: "0",
    delivery: "0",
    paymentStatus: "Unpaid",
    preparedBy,
    signature: "",
    signedByName: "",
    items: [{ name: "", quantity: 1, price: 0, unit: "each" }],
  };
}

export default function InvoicesPage() {
  const { showToast } = useToast();
  const { settings, formatMoney, currency } = useStoreConfig();
  const { user } = useAuth();
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<InvoiceForm>(() => blankForm());

  useEffect(() => {
    const stop = watchInvoices((l) => { setList(l); setLoading(false); });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((inv) =>
      [inv.invoiceNumber, inv.customer, inv.paymentStatus, inv.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [list, search]);

  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const total = subtotal - (Number(form.discount) || 0) + (Number(form.delivery) || 0);

  const updateItem = (idx: number, key: "name" | "quantity" | "price", value: string) => {
    setForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        if (key === "name") return { ...it, name: value };
        return { ...it, [key]: Number(value) };
      });
      return { ...f, items };
    });
  };

  const openNew = () => {
    setForm(blankForm(generateInvoiceNumber(list.map((inv) => inv.invoiceNumber)), user?.fullName || ""));
    setError("");
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const items = form.items.filter((it) => it.name.trim());
    if (!form.invoiceNumber.trim()) {
      setError("Enter an invoice number (or keep the generated one).");
      return;
    }
    if (!form.customer.trim()) {
      setError("Enter the customer name.");
      return;
    }
    if (!items.length) {
      setError("Add at least one item with a name.");
      return;
    }

    setSaving(true);
    try {
      const base: Omit<Invoice, "id" | "createdBy" | "createdByName" | "createdAt" | "updatedBy" | "updatedByName" | "updatedAt" | "archived"> = {
        invoiceNumber: form.invoiceNumber.trim(),
        customer: form.customer.trim(),
        date: form.date || today(),
        items,
        subtotal,
        discount: Number(form.discount) || 0,
        delivery: Number(form.delivery) || 0,
        total,
        paymentStatus: form.paymentStatus,
        notes: form.notes.trim(),
        preparedBy: form.preparedBy.trim() || user?.fullName || "",
        signature: form.signature || undefined,
        signedByName: form.signedByName || undefined,
        signedAt: form.signature ? new Date().toISOString() : undefined,
      };

      // Render the professional invoice (with the real logo) and store it in
      // secure media storage — URL + public ID are recorded in Firestore with the invoice.
      const generated = await generateAndStoreDocument(
        "invoice",
        {
          ...buildInvoiceDocumentInput(base as Invoice, currency),
          backHref: "/documents/invoices",
          backLabel: "Back to invoices",
        },
      );

      const payload = {
        ...base,
        fileUrl: generated?.fileUrl || "",
        publicId: generated?.publicId || "",
      };

      await createInvoice(payload);
      showToast(`Invoice ${payload.invoiceNumber} saved`, "success");
      setShowForm(false);
      setForm(blankForm());
    } catch (err) {
      setError(errorMessage(err, "Failed to save the invoice."));
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = (inv: Invoice) => {
    openPrintableDocument({
      ...buildInvoiceDocumentInput(inv, currency),
      backHref: "/documents/invoices",
      backLabel: "Back to invoices",
    });
  };

  const statusClass = (status: string) => status.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Invoices</h2>
          <p>
            Invoice Number, Customer, Date, Products/services, Quantity, Price, Subtotal,
            Discount, Delivery, Total, Payment status, Notes. Every saved invoice is rendered
            as a professional document (with the farm logo) and stored in Cloudinary so it can
            be downloaded or printed.
          </p>
        </div>
        <button className="button button-primary" onClick={openNew}><Plus size={18} /> New Invoice</button>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, customer, status…"
            aria-label="Search invoices"
          />
        </div>
      </div>

      {loading ? <Loading label="Loading invoices…" /> : visible.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table" style={{ minWidth: 820 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1.2fr .8fr .7fr .7fr auto" }}>
              <span>Number</span><span>Customer</span><span>Date</span><span>Status</span><span>Total</span><span />
            </div>
            {visible.map((inv) => (
              <article key={inv.id} style={{ gridTemplateColumns: "1fr 1.2fr .8fr .7fr .7fr auto" }}>
                <span>
                  <strong>{inv.invoiceNumber}</strong>
                  <small>{inv.items?.length || 0} items {inv.signature ? "· signed" : ""}</small>
                  {inv.signature && <PenLine size={13} style={{ verticalAlign: "-2px", marginLeft: 5 }} />}
                </span>
                <span>{inv.customer}</span>
                <span>{formatDisplayDate(inv.date)}</span>
                <span><span className={`status-badge status-${statusClass(inv.paymentStatus)}`}>{inv.paymentStatus}</span></span>
                <span>{formatMoney(inv.total)}</span>
                <span className="row-actions">
                  <button className="icon-button" title="View" onClick={() => setViewing(inv)}>
                    <Eye size={16} />
                  </button>
                  <button className="icon-button" title="Print / Save PDF" onClick={() => printInvoice(inv)}>
                    <Printer size={16} />
                  </button>
                  {inv.fileUrl ? (
                    <a className="icon-button" title="Download document (Cloudinary)" href={inv.fileUrl} target="_blank" rel="noreferrer">
                      <Download size={16} />
                    </a>
                  ) : (
                    <button className="icon-button" title="Document not generated yet — open printable view" onClick={() => printInvoice(inv)}>
                      <Download size={16} />
                    </button>
                  )}
                </span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No invoices" description="Create an invoice: add the customer and items, set discount and delivery — the document is generated with the farm logo and can be downloaded or printed." />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="record-modal wide-modal">
            <header><div><span className="eyebrow">{BUSINESS.name}</span><h2>New Invoice</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></header>
            <form onSubmit={submit} style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="form-grid">
                <label className="field"><span>Invoice Number *</span><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="INV-2026-0001" /></label>
                <label className="field"><span>Date *</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              </div>
              <label className="field"><span>Customer *</span><input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
              <label className="field"><span>Payment Status</span>
                <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as Invoice["paymentStatus"] })}>
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

              <label className="field"><span>Prepared / Authorized by</span><input value={form.preparedBy} onChange={(e) => setForm({ ...form, preparedBy: e.target.value })} placeholder={user?.fullName || "Staff name"} /></label>

              {form.signature ? (
                <div className="signature-saved">
                  <img src={form.signature} alt="Signature" />
                  <div>
                    <strong>Signature attached</strong>
                    <small>Authorized Signature · [signed digitally]</small>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="button button-ghost button-small"
                        onClick={() => setForm({ ...form, signature: "", signedByName: "" })}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <SignaturePad
                  label="Customer / authorized signature"
                  hint="Sign with a finger or mouse — the signature and preparer name are printed on the invoice."
                  onSave={(dataUrl) => setForm({ ...form, signature: dataUrl, signedByName: user?.fullName || "" })}
                />
              )}

              {error && <div className="form-alert error"><CircleAlert size={16} /> {error}</div>}

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save & Generate"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setViewing(null)} />
          <div className="record-modal wide-modal">
            <header>
              <div>
                <span className="eyebrow">{BUSINESS.name}</span>
                <h2>{viewing.invoiceNumber}</h2>
                <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
                  {viewing.customer} · {formatDisplayDate(viewing.date)}
                </p>
              </div>
              <button className="icon-button" onClick={() => setViewing(null)}>
                <X size={18} />
              </button>
            </header>
            <div style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="doc-view-status">
                <span className={`status-badge status-${statusClass(viewing.paymentStatus)}`}>{viewing.paymentStatus}</span>
              </div>

              {(viewing.items || []).length > 0 && (
                <table className="doc-view-table">
                  <thead>
                    <tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {(viewing.items || []).map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}{item.unit ? <small>({item.unit})</small> : null}</td>
                        <td>{item.quantity}</td>
                        <td>{formatMoney(item.price)}</td>
                        <td>{formatMoney(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="doc-totals">
                <div><span>Subtotal</span><strong>{formatMoney(viewing.subtotal || 0)}</strong></div>
                {Number(viewing.discount) > 0 && (
                  <div><span>Discount</span><strong>&minus;{formatMoney(viewing.discount)}</strong></div>
                )}
                {Number(viewing.delivery) > 0 && (
                  <div><span>Delivery</span><strong>{formatMoney(viewing.delivery)}</strong></div>
                )}
                <div className="grand"><span>Total</span><strong>{formatMoney(viewing.total || 0)}</strong></div>
              </div>

              {viewing.notes && (
                <p style={{ fontSize: ".8rem", margin: 0 }}><strong>Notes:</strong> {viewing.notes}</p>
              )}

              {viewing.signature ? (
                <div className="signature-saved">
                  <img src={viewing.signature} alt="Signature" />
                  <div>
                    <strong>Authorized Signature</strong>
                    <small>[signed digitally]</small>
                    <small>
                      Prepared by: {viewing.preparedBy || viewing.authorizedBy || viewing.signedByName || "—"}
                      {viewing.signedAt ? ` · ${formatDisplayDate(viewing.signedAt)}` : ""}
                    </small>
                  </div>
                </div>
              ) : (
                viewing.preparedBy && (
                  <p style={{ fontSize: ".74rem", margin: 0, color: "var(--muted)" }}>
                    Prepared by {viewing.preparedBy}
                  </p>
                )
              )}

              <div className="modal-actions">
                {viewing.fileUrl && (
                  <a className="button button-secondary button-small" href={viewing.fileUrl} target="_blank" rel="noreferrer">
                    <Download size={15} /> Download
                  </a>
                )}
                <button className="button button-secondary button-small" onClick={() => printInvoice(viewing)}>
                  <Printer size={15} /> Print / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
