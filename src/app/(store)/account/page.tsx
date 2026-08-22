"use client";

import Link from "next/link";
import {
  Bell,
  Download,
  FileText,
  LayoutDashboard,
  PackageSearch,
  Pencil,
  ReceiptText,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { useToast } from "@/contexts/ToastContext";
import { ChangePassword } from "@/components/auth/ChangePassword";
import { getMyOrders, getMyQuotations, getMyReceipts, updateStaffProfile } from "@/lib/firebase/data";
import { BUSINESS } from "@/lib/constants";
import { printCustomerDocument } from "@/lib/farmReports";
import { listLocalOrders } from "@/lib/store";
import { cn, formatDate, formatDisplayDate, friendlyError } from "@/lib/utils";
import type { Order, Quotation, Receipt } from "@/types";

type AccountTab = "orders" | "quotations" | "receipts" | "documents" | "notifications" | "security";

export default function AccountPage() {
  const { user, firebaseUser, loading: authLoading, isStaff } = useAuth();
  const { formatMoney } = useStoreConfig();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AccountTab>("orders");
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([getMyOrders(user.email), getMyQuotations(user.email), getMyReceipts(user.email)])
      .then(([remoteOrders, quotationList, receiptList]) => {
        const local = listLocalOrders();
        const merged = [...remoteOrders, ...local.filter((item) => !remoteOrders.some((remote) => remote.reference === item.reference))];
        setOrders(merged);
        setQuotations(quotationList);
        setReceipts(receiptList);
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const notifications = useMemo(() => [
    ...orders.filter((order) => !["completed", "cancelled"].includes(order.status)).map((order) => ({ id: `order-${order.id}`, title: `Order ${order.reference}`, detail: `Your order is ${order.status.replace(/-/g, " ")}.`, date: order.updatedAt || order.createdAt })),
    ...quotations.filter((quotation) => !["rejected", "converted"].includes(quotation.status || "draft")).map((quotation) => ({ id: `quote-${quotation.id}`, title: `Quotation ${quotation.quotationNumber}`, detail: `Quotation status: ${quotation.status || "draft"}.`, date: quotation.updatedAt || quotation.createdAt })),
  ], [orders, quotations]);

  const openProfile = () => {
    setProfile({ fullName: user?.fullName || "", phone: user?.phone || "" });
    setEditing(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateStaffProfile(user.uid, { fullName: profile.fullName.trim(), phone: profile.phone.trim(), title: user.title });
      showToast("Profile updated.", "success");
      setEditing(false);
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="page-shell"><Loading label="Loading your account…" /></div>;
  if (!user) return <section className="account-signin-state page-shell"><span><UserRound size={28} /></span><h1>Your farm account</h1><p>Sign in to see your profile, orders, quotations, receipts, documents and notifications.</p><Link className="button button-primary" href="/login?next=/account">Sign in</Link></section>;

  const tabs: Array<{ value: AccountTab; label: string; icon: typeof PackageSearch; count: number }> = [
    { value: "orders", label: "Orders", icon: PackageSearch, count: orders.length },
    { value: "quotations", label: "Quotations", icon: FileText, count: quotations.length },
    { value: "receipts", label: "Receipts", icon: ReceiptText, count: receipts.length },
    { value: "documents", label: "Documents", icon: Download, count: quotations.length + receipts.length },
    { value: "notifications", label: "Notifications", icon: Bell, count: notifications.length },
    { value: "security", label: "Security", icon: ShieldCheck, count: 0 },
  ];

  return (
    <div className="page-shell customer-account">
      <section className="customer-account-hero">
        <div className="customer-account-profile"><span>{user.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><small>Registered customer</small><h1>{user.fullName}</h1><p>{user.email} · {user.phone || "No phone added"}</p></div></div>
        <div className="customer-account-actions"><button className="button button-secondary" onClick={openProfile}><Pencil size={16} /> Edit profile</button>{isStaff && <Link className="button button-primary" href="/dashboard"><LayoutDashboard size={16} /> Farm workspace</Link>}</div>
      </section>

      {firebaseUser && !firebaseUser.emailVerified && <div className="customer-verification-note"><ShieldCheck size={18} /><div><strong>Verify your email to unlock issued documents</strong><p>We sent a verification link to {firebaseUser.email}. Your profile and orders placed on this device remain available now.</p></div></div>}

      <nav className="customer-account-tabs" aria-label="Account sections">{tabs.map((item) => { const Icon = item.icon; return <button key={item.value} className={cn(tab === item.value && "active")} onClick={() => setTab(item.value)}><Icon size={16} /><span>{item.label}</span>{item.count > 0 && <small>{item.count}</small>}</button>; })}</nav>

      {loading ? <Loading label="Loading your records…" /> : (
        <section className="customer-account-panel">
          {tab === "orders" && <><header><div><h2>My orders</h2><p>Orders placed with {"The Branch Farm"} from this account or device.</p></div><Link className="button button-primary button-small" href="/shop">Shop now</Link></header>{orders.length ? <div className="customer-document-list">{orders.map((order) => <article key={order.id}><span><PackageSearch size={19} /></span><div><small>{formatDate(order.createdAt)} · {order.fulfillment}</small><strong>{order.reference}</strong><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p></div><em className={`status-badge status-${order.status}`}>{order.status}</em><b>{formatMoney(order.total)}</b><Link className="button button-secondary button-small" href={`/order/${order.reference}`}>View</Link></article>)}</div> : <AccountEmpty icon={PackageSearch} title="No orders yet" text="When you place an order, it will appear here and on your order tracker." />}</>}

          {tab === "quotations" && <><header><div><h2>My quotations</h2><p>Formal quotations issued to your registered email address.</p></div></header>{quotations.length ? <div className="customer-document-list">{quotations.map((quotation) => <article key={quotation.id}><span><FileText size={19} /></span><div><small>{formatDisplayDate(quotation.date)}</small><strong>{quotation.quotationNumber}</strong><p>{quotation.items.map((item) => item.name).join(", ")}</p></div><em className={`status-badge status-${quotation.status || "draft"}`}>{quotation.status || "draft"}</em><b>{formatMoney(quotation.total)}</b><button className="button button-secondary button-small" onClick={() => printCustomerDocument({ kind: "quotation", reference: quotation.quotationNumber, date: quotation.date, customer: quotation.customer, items: quotation.items, total: quotation.total, balance: quotation.balance, status: quotation.status, notes: quotation.notes })}><Download size={14} /> PDF</button></article>)}</div> : <AccountEmpty icon={FileText} title="No quotations" text="Quotations issued to your account email will be available here." />}</>}

          {tab === "receipts" && <><header><div><h2>My receipts</h2><p>Receipts issued to your registered email address.</p></div></header>{receipts.length ? <div className="customer-document-list">{receipts.map((receipt) => <article key={receipt.id}><span><ReceiptText size={19} /></span><div><small>{formatDisplayDate(receipt.date)}</small><strong>{receipt.receiptNumber}</strong><p>{receipt.description || receipt.orderNumber || "Farm purchase"}</p></div><em className="status-badge status-paid">receipt</em><b>{formatMoney(receipt.total ?? receipt.amount)}</b><button className="button button-secondary button-small" onClick={() => printCustomerDocument({ kind: "receipt", reference: receipt.receiptNumber, date: receipt.date, customer: receipt.customer, items: receipt.items || [{ name: receipt.description || "Payment", quantity: 1, price: receipt.total ?? receipt.amount }], total: receipt.total ?? receipt.amount, amountPaid: receipt.amountPaid ?? receipt.amount, balance: receipt.balance, status: receipt.balance ? "Balance due" : "Paid", notes: receipt.notes })}><Download size={14} /> PDF</button></article>)}</div> : <AccountEmpty icon={ReceiptText} title="No receipts" text="Receipts issued to your account email will be available here." />}</>}

          {tab === "documents" && <><header><div><h2>My documents</h2><p>Downloadable business documents in one place.</p></div></header>{quotations.length + receipts.length ? <div className="customer-file-grid">{quotations.map((quotation) => <button key={quotation.id} onClick={() => printCustomerDocument({ kind: "quotation", reference: quotation.quotationNumber, date: quotation.date, customer: quotation.customer, items: quotation.items, total: quotation.total, balance: quotation.balance, status: quotation.status, notes: quotation.notes })}><FileText size={21} /><span><strong>{quotation.quotationNumber}</strong><small>Quotation · {formatDisplayDate(quotation.date)}</small></span><Download size={15} /></button>)}{receipts.map((receipt) => <button key={receipt.id} onClick={() => printCustomerDocument({ kind: "receipt", reference: receipt.receiptNumber, date: receipt.date, customer: receipt.customer, items: receipt.items || [], total: receipt.total ?? receipt.amount, amountPaid: receipt.amountPaid ?? receipt.amount, balance: receipt.balance, notes: receipt.notes })}><ReceiptText size={21} /><span><strong>{receipt.receiptNumber}</strong><small>Receipt · {formatDisplayDate(receipt.date)}</small></span><Download size={15} /></button>)}</div> : <AccountEmpty icon={Download} title="No documents" text="Your quotations and receipts will be collected here automatically." />}</>}

          {tab === "notifications" && <><header><div><h2>Notifications</h2><p>Current order and document status updates.</p></div></header>{notifications.length ? <div className="customer-notification-list">{notifications.map((notification) => <article key={notification.id}><span><Bell size={16} /></span><div><strong>{notification.title}</strong><p>{notification.detail}</p><small>{formatDate(notification.date, true)}</small></div></article>)}</div> : <AccountEmpty icon={Bell} title="You are all caught up" text="New order and document updates will appear here." />}</>}

          {tab === "security" && <><header><div><h2>Change password</h2><p>Update the password you use to sign in to your {BUSINESS.name} account.</p></div></header><ChangePassword compact /><div className="customer-account-security"><ShieldCheck size={18} /><p>Only you can change your password. The new password works immediately the next time you sign in.</p></div></>}
        </section>
      )}

      <div className="customer-account-security"><ShieldCheck size={18} /><p>Farm-management records are private. Your registered account can only read commerce documents issued to your own verified email.</p></div>

      {editing && <div className="modal-layer"><button className="modal-scrim" onClick={() => setEditing(false)} /><div className="record-modal small-modal"><header><div><span className="eyebrow">Customer profile</span><h2>Edit profile</h2></div><button className="icon-button" onClick={() => setEditing(false)}><X size={20} /></button></header><form className="dashboard-stack" style={{ padding: 22 }} onSubmit={saveProfile}><label className="field"><span>Full name</span><input value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} required /></label><label className="field"><span>Phone</span><input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} required /></label><label className="field"><span>Account email</span><input value={user.email} disabled /></label><div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setEditing(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div></form></div></div>}
    </div>
  );
}

function AccountEmpty({ icon: Icon, title, text }: { icon: typeof PackageSearch; title: string; text: string }) {
  return <div className="customer-account-empty"><span><Icon size={25} /></span><h3>{title}</h3><p>{text}</p></div>;
}
