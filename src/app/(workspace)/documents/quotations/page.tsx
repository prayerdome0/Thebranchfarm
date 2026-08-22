"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import { ItemsEditor } from "@/components/documents/ItemsEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createOrder,
  createQuotation,
  createReceipt,
  updateOrder,
  updateQuotation,
  updateReceipt,
  watchCustomers,
  watchProducts,
  watchQuotations,
  watchReceipts,
} from "@/lib/firebase/data";
import {
  buildQuotationDocumentInput,
  buildReceiptDocumentInput,
  computeDocumentTotals,
  generateQuotationNumber,
  generateReceiptNumber,
  normalizeQuotationStatus,
  type QuotationRecord,
  type ReceiptRecord,
} from "@/lib/documents";
import { generateAndStoreDocument, openPrintableDocument } from "@/lib/documentFile";
import {
  BUSINESS,
  PAYMENT_METHODS,
  QUOTATION_STATUS_FLOW,
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUSES,
} from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import type { Customer, Product, Quotation, QuotationLine, QuotationStatus, Receipt } from "@/types";

interface QuotationForm {
  quotationNumber: string;
  customerSelection: string;
  customer: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  validDays: string;
  items: QuotationLine[];
  discount: string;
  taxRate: string;
  notes: string;
  authorizedBy: string;
  status: QuotationStatus;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function addDays(date: string, days: number) {
  const parsed = date ? new Date(`${date}T12:00:00`) : null;
  const base = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  base.setDate(base.getDate() + Math.max(1, Math.floor(Number(days) || 14)));
  return base.toISOString().slice(0, 10);
}

export default function QuotationsPage() {
  const { showToast } = useToast();
  const { settings, formatMoney, currency } = useStoreConfig();
  const { user } = useAuth();

  const [list, setList] = useState<Quotation[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "all">("all");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [viewing, setViewing] = useState<Quotation | null>(null);
  const [converting, setConverting] = useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [convertForm, setConvertForm] = useState({
    paymentMethod: PAYMENT_METHODS[0] as string,
    amountPaid: "",
    alsoCreateOrder: true,
  });
  const [form, setForm] = useState<QuotationForm>(blankForm);

  function blankForm(): QuotationForm {
    return {
      quotationNumber: "",
      customerSelection: "new",
      customer: "",
      customerPhone: "",
      customerEmail: "",
      date: today(),
      validDays: "14",
      items: [{ name: "", quantity: 1, price: 0, unit: "each" }],
      discount: "0",
      taxRate: "0",
      notes: "",
      authorizedBy: user?.fullName || "",
      status: "draft",
    };
  }

  useEffect(() => {
    const stopQuotations = watchQuotations((l) => {
      setList(l);
      setLoading(false);
    });
    const stopReceipts = watchReceipts(setReceipts);
    const stopProducts = watchProducts(setProducts);
    const stopCustomers = watchCustomers(setCustomers);
    return () => {
      stopQuotations();
      stopReceipts();
      stopProducts();
      stopCustomers();
    };
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((q) => {
      const matchesStatus = statusFilter === "all" || normalizeQuotationStatus(q.status) === statusFilter;
      const matchesSearch =
        !term ||
        [q.quotationNumber, q.customer, q.customerPhone, q.customerEmail, q.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [list, search, statusFilter]);

  const totals = computeDocumentTotals({
    items: form.items,
    discount: form.discount,
    taxRate: form.taxRate,
  });

  const openNew = () => {
    const base = blankForm();
    base.quotationNumber = generateQuotationNumber(list.map((q) => q.quotationNumber));
    setEditing(null);
    setForm(base);
    setError("");
    setShowForm(true);
  };

  const openEdit = (q: Quotation) => {
    setViewing(null);
    setEditing(q);
    const validDays = q.validUntil
      ? Math.max(
          1,
          Math.round(
            (new Date(q.validUntil).getTime() - new Date(q.date || today()).getTime()) / 86400000,
          ),
        )
      : 14;
    setForm({
      quotationNumber: q.quotationNumber,
      customerSelection: q.customerId ? q.customerId : "new",
      customer: q.customer,
      customerPhone: q.customerPhone || "",
      customerEmail: q.customerEmail || "",
      date: q.date || today(),
      validDays: String(validDays),
      items: q.items?.length ? q.items : [{ name: "", quantity: 1, price: 0, unit: "each" }],
      discount: String(q.discount || 0),
      taxRate: String(q.taxRate || 0),
      notes: q.notes || "",
      authorizedBy: q.authorizedBy || user?.fullName || "",
      status: normalizeQuotationStatus(q.status),
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const items = form.items.filter((item) => item.name.trim());
    if (!form.quotationNumber.trim()) {
      setError("Enter a quotation number (or keep the generated one).");
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
    const recordTotals = computeDocumentTotals({
      items,
      discount: form.discount,
      taxRate: form.taxRate,
    });

    setSaving(true);
    try {
      const base: QuotationRecord = {
        quotationNumber: form.quotationNumber.trim(),
        customer: form.customer.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        customerId: selectedCustomer?.id,
        date: form.date || today(),
        items,
        subtotal: recordTotals.subtotal,
        discount: recordTotals.discount,
        taxRate: recordTotals.taxRate,
        taxAmount: recordTotals.taxAmount,
        total: recordTotals.total,
        balance: recordTotals.total,
        notes: form.notes.trim(),
        status: form.status,
        authorizedBy: form.authorizedBy.trim() || user?.fullName || "",
        validUntil: addDays(form.date || today(), Number(form.validDays) || 14),
        fileUrl: editing?.fileUrl,
        publicId: editing?.publicId,
      };

      // Render the professional document and store it in Cloudinary — the
      // URL and public ID are recorded in Firestore with the quotation.
      const generated = await generateAndStoreDocument(
        "quotation",
        {
          ...buildQuotationDocumentInput(base as Quotation),
          backHref: "/documents/quotations",
          backLabel: "Back to quotations",
        },
        settings,
      );
      const fileUrl = generated?.fileUrl || editing?.fileUrl || "";
      const publicId = generated?.publicId || editing?.publicId || "";
      const payload = { ...base, fileUrl, publicId };

      if (editing) {
        const ok = await updateQuotation(editing.id, payload);
        if (!ok) throw new Error("Could not update the quotation. Check your connection and try again.");
        showToast(`Quotation ${payload.quotationNumber} updated`, "success");
      } else {
        await createQuotation(payload);
        showToast(`Quotation ${payload.quotationNumber} saved`, "success");
      }
      setShowForm(false);
    } catch (err) {
      setError(errorMessage(err, "Failed to save the quotation."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (q: Quotation, status: QuotationStatus) => {
    if (status === "converted") {
      setViewing(null);
      openConvert(q);
      return;
    }
    const ok = await updateQuotation(q.id, { status });
    showToast(
      ok ? `Quotation marked ${QUOTATION_STATUS_LABELS[status]}` : "Could not update the status.",
      ok ? "success" : "error",
    );
  };

  const openConvert = (q: Quotation) => {
    setConverting(q);
    setConvertForm({ paymentMethod: PAYMENT_METHODS[0], amountPaid: "", alsoCreateOrder: true });
  };

  const confirmConvert = async () => {
    const q = converting;
    if (!q) return;
    setSaving(true);
    try {
      const docTotals = computeDocumentTotals({
        items: q.items || [],
        discount: q.discount,
        taxRate: q.taxRate,
      });
      const amountPaid = Math.min(Math.max(Number(convertForm.amountPaid) || 0, 0), docTotals.total);
      const receiptNumber = generateReceiptNumber(receipts.map((r) => r.receiptNumber));

      let orderNumber = "";
      if (convertForm.alsoCreateOrder) {
        const order = await createOrder({
          items: (q.items || []).map((line) => ({
            productId: line.productId || "",
            name: line.name,
            unit: line.unit || "each",
            price: Number(line.price) || 0,
            quantity: Number(line.quantity) || 1,
          })),
          subtotal: docTotals.subtotal,
          deliveryFee: 0,
          total: docTotals.total,
          customer: {
            name: q.customer,
            phone: q.customerPhone || "",
            email: q.customerEmail || undefined,
          },
          fulfillment: "pickup",
          paymentMethod: convertForm.paymentMethod,
          notes: `Created from quotation ${q.quotationNumber}`,
        });
        orderNumber = order.reference;
        await updateOrder(order.id, {
          status: "confirmed",
          paymentStatus:
            docTotals.total > 0 && amountPaid >= docTotals.total
              ? "paid"
              : amountPaid > 0
                ? "partial"
                : "unpaid",
          paymentMethod: convertForm.paymentMethod,
        });
      }

      const receipt: ReceiptRecord = {
        receiptNumber,
        orderNumber,
        customer: q.customer,
        customerPhone: q.customerPhone,
        customerEmail: q.customerEmail,
        customerId: q.customerId,
        date: today(),
        items: q.items || [],
        subtotal: docTotals.subtotal,
        discount: docTotals.discount,
        taxRate: docTotals.taxRate,
        taxAmount: docTotals.taxAmount,
        total: docTotals.total,
        amount: amountPaid,
        amountPaid,
        balance: docTotals.total - amountPaid,
        paymentMethod: convertForm.paymentMethod,
        notes: `Converted from quotation ${q.quotationNumber}.`,
        authorizedBy: q.authorizedBy || user?.fullName || "",
        quotationNumber: q.quotationNumber,
        quotationId: q.id,
      };
      const receiptRef = await createReceipt(receipt);
      const generated = await generateAndStoreDocument(
        "receipt",
        {
          ...buildReceiptDocumentInput({ ...receipt, id: receiptRef.id } as Receipt),
          backHref: "/documents/receipts",
          backLabel: "Back to receipts",
        },
        settings,
      );
      if (generated) {
        await updateReceipt(receiptRef.id, {
          fileUrl: generated.fileUrl,
          publicId: generated.publicId,
        });
      }

      await updateQuotation(q.id, {
        status: "converted",
        convertedReceiptId: receiptRef.id,
        convertedReceiptNumber: receiptNumber,
        convertedOrderNumber: orderNumber,
      });
      setConverting(null);
      showToast(
        `Receipt ${receiptNumber} created from ${q.quotationNumber}${orderNumber ? ` · Order ${orderNumber}` : ""}`,
        "success",
      );
    } catch (err) {
      showToast(errorMessage(err, "Could not convert the quotation."), "error");
    } finally {
      setSaving(false);
    }
  };

  const allowedStatuses = (q: Quotation) =>
    QUOTATION_STATUS_FLOW[normalizeQuotationStatus(q.status)] || [normalizeQuotationStatus(q.status)];

  const printQuotation = (q: Quotation) => {
    openPrintableDocument({
      ...buildQuotationDocumentInput(q, currency),
      backHref: "/documents/quotations",
      backLabel: "Back to quotations",
    });
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Quotations</h2>
          <p>
            Create, send, accept and convert farm quotations. Pick products from the store, set
            quantity, price, discount and tax — totals calculate automatically. Professional
            numbers, status flow (Draft → Sent → Accepted/Rejected → Converted), Cloudinary document,
            and one-click conversion into a receipt and order.
          </p>
        </div>
        <button className="button button-primary" onClick={openNew}>
          <Plus size={18} /> New Quotation
        </button>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, customer, phone…"
            aria-label="Search quotations"
          />
        </div>
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Filter quotations by status">
        <button type="button" className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
          All
        </button>
        {QUOTATION_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={statusFilter === status ? "active" : ""}
            onClick={() => setStatusFilter(status)}
          >
            {QUOTATION_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading quotations…" />
      ) : visible.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table" style={{ minWidth: 920 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1.1fr 1.3fr .8fr .7fr .7fr auto" }}>
              <span>Number</span>
              <span>Customer</span>
              <span>Date</span>
              <span>Total</span>
              <span>Status</span>
              <span />
            </div>
            {visible.map((q) => (
              <article key={q.id} style={{ gridTemplateColumns: "1.1fr 1.3fr .8fr .7fr .7fr auto" }}>
                <span>
                  <strong>{q.quotationNumber}</strong>
                  <small>{q.items?.length || 0} items</small>
                </span>
                <span>
                  <strong>{q.customer}</strong>
                  <small>{q.customerPhone || "no phone"}</small>
                </span>
                <span>{formatDisplayDate(q.date)}</span>
                <span>{formatMoney(q.total)}</span>
                <span>
                  <StatusBadge status={normalizeQuotationStatus(q.status)} />
                </span>
                <span className="row-actions">
                  <button className="icon-button" title="View" onClick={() => setViewing(q)}>
                    <Eye size={16} />
                  </button>
                  <button className="icon-button" title="Edit" onClick={() => openEdit(q)}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-button" title="Print / Save PDF" onClick={() => printQuotation(q)}>
                    <Printer size={16} />
                  </button>
                  {q.fileUrl ? (
                    <a className="icon-button" title="Download document (Cloudinary)" href={q.fileUrl} target="_blank" rel="noreferrer">
                      <Download size={16} />
                    </a>
                  ) : (
                    <button className="icon-button" title="Document not uploaded yet — open printable view" onClick={() => printQuotation(q)}>
                      <Download size={16} />
                    </button>
                  )}
                  {normalizeQuotationStatus(q.status) === "accepted" && (
                    <button className="icon-button" title="Convert to receipt / order" onClick={() => openConvert(q)}>
                      <ArrowRightLeft size={16} />
                    </button>
                  )}
                </span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No quotations"
          description="Create a quotation: pick the customer and products from the store, set quantity, price, discount and tax — totals calculate automatically. Save it to Firebase, print or download it, and convert an accepted quote straight into a receipt."
        />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} />
          <div className="record-modal wide-modal">
            <header>
              <div>
                <span className="eyebrow">{BUSINESS.name}</span>
                <h2>{editing ? `Edit ${editing.quotationNumber}` : "New Quotation"}</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </header>
            <form onSubmit={submit} style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="form-grid">
                <label className="field">
                  <span>Quotation Number *</span>
                  <input
                    value={form.quotationNumber}
                    onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })}
                    placeholder="QF-2026-0001"
                  />
                </label>
                <label className="field">
                  <span>Date *</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
              </div>

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
                    <span>Email</span>
                    <input
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                      placeholder="optional"
                    />
                  </label>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: ".82rem" }}>Items</strong>
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
                <div className="grand">
                  <span>Total / Balance</span>
                  <strong>{formatMoney(totals.total)}</strong>
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Valid for (days)</span>
                  <input
                    type="number"
                    min={1}
                    value={form.validDays}
                    onChange={(e) => setForm({ ...form, validDays: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as QuotationStatus })}
                  >
                    {QUOTATION_STATUSES.filter((s) => s !== "converted").map((s) => (
                      <option key={s} value={s}>
                        {QUOTATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Prepared / Authorized by</span>
                  <input
                    value={form.authorizedBy}
                    onChange={(e) => setForm({ ...form, authorizedBy: e.target.value })}
                    placeholder={user?.fullName || "Staff name"}
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Short note shown on the document"
                  />
                </label>
              </div>

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
                <h2>{viewing.quotationNumber}</h2>
                <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
                  {viewing.customer}
                  {viewing.customerPhone ? ` · ${viewing.customerPhone}` : ""} · {formatDisplayDate(viewing.date)}
                  {viewing.validUntil ? ` · valid until ${formatDisplayDate(viewing.validUntil)}` : ""}
                </p>
              </div>
              <button className="icon-button" onClick={() => setViewing(null)}>
                <X size={18} />
              </button>
            </header>
            <div style={{ padding: 20, display: "grid", gap: 16 }}>
              <div className="doc-view-status">
                <StatusBadge status={normalizeQuotationStatus(viewing.status)} />
                <select value="" onChange={(e) => e.target.value && changeStatus(viewing, e.target.value as QuotationStatus)}>
                  <option value="">Change status…</option>
                  {allowedStatuses(viewing)
                    .filter((s) => s !== normalizeQuotationStatus(viewing.status))
                    .map((s) => (
                      <option key={s} value={s}>
                        {QUOTATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                </select>
              </div>

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

              <div className="doc-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(viewing.subtotal || 0)}</strong>
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
                  <span>Total / Balance</span>
                  <strong>{formatMoney(viewing.total || 0)}</strong>
                </div>
              </div>

              {viewing.notes && (
                <p style={{ fontSize: ".8rem", margin: 0 }}>
                  <strong>Notes:</strong> {viewing.notes}
                </p>
              )}
              {viewing.authorizedBy && (
                <p style={{ fontSize: ".74rem", margin: 0, color: "var(--muted)" }}>
                  Prepared by {viewing.authorizedBy}
                </p>
              )}
              {viewing.status === "converted" && (
                <p className="form-alert" style={{ margin: 0 }}>
                  Converted to receipt <strong>{viewing.convertedReceiptNumber}</strong>
                  {viewing.convertedOrderNumber ? ` · order ${viewing.convertedOrderNumber}` : ""}.
                </p>
              )}

              <div className="modal-actions">
                {viewing.fileUrl && (
                  <a className="button button-secondary button-small" href={viewing.fileUrl} target="_blank" rel="noreferrer">
                    <Download size={15} /> Download
                  </a>
                )}
                <button className="button button-secondary button-small" onClick={() => printQuotation(viewing)}>
                  <Printer size={15} /> Print / PDF
                </button>
                <button className="button button-secondary button-small" onClick={() => openEdit(viewing)}>
                  <Pencil size={15} /> Edit
                </button>
                {normalizeQuotationStatus(viewing.status) === "accepted" && (
                  <button className="button button-primary button-small" onClick={() => openConvert(viewing)}>
                    <ArrowRightLeft size={15} /> Convert to receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {converting && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setConverting(null)} />
          <div className="record-modal small-modal">
            <header>
              <div>
                <span className="eyebrow">{BUSINESS.name}</span>
                <h2>Convert {converting.quotationNumber}</h2>
                <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
                  {converting.customer} · {formatMoney(converting.total || 0)} — copied straight into a
                  receipt, nothing re-entered.
                </p>
              </div>
              <button className="icon-button" onClick={() => setConverting(null)}>
                <X size={18} />
              </button>
            </header>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void confirmConvert();
              }}
              style={{ padding: 20, display: "grid", gap: 14 }}
            >
              <label className="field">
                <span>Payment method</span>
                <select
                  value={convertForm.paymentMethod}
                  onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Amount paid now ({BUSINESS.currency})</span>
                <input
                  type="number"
                  min={0}
                  max={converting.total || 0}
                  step="0.01"
                  value={convertForm.amountPaid}
                  onChange={(e) => setConvertForm({ ...convertForm, amountPaid: e.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="field checkbox-field">
                <input
                  type="checkbox"
                  checked={convertForm.alsoCreateOrder}
                  onChange={(e) => setConvertForm({ ...convertForm, alsoCreateOrder: e.target.checked })}
                />
                <span>Also create the matching order in Orders (inventory is updated)</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setConverting(null)}>
                  Cancel
                </button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? "Converting…" : "Convert & Create Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
