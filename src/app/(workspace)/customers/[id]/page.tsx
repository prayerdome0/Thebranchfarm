"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  MessageSquareText,
  Phone,
  Receipt as ReceiptIcon,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { getCustomer, watchOrders, watchQuotations, watchReceipts } from "@/lib/firebase/data";
import {
  buildQuotationDocumentInput,
  buildReceiptDocumentInput,
  normalizeQuotationStatus,
  quotationStatusLabel,
} from "@/lib/documents";
import { openPrintableDocument } from "@/lib/documentFile";
import { BUSINESS, FULFILLMENT_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDisplayDate, money, phoneHref, whatsappHref } from "@/lib/utils";
import type { Customer, Order, Quotation, Receipt } from "@/types";

type Tab = "orders" | "quotations" | "receipts";

function sameCustomer(
  customer: Customer,
  record: { customer?: string; customerPhone?: string; customerId?: string },
) {
  if (record.customerId && record.customerId === customer.id) return true;
  if (record.customerPhone && record.customerPhone === customer.phone) return true;
  if (record.customer && record.customer.trim().toLowerCase() === customer.name.trim().toLowerCase())
    return true;
  return false;
}

function orderMatchesCustomer(order: Order, customer: Customer) {
  if (order.customer.phone && order.customer.phone === customer.phone) return true;
  if (order.customer.name.trim().toLowerCase() === customer.name.trim().toLowerCase()) return true;
  return false;
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { formatMoney, currency } = useStoreConfig();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    let active = true;
    getCustomer(params.id).then((found) => {
      if (!active) return;
      setCustomer(found);
      setLoading(false);
    });
    const stopOrders = watchOrders(setOrders);
    const stopQuotations = watchQuotations(setQuotations);
    const stopReceipts = watchReceipts(setReceipts);
    return () => {
      active = false;
      stopOrders();
      stopQuotations();
      stopReceipts();
    };
  }, [params.id]);

  const customerOrders = useMemo(
    () => (customer ? orders.filter((o) => orderMatchesCustomer(o, customer)) : []),
    [orders, customer],
  );
  const customerQuotations = useMemo(
    () => (customer ? quotations.filter((q) => sameCustomer(customer, q)) : []),
    [quotations, customer],
  );
  const customerReceipts = useMemo(
    () => (customer ? receipts.filter((r) => sameCustomer(customer, r)) : []),
    [receipts, customer],
  );

  if (loading) return <div className="dashboard-stack"><Loading label="Loading customer…" /></div>;
  if (!customer)
    return (
      <div className="dashboard-stack">
        <div className="empty-state compact">
          <h3>Customer not found</h3>
          <Link className="button button-primary" href="/customers">Back to customers</Link>
        </div>
      </div>
    );

  const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const outstanding = customerReceipts
    .reduce((sum, r) => sum + Math.max((r.total ?? r.amount ?? 0) - (r.amountPaid ?? r.amount ?? 0), 0), 0);

  return (
    <div className="dashboard-stack">
      <Link href="/customers" className="text-link">
        <ArrowLeft size={16} /> Back to customers
      </Link>

      <section className="dashboard-welcome" style={{ justifyContent: "space-between" }}>
        <div>
          <span>Customer</span>
          <h2>{customer.name}</h2>
          <p>
            {customer.phone || "No phone"} {customer.email ? `· ${customer.email}` : ""}
            {customer.deliveryLocation ? ` · ${customer.deliveryLocation}` : ""}
          </p>
          <p style={{ fontSize: ".75rem", marginTop: 4 }}>
            Customer since {formatDate(customer.dateRegistered || customer.createdAt)} · Status:{" "}
            {customer.status || "active"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {customer.phone && (
            <a className="button button-secondary button-small" href={phoneHref(customer.phone)}>
              <Phone size={15} /> Call
            </a>
          )}
          {customer.phone && (
            <a
              className="button button-whatsapp button-small"
              href={whatsappHref(BUSINESS.whatsappLink, `Hello ${customer.name},`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageSquareText size={15} /> WhatsApp
            </a>
          )}
        </div>
      </section>

      <div className="customer-summary">
        <div className="customer-summary-card">
          <UserRound size={18} />
          <strong>{customerOrders.length}</strong>
          <small>Orders</small>
        </div>
        <div className="customer-summary-card">
          <CreditCard size={18} />
          <strong>{money(totalSpent)}</strong>
          <small>Total spent</small>
        </div>
        <div className="customer-summary-card">
          <FileText size={18} />
          <strong>{customerQuotations.length}</strong>
          <small>Quotations</small>
        </div>
        <div className="customer-summary-card">
          <ReceiptIcon size={18} />
          <strong>{customerReceipts.length}</strong>
          <small>Receipts</small>
        </div>
        <div className="customer-summary-card">
          <ShoppingBag size={18} />
          <strong>{money(outstanding)}</strong>
          <small>Outstanding balance</small>
        </div>
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Customer history tabs">
        <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          Orders ({customerOrders.length})
        </button>
        <button
          type="button"
          className={tab === "quotations" ? "active" : ""}
          onClick={() => setTab("quotations")}
        >
          Quotations ({customerQuotations.length})
        </button>
        <button
          type="button"
          className={tab === "receipts" ? "active" : ""}
          onClick={() => setTab("receipts")}
        >
          Receipts ({customerReceipts.length})
        </button>
      </div>

      {tab === "orders" &&
        (customerOrders.length ? (
          <div className="dashboard-panel people-panel">
            <div className="admin-product-table" style={{ minWidth: 860 }}>
              <div className="table-head" style={{ gridTemplateColumns: "1fr 1fr .7fr .7fr .8fr auto" }}>
                <span>Order</span>
                <span>Date</span>
                <span>Total</span>
                <span>Payment</span>
                <span>Status</span>
                <span />
              </div>
              {customerOrders.map((o) => (
                <article key={o.id} style={{ gridTemplateColumns: "1fr 1fr .7fr .7fr .8fr auto" }}>
                  <span>
                    <Link href={`/orders/${o.id}`} style={{ color: "inherit", fontWeight: 700 }}>
                      {o.reference}
                    </Link>
                    <small>{FULFILLMENT_LABELS[o.fulfillment]}</small>
                  </span>
                  <span>{formatDate(o.createdAt, true)}</span>
                  <span>{formatMoney(o.total)}</span>
                  <span>{PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus}</span>
                  <span>
                    <StatusBadge status={o.status} />
                  </span>
                  <span className="row-actions">
                    <a
                      className="icon-button"
                      title="Receipt"
                      href={`/api/orders/${o.id}/receipt?reference=${encodeURIComponent(o.reference)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ReceiptIcon size={16} />
                    </a>
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Orders placed by this customer will appear here." />
        ))}

      {tab === "quotations" &&
        (customerQuotations.length ? (
          <div className="dashboard-panel people-panel">
            <div className="admin-product-table" style={{ minWidth: 860 }}>
              <div className="table-head" style={{ gridTemplateColumns: "1fr .8fr .7fr .8fr auto" }}>
                <span>Quotation</span>
                <span>Date</span>
                <span>Total</span>
                <span>Status</span>
                <span />
              </div>
              {customerQuotations.map((q) => (
                <article key={q.id} style={{ gridTemplateColumns: "1fr .8fr .7fr .8fr auto" }}>
                  <span>
                    <strong>{q.quotationNumber}</strong>
                    <small>{q.items?.length || 0} items</small>
                  </span>
                  <span>{formatDisplayDate(q.date)}</span>
                  <span>{formatMoney(q.total)}</span>
                  <span>
                    <StatusBadge status={normalizeQuotationStatus(q.status)} />
                  </span>
                  <span className="row-actions">
                    <button
                      className="icon-button"
                      title={`Print / view (${quotationStatusLabel(q.status)})`}
                      onClick={() =>
                        openPrintableDocument({
                          ...buildQuotationDocumentInput(q, currency),
                          backHref: "/customers",
                          backLabel: "Back to customers",
                        })
                      }
                    >
                      <FileText size={16} />
                    </button>
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No quotations yet"
            description="Quotations created for this customer (matched by customer record, phone or name) will appear here."
          />
        ))}

      {tab === "receipts" &&
        (customerReceipts.length ? (
          <div className="dashboard-panel people-panel">
            <div className="admin-product-table" style={{ minWidth: 860 }}>
              <div className="table-head" style={{ gridTemplateColumns: "1fr .8fr .7fr .7fr .8fr auto" }}>
                <span>Receipt</span>
                <span>Date</span>
                <span>Paid</span>
                <span>Balance</span>
                <span>Payment</span>
                <span />
              </div>
              {customerReceipts.map((r) => {
                const balance = Math.max((r.total ?? r.amount ?? 0) - (r.amountPaid ?? r.amount ?? 0), 0);
                return (
                  <article key={r.id} style={{ gridTemplateColumns: "1fr .8fr .7fr .7fr .8fr auto" }}>
                    <span>
                      <strong>{r.receiptNumber}</strong>
                      <small>{r.orderNumber || r.quotationNumber || "walk-in"}</small>
                    </span>
                    <span>{formatDisplayDate(r.date)}</span>
                    <span>{formatMoney(r.amountPaid ?? r.amount ?? 0)}</span>
                    <span style={{ color: balance > 0 ? "var(--danger, #a34428)" : "var(--green-700)", fontWeight: 700 }}>
                      {balance > 0 ? formatMoney(balance) : "Paid"}
                    </span>
                    <span>
                      <small>{r.paymentMethod}</small>
                    </span>
                    <span className="row-actions">
                      <button
                        className="icon-button"
                        title="Print / view receipt"
                        onClick={() =>
                          openPrintableDocument({
                            ...buildReceiptDocumentInput(r, currency),
                            backHref: "/customers",
                            backLabel: "Back to customers",
                          })
                        }
                      >
                        <ReceiptIcon size={16} />
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
            title="No receipts yet"
            description="Receipts issued to this customer will appear here, including signatures and balances."
          />
        ))}
    </div>
  );
}
