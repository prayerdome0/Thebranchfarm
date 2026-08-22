"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Download,
  Eye,
  Pencil,
  PenLine,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ItemsEditor } from "@/components/documents/ItemsEditor";
import { SignaturePad } from "@/components/store/SignaturePad";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import {
  createReceipt,
  deleteReceipt,
  updateReceipt,
  watchCustomers,
  watchOrders,
  watchProducts,
  watchQuotations,
  watchReceipts,
} from "@/lib/firebase/data";
import {
  buildReceiptDocumentInput,
  computeDocumentTotals,
  generateReceiptNumber,
  normalizeQuotationStatus,
  type ReceiptRecord,
} from "@/lib/documents";
import { generateAndStoreDocument, openPrintableDocument } from "@/lib/documentFile";
import { BUSINESS, PAYMENT_METHODS } from "@/lib/constants";
import { formatDate, formatDisplayDate } from "@/lib/utils";
import type { Customer, Order, Product, Quotation, QuotationLine, Receipt } from "@/types";

interface ReceiptForm {
  receiptNumber: string;
  source: string;
  customerSelection: string;
  customer: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  items: QuotationLine[];
  discount: string;
  taxRate: string;
  amountPaid: string;
  paymentMethod: string;
  description: string;
  notes: string;
  authorizedBy: string;
  signature: string;
  signedByName: string;
  orderNumber: string;
  relatedOrderId: string;
  quotationNumber: string;
  quotationId: string;
  customerId: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function ReceiptsPage() {
  const { showToast } = useToast();
  const { formatMoney, currency } = useStoreConfig();
  const { user } = useAuth();

  const [list, setList] = useState<Receipt[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [viewing, setViewing] = useState<Receipt | null>(null);
  const [signing, setSigning] = useState<Receipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ReceiptForm>(blankForm);

  function blankForm(): ReceiptForm {
    return {
      receiptNumber: "",
      source: "",
      customerSelection: "new",
      customer: "",
      customerPhone: "",
      customerEmail: "",
      date: today(),
      items: [],
      discount: "0",
      taxRate: "0",
      amountPaid: "",
      paymentMethod: PAYMENT_METHODS[0],
      description: "",
      notes: "",
      authorizedBy: user?.fullName || "",
      signature: "",
      signedByName: "",
      orderNumber: "",
      relatedOrderId: "",
      quotationNumber: "",
      quotationId: "",
      customerId: "",
    };
  }

  useEffect(() => {
    const stopReceipts = watchReceipts((l) => {
      setList(l);
      setLoading(false);
    });
    const stopOrders = watchOrders(setOrders);
    const stopProducts = watchProducts(setProducts);
    const stopCustomers = watchCustomers(setCustomers);
    const stopQuotations = watchQuotations(setQuotations);
    return () => {
      stopReceipts();
      stopOrders();
      stopProducts();
      stopCustomers();
      stopQuotations();
    };
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((r) => {
      return (
        !term ||
        [r.receiptNumber, r.orderNumber, r.customer, r.customerPhone, r.paymentMethod, r.quotationNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    });
  }, [list, search]);

  const totals = computeDocumentTotals({
    items: form.items,
    discount: form.discount,
    taxRate: form.taxRate,
    amountPaid: form.amountPaid,
  });

  const openNew = () => {
    const base = blankForm();
    base.receiptNumber = generateReceiptNumber(list.map((r) => r.receiptNumber));
    setEditing(null);
    setForm(base);
    setError("");
    setShowForm(true);
  };

  const openEdit = (r: Receipt) => {
    setViewing(null);
    setEditing(r);
    setForm({
      receiptNumber: r.receiptNumber,
      source: r.orderNumber
        ? `order:${r.orderNumber}`
        : r.quotationId
          ? `quotation:${r.quotationId}`
          : "",
      customerSelection: r.customerId ? r.customerId : "new",
      customer: r.customer,
      customerPhone: r.customerPhone || "",
      customerEmail: r.customerEmail || "",
      date: r.date || today(),
      items: r.items || [],
      discount: String(r.discount || 0),
      taxRate: String(r.taxRate || 0),
      amountPaid: String(r.amountPaid ?? r.amount ?? 0),
      paymentMethod: r.paymentMethod || PAYMENT_METHODS[0],
      description: r.description || "",
      notes: r.notes || "",
      authorizedBy: r.authorizedBy || user?.fullName || "",
      signature: r.signature || "",
      signedByName: r.signedByName || "",
      orderNumber: r.orderNumber || "",
      relatedOrderId: r.relatedOrderId || "",
      quotationNumber: r.quotationNumber || "",
      quotationId: r.quotationId || "",
      customerId: r.customerId || "",
    });
    setError("");
    setShowForm(true);
  };

  const selectCustomer = (id: string) => {
    setForm((f) => {
      if (!id || id === "new") return { ...f, customerSelection: "new" };
      const customer = customers.find((c) => c.id === id);
      if (!customer) return { ...f, customerSelection: id };
      return {
        ...f,
        customerSelection: id,
        customer: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || "",
      };
    });
  };

  const applySource = (value: string) => {
    setForm((f) => {
      const next = { ...f, source: value };
      if (!value || value === "order:" || value === "quotation:") return next;
      if (value.startsWith("order:")) {
        const reference = value.slice(6);
        const order = orders.find((o) => o.reference === reference);
        if (!order) return next;
        return {
          ...next,
          orderNumber: order.reference,
          relatedOrderId: order.id,
          quotationNumber: "",
          quotationId: "",
          customer: order.customer.name,
          customerPhone: order.customer.phone,
          customerEmail: order.customer.email || "",
          customerId: "",
          items: order.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            unit: item.unit || "each",
            price: item.price,
            quantity: item.quantity,
          })),
          discount: "0",
          taxRate: "0",
          amountPaid: order.paymentStatus === "paid" ? String(order.total) : "0",
          paymentMethod: order.paymentMethod || next.paymentMethod,
          signature: order.signature || next.signature,
          signedByName: order.signedByName || next.signedByName,
        };
      }
      const quotation = quotations.find((q) => q.id === value.slice(10));
      if (!quotation) return next;
      return {
        ...next,
        orderNumber: "",
        relatedOrderId: "",
        quotationNumber: quotation.quotationNumber,
        quotationId: quotation.id,
        customer: quotation.customer,
        customerPhone: quotation.customerPhone || "",
        customerEmail: quotation.customerEmail || "",
        customerId: quotation.customerId || "",
        items: quotation.items || [],
        discount: String(quotation.discount || 0),
        taxRate: String(quotation.taxRate || 0),
        amountPaid: "0",
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const items = form.items.filter((item) => item.name.trim());
    if (!form.receiptNumber.trim()) {
      setError("Enter a receipt number (or keep the generated one).");
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

    const selectedCustomer =
      form.customerSelection && form.customerSelection !== "new"
        ? customers.find((c) => c.id === form.customerSelection)
        : undefined;
    const docTotals = computeDocumentTotals({
      items,
      discount: form.discount,
      taxRate: form.taxRate,
      amountPaid: form.amountPaid,
    });

    setSaving(true);
    try {
      const base: ReceiptRecord = {
        receiptNumber: form.receiptNumber.trim(),
        orderNumber: form.orderNumber,
        customer: form.customer.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        customerId: selectedCustomer?.id || form.customerId || undefined,
        date: form.date || today(),
        items,
        subtotal: docTotals.subtotal,
        discount: docTotals.discount,
        taxRate: docTotals.taxRate,
        taxAmount: docTotals.taxAmount,
        total: docTotals.total,
        amount: docTotals.amountPaid,
        amountPaid: docTotals.amountPaid,
        balance: docTotals.balance,
        paymentMethod: form.paymentMethod,
        description: form.description.trim(),
        notes: form.notes.trim(),
        authorizedBy: form.authorizedBy.trim() || user?.fullName || "",
        signature: form.signature || undefined,
        signedByName: form.signedByName || undefined,
        signedAt: form.signature ? new Date().toISOString() : undefined,
        quotationNumber: form.quotationNumber || undefined,
        quotationId: form.quotationId || undefined,
        fileUrl: editing?.fileUrl,
        publicId: editing?.publicId,
        relatedOrderId: form.relatedOrderId || undefined,
      };

      const generated = await generateAndStoreDocument(
        "receipt",
        {
          ...buildReceiptDocumentInput(base as Receipt),
          backHref: "/documents/receipts",
          backLabel: "Back to receipts",
        },
      );
      const fileUrl = generated?.fileUrl || editing?.fileUrl || "";
      const publicId = generated?.publicId || editing?.publicId || "";
      const payload = { ...base, fileUrl, publicId };

      if (editing) {
        const ok = await updateReceipt(editing.id, payload);
        if (!ok) throw new Error("Could not update the receipt. Check your connection and try again.");
        showToast(`Receipt ${payload.receiptNumber} updated`, "success");
      } else {
        await createReceipt(payload);
        showToast(`Receipt ${payload.receiptNumber} saved`, "success");
      }
      setShowForm(false);
    } catch (err) {
      setError(errorMessage(err, "Failed to save the receipt."));
    } finally {
      setSaving(false);
    }
  };

  const saveSignature = async (receipt: Receipt, dataUrl: string) => {
    setSaving(true);
    const ok = await updateReceipt(receipt.id, {
      signature: dataUrl,
      signedByName: user?.fullName || receipt.signedByName || "Team",
      signedAt: new Date().toISOString(),
    });
    setSaving(false);
    if (ok) {
      showToast("Signature saved to the receipt", "success");
      setSigning(null);
    } else {
      showToast("Could not save the signature.", "error");
    }
  };

  const remove = async (receipt: Receipt) => {
    if (!window.confirm(`Delete receipt ${receipt.receiptNumber}? This cannot be undone.`)) return;
    const ok = await deleteReceipt(receipt.id);
    showToast(ok ? "Receipt deleted" : "Could not delete the receipt", ok ? "success" : "error");
  };

  const printReceipt = (r: Receipt) => {
    openPrintableDocument({
      ...buildReceiptDocumentInput(r, currency),
      backHref: "/documents/receipts",
      backLabel: "Back to receipts",
    });
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Receipts</h2>
          <p>
            Real receipt documents: automatic numbers, customer, date, products, quantity, prices,
            subtotal, discount, tax and total, amount paid, balance due, payment method, notes and a
            signature captured on the device — stored in Firebase with the document in Cloudinary.
          </p>
        </div>
        <button className="button button-primary" onClick={openNew}>
          <Plus size={18} /> New Receipt
        </button>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt, order, customer, quotation…"
            aria-label="Search receipts"
          />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading receipts…" />
      ) : visible.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table" style={{ minWidth: 960 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1fr 1.2fr .7fr .7fr .6fr .9fr auto" }}>
              <span>Receipt</span>
              <span>Customer</span>
              <span>Date</span>
              <span>Paid</span>
              <span>Balance</span>
              <span>Payment</span>
              <span />
            </div>
            {visible.map((r) => {
              const total = r.total ?? r.amount ?? 0;
              const balance = r.balance ?? Math.max(total - (r.amountPaid ?? r.amount ?? 0), 0);
              return (
                <article key={r.id} style={{ gridTemplateColumns: "1fr 1.2fr .7fr .7fr .6fr .9fr auto" }}>
                  <span>
                    <strong>{r.receiptNumber}</strong>
                    <small>{r.orderNumber || r.quotationNumber || "walk-in"}</small>
                  </span>
                  <span>
                    <strong>{r.customer}</strong>
                    <small>{r.customerPhone || ""}</small>
                  </span>
                  <span>{formatDisplayDate(r.date)}</span>
                  <span>{formatMoney(r.amountPaid ?? r.amount ?? 0)}</span>
                  <span style={{ color: balance > 0 ? "var(--danger, #a34428)" : "var(--green-700)", fontWeight: 700 }}>
                    {balance > 0 ? formatMoney(balance) : "Paid"}
                  </span>
                  <span>
                    <small>{r.paymentMethod}</small>
                    {r.signature && <PenLine size={13} style={{ verticalAlign: "-2px", marginLeft: 5 }} />}
                  </span>
                  <span className="row-actions">
                    <button className="icon-button" title="View" onClick={() => setViewing(r)}>
                      <Eye size={16} />
                    </button>
                    <button className="icon-button" title="Sign" onClick={() => setSigning(r)}>
                      <PenLine size={16} />
                    </button>
                    <button className="icon-button" title="Edit" onClick={() => openEdit(r)}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-button" title="Print / Save PDF" onClick={() => printReceipt(r)}>
                      <Printer size={16} />
                    </button>
                    {r.fileUrl ? (
                      <a className="icon-button" title="Download document (Cloudinary)" href={r.fileUrl} target="_blank" rel="noreferrer">
                        <Download size={16} />
                      </a>
                    ) : (
                      <button className="icon-button" title="Document not uploaded yet — open printable view" onClick={() => printReceipt(r)}>
                        <Download size={16} />
                      </button>
                    )}
                    <button className="icon-button" title="Delete" onClick={() => remove(r)}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ReceiptIcon}
          title="No receipts"
          description="Create a receipt from an order, an accepted quotation, or fresh: items, discount, tax, amount paid, balance, payment method and a mobile-friendly signature — all on the document."
        />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="record-modal wide-modal">
            <header>
              <div>
                <span className="eyebrow">{BUSINESS.name}</span>
                <h2>{editing ? `Edit ${editing.receiptNumber}` : "New Receipt"}</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </header>
            <form onSubmit={submit} style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="form-grid">
                <label className="field">
                  <span>Receipt Number *</span>
                  <input
                    value={form.receiptNumber}
                    onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                    placeholder="RCP-2026-0001"
                  />
                </label>
                <label className="field">
                  <span>Date</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
              </div>

              <label className="field">
                <span>Start from (optional — fills customer and items)</span>
                <select value={form.source} onChange={(e) => applySource(e.target.value)}>
                  <option value="">— Blank receipt —</option>
                  {orders.length > 0 && <option value="order:" disabled>Orders</option>}
                  {orders.slice(0, 60).map((o) => (
                    <option key={o.id} value={`order:${o.reference}`}>
                      Order {o.reference} · {o.customer.name} · {formatMoney(o.total)}
                    </option>
                  ))}
                  {quotations.filter((q) => normalizeQuotationStatus(q.status) === "accepted").length > 0 && (
                    <option value="quotation:" disabled>
                      Accepted quotations
                    </option>
                  )}
                  {quotations
                    .filter((q) => normalizeQuotationStatus(q.status) === "accepted")
                    .slice(0, 60)
                    .map((q) => (
                      <option key={q.id} value={`quotation:${q.id}`}>
                        Quotation {q.quotationNumber} · {q.customer} · {formatMoney(q.total)}
                      </option>
                    ))}
                </select>
              </label>

              <label className="field">
                <span>Customer on file</span>
                <select value={form.customerSelection} onChange={(e) => selectCustomer(e.target.value)}>
                  <option value="new">— New customer (type the details below) —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Customer Name *</span>
                  <input
                    value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    placeholder="Customer name"
                  />
                </label>
                <div className="form-grid" style={{ gap: 8 }}>
                  <label className="field">
                    <span>Phone</span>
                    <input
                      value={form.customerPhone}
                      onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                      placeholder="+268…"
                    />
                  </label>
                  <label className="field">
                    <span>Payment method</span>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: ".82rem" }}>Products / services purchased</strong>
                <ItemsEditor
                  items={form.items}
                  onChange={(items) => setForm({ ...form, items })}
                  products={products}
                  formatMoney={formatMoney}
                />
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Discount ({BUSINESS.currency})</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Tax rate (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                  />
                </label>
              </div>

              <div className="doc-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(totals.subtotal)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>&minus;{formatMoney(totals.discount)}</strong>
                </div>
                <div>
                  <span>Tax ({totals.taxRate}%)</span>
                  <strong>{formatMoney(totals.taxAmount)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatMoney(totals.total)}</strong>
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Amount paid ({BUSINESS.currency})</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amountPaid}
                    onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                    placeholder="0"
                  />
                </label>
                <div className="doc-totals one">
                  <span>Balance / amount due</span>
                  <strong style={{ color: totals.balance > 0 ? "var(--danger, #a34428)" : "var(--green-700)" }}>
                    {totals.balance > 0 ? formatMoney(totals.balance) : "Paid in full"}
                  </strong>
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Description</span>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. payment for goat milk delivery"
                  />
                </label>
                <label className="field">
                  <span>Authorized by</span>
                  <input
                    value={form.authorizedBy}
                    onChange={(e) => setForm({ ...form, authorizedBy: e.target.value })}
                    placeholder={user?.fullName || "Staff name"}
                  />
                </label>
              </div>
              <label className="field">
                <span>Notes</span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Visible on the printed document"
                />
              </label>

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
                  hint="Sign with a finger or mouse — the signature is printed on the document."
                  onSave={(dataUrl) => setForm({ ...form, signature: dataUrl, signedByName: user?.fullName || "" })}
                />
              )}

              {error && (
                <div className="form-alert error">
                  <CircleAlert size={16} /> {error}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Save & Generate"}
                </button>
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
                <h2>{viewing.receiptNumber}</h2>
                <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
                  {viewing.customer}
                  {viewing.customerPhone ? ` · ${viewing.customerPhone}` : ""} · {formatDisplayDate(viewing.date)}
                  {viewing.orderNumber ? ` · order ${viewing.orderNumber}` : ""}
                  {viewing.quotationNumber ? ` · from ${viewing.quotationNumber}` : ""}
                </p>
              </div>
              <button className="icon-button" onClick={() => setViewing(null)}>
                <X size={18} />
              </button>
            </header>
            <div style={{ padding: 20, display: "grid", gap: 16 }}>
              {(viewing.items || []).length > 0 && (
                <table className="doc-view-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.items || []).map((item, i) => (
                      <tr key={i}>
                        <td>
                          {item.name}
                          {item.unit ? <small>({item.unit})</small> : null}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatMoney(item.price)}</td>
                        <td>{formatMoney(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="doc-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(viewing.subtotal ?? 0)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>&minus;{formatMoney(viewing.discount || 0)}</strong>
                </div>
                <div>
                  <span>Tax ({viewing.taxRate || 0}%)</span>
                  <strong>{formatMoney(viewing.taxAmount || 0)}</strong>
                </div>
                <div className="grand">
                  <span>Total</span>
                  <strong>{formatMoney(viewing.total ?? viewing.amount ?? 0)}</strong>
                </div>
                <div>
                  <span>Amount paid</span>
                  <strong>{formatMoney(viewing.amountPaid ?? viewing.amount ?? 0)}</strong>
                </div>
                <div className={((viewing.total ?? viewing.amount ?? 0) - (viewing.amountPaid ?? viewing.amount ?? 0)) > 0 ? "due" : "paid"}>
                  <span>Balance / due</span>
                  <strong>
                    {Math.max(
                      (viewing.total ?? viewing.amount ?? 0) - (viewing.amountPaid ?? viewing.amount ?? 0),
                      0,
                    ) > 0
                      ? formatMoney(
                          (viewing.total ?? viewing.amount ?? 0) - (viewing.amountPaid ?? viewing.amount ?? 0),
                        )
                      : "Paid in full"}
                  </strong>
                </div>
              </div>

              <div style={{ display: "grid", gap: 6, fontSize: ".78rem" }}>
                <span>
                  <strong>Payment:</strong> {viewing.paymentMethod}
                </span>
                {viewing.description && <span><strong>Description:</strong> {viewing.description}</span>}
                {viewing.notes && <span><strong>Notes:</strong> {viewing.notes}</span>}
              </div>

              {viewing.signature ? (
                <div className="signature-saved">
                  <img src={viewing.signature} alt="Customer signature" />
                  <div>
                    <strong>Authorized Signature</strong>
                    <small>[signed digitally]</small>
                    <small>
                      Authorized by: {viewing.authorizedBy || viewing.signedByName || "Admin"}
                      {viewing.signedAt ? ` · ${formatDate(viewing.signedAt, true)}` : ""}
                    </small>
                  </div>
                </div>
              ) : (
                <div className="form-alert">
                  <CircleAlert size={16} /> No signature yet — use the pen button to capture one on the receipt.
                </div>
              )}

              <div className="modal-actions">
                {viewing.fileUrl && (
                  <a className="button button-secondary button-small" href={viewing.fileUrl} target="_blank" rel="noreferrer">
                    <Download size={15} /> Download
                  </a>
                )}
                <button className="button button-secondary button-small" onClick={() => printReceipt(viewing)}>
                  <Printer size={15} /> Print / PDF
                </button>
                <button className="button button-secondary button-small" onClick={() => setSigning(viewing)}>
                  <PenLine size={15} /> Sign
                </button>
                <button className="button button-secondary button-small" onClick={() => openEdit(viewing)}>
                  <Pencil size={15} /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {signing && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setSigning(null)} />
          <div className="record-modal small-modal">
            <header>
              <div>
                <span className="eyebrow">{BUSINESS.name}</span>
                <h2>Sign {signing.receiptNumber}</h2>
                <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
                  Sign with your finger — Clear, Undo or Save. The signature is stored on the receipt
                  and printed on the document.
                </p>
              </div>
              <button className="icon-button" onClick={() => setSigning(null)}>
                <X size={18} />
              </button>
            </header>
            <div style={{ padding: 20 }}>
              <SignaturePad
                label="Authorized signature"
                hint="The customer signs at collection/delivery; the staff name is recorded as the authorizer."
                initialValue={signing.signature}
                onSave={(dataUrl) => saveSignature(signing, dataUrl)}
              />
              <div style={{ marginTop: 14 }}>
                <button type="button" className="button button-ghost" onClick={() => setSigning(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
