"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Egg,
  HeartPulse,
  Milk,
  Package,
  PawPrint,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { ChangePassword } from "@/components/auth/ChangePassword";
import {
  watchAllProducts,
  watchAnimals,
  watchAuditTrail,
  watchFarmOperations,
  watchHealthRecords,
  watchOrders,
} from "@/lib/firebase/data";
import { displayAuthor, formatDate, formatDisplayDate, initials } from "@/lib/utils";
import type { Animal, AuditEvent, FarmOperationRecord, HealthRecord, Order, Product } from "@/types";
import { BUSINESS } from "@/lib/constants";

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { formatMoney } = useStoreConfig();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [operations, setOperations] = useState<FarmOperationRecord[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const stops = [
      watchAnimals(setAnimals),
      watchHealthRecords(null, setHealth),
      watchFarmOperations(null, setOperations),
      watchAuditTrail(setAudit, 100),
      watchOrders(setOrders),
      watchAllProducts(setProducts),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 30);
  const upcomingIso = upcomingDate.toISOString().slice(0, 10);

  const attentionAnimals = animals.filter((animal) => ["sick", "injured", "under-observation"].includes(animal.healthStatus));
  const vaccinationsDue = health.filter((record) => record.type === "vaccination" && record.nextDate && record.nextDate <= upcomingIso);
  const overdueVaccinations = vaccinationsDue.filter((record) => record.nextDate && record.nextDate < today);
  const birthsThisMonth = operations.filter((record) => record.module === "birth" && record.date.startsWith(month));
  const feedLow = operations.filter((record) => record.module === "feed" && record.status === "low");
  const openIncidents = operations.filter((record) => record.module === "incident" && !["resolved", "closed"].includes(record.status));
  const pendingTasks = operations.filter((record) => record.module === "task" && !["completed", "cancelled"].includes(record.status));
  const equipmentIssues = operations.filter((record) => (record.module === "equipment" && ["needs-attention", "out-of-service"].includes(record.status)) || (record.module === "maintenance" && !["completed", "unrepairable"].includes(record.status)));
  const pendingReviews = operations.filter((record) => record.reviewStatus === "pending");

  const stats = [
    { label: "Animals", value: animals.length, icon: PawPrint, href: "/animals", tone: "normal" },
    { label: "Sick / attention", value: attentionAnimals.length, icon: HeartPulse, href: "/health", tone: attentionAnimals.length ? "danger" : "good" },
    { label: "Vaccinations due", value: vaccinationsDue.length, icon: Stethoscope, href: "/health", tone: overdueVaccinations.length ? "danger" : vaccinationsDue.length ? "warning" : "good" },
    { label: "Births this month", value: birthsThisMonth.length, icon: Egg, href: "/births", tone: "normal" },
    { label: "Feed low", value: feedLow.length, icon: Package, href: "/feed", tone: feedLow.length ? "warning" : "good" },
    { label: "Open problems", value: openIncidents.length, icon: AlertTriangle, href: "/incidents", tone: openIncidents.length ? "danger" : "good" },
    { label: "Pending tasks", value: pendingTasks.length, icon: ClipboardCheck, href: "/tasks", tone: pendingTasks.length ? "warning" : "good" },
    { label: "Equipment issues", value: equipmentIssues.length, icon: Wrench, href: "/maintenance", tone: equipmentIssues.length ? "warning" : "good" },
  ];

  const criticalItems = (() => {
    const items: Array<{ title: string; detail: string; href: string; tone: "critical" | "warning" }> = [];
    openIncidents.filter((item) => ["critical", "high"].includes(item.priority || "")).slice(0, 3).forEach((item) => items.push({ title: item.title, detail: `${item.priority} incident · ${item.reference}`, href: "/incidents", tone: "critical" }));
    attentionAnimals.slice(0, 2).forEach((animal) => items.push({ title: animal.name || animal.animalId, detail: `${animal.healthStatus.replace(/-/g, " ")} · ${animal.location}`, href: `/animals/${animal.id}`, tone: "critical" }));
    overdueVaccinations.slice(0, 2).forEach((record) => items.push({ title: record.animalLabel || record.animalId, detail: `Vaccination overdue since ${formatDisplayDate(record.nextDate)}`, href: "/health", tone: "critical" }));
    pendingTasks.filter((task) => task.dueDate && task.dueDate < today).slice(0, 2).forEach((task) => items.push({ title: task.title, detail: `Task overdue · due ${formatDisplayDate(task.dueDate)}`, href: "/tasks", tone: "warning" }));
    feedLow.slice(0, 2).forEach((item) => items.push({ title: item.title, detail: `Feed stock at ${String(item.values.remaining ?? 0)} ${String(item.values.unit || "units")}`, href: "/feed", tone: "warning" }));
    return items.slice(0, 6);
  })();

  const milkThisMonth = operations.filter((item) => item.module === "milk" && item.date.startsWith(month)).reduce((sum, item) => sum + Number(item.values.totalProduction || 0), 0);
  const eggsThisMonth = operations.filter((item) => item.module === "eggs" && item.date.startsWith(month)).reduce((sum, item) => sum + Number(item.values.eggsCollected || 0), 0);
  const expensesThisMonth = operations.filter((item) => item.module === "expense" && item.date.startsWith(month)).reduce((sum, item) => sum + Number(item.values.amount || 0), 0);
  const lowShopStock = products.filter((product) => product.trackInventory && product.stock <= 5 && product.active);

  return (
    <div className="dashboard-stack farm-command-center">
      <section className="farm-command-hero">
        <div>
          <span>{isAdmin ? "Remote farm oversight" : "Today's farm operations"}</span>
          <h2>Good day, {user?.fullName?.split(" ")[0] || (isAdmin ? "admin" : "team")}.</h2>
          <p>{isAdmin ? "Monitor the whole farm, review staff records and respond to problems from wherever you are." : "Record the work as it happens so management always has a complete, trustworthy picture."}</p>
        </div>
        <div className="command-hero-actions">
          <Link href="/incidents" className="button command-alert-action"><AlertTriangle size={17} /> Report a problem</Link>
          <Link href="/daily-log" className="button button-small command-log-action"><Activity size={15} /> Daily farm log</Link>
        </div>
      </section>

      <section className="farm-overview-heading"><div><span className="eyebrow">Live farm overview</span><h2>What needs your attention</h2></div><small>Updated from staff records</small></section>
      <section className="farm-command-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <Link href={stat.href} key={stat.label} className={`command-stat command-stat-${stat.tone}`}><span><Icon size={20} /></span><div><small>{stat.label}</small><strong>{stat.value}</strong></div><ArrowRight size={15} /></Link>;
        })}
      </section>

      {isAdmin && pendingReviews.length > 0 && (
        <section className="review-alert-bar"><ShieldCheck size={19} /><div><strong>{pendingReviews.length} record{pendingReviews.length === 1 ? " is" : "s are"} waiting for management review</strong><p>Expenses, acquisitions and animal movements remain visibly pending until an administrator approves or returns them.</p></div><Link href="/reports" className="button button-small">Review records <ArrowRight size={14} /></Link></section>
      )}

      <section className="dashboard-two-columns command-main-columns">
        <div className="dashboard-panel command-attention-panel">
          <div className="section-row"><div><span className="eyebrow">Priority watch</span><h2>Attention required</h2><p>Health, incidents, overdue work and low feed.</p></div><Link className="text-link" href="/incidents">All problems</Link></div>
          {criticalItems.length ? <div className="command-alert-list">{criticalItems.map((item, index) => <Link href={item.href} key={`${item.title}-${index}`}><span className={`command-alert-dot ${item.tone}`}><AlertTriangle size={14} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><ArrowRight size={14} /></Link>)}</div> : <div className="command-all-clear"><CheckCircle2 size={29} /><div><strong>No critical farm alerts</strong><p>There are no urgent health, incident, task or feed warnings right now.</p></div></div>}
        </div>

        <div className="dashboard-panel command-activity-panel">
          <div className="section-row"><div><span className="eyebrow">Who · what · when</span><h2>Recent staff activity</h2><p>Live accountability feed from the audit trail.</p></div>{isAdmin && <Link className="text-link" href="/audit">Full audit</Link>}</div>
          {audit.length ? <div className="command-activity-feed">{audit.slice(0, 7).map((event) => { const author = displayAuthor(event.createdByName); return <article key={event.id}><span>{initials(author)}</span><div><p><strong>{author}</strong> {event.description.charAt(0).toLowerCase() + event.description.slice(1)}</p><small>{formatDate(event.createdAt, true)} · {event.action.replace(/-/g, " ")}</small></div></article>; })}</div> : <div className="command-empty-feed"><Activity size={24} /><p>Staff actions will appear here as farm records are added and updated.</p></div>}
        </div>
      </section>

      <section className="dashboard-panel production-snapshot-panel">
        <div className="section-row"><div><span className="eyebrow">Current month</span><h2>Production & cost snapshot</h2><p>At-a-glance totals from operational records.</p></div><Link className="text-link" href="/reports">Open report center</Link></div>
        <div className="production-snapshot-grid">
          <Link href="/milk-production"><span><Milk size={21} /></span><div><small>Milk produced</small><strong>{milkThisMonth.toLocaleString("en-SZ")} L</strong></div></Link>
          <Link href="/egg-production"><span><Egg size={21} /></span><div><small>Eggs collected</small><strong>{eggsThisMonth.toLocaleString("en-SZ")}</strong></div></Link>
          <Link href="/expenses"><span><ReceiptText size={21} /></span><div><small>Farm expenses</small><strong>{formatMoney(expensesThisMonth)}</strong></div></Link>
          <Link href="/inventory"><span><Boxes size={21} /></span><div><small>Low inventory / feed</small><strong>{operations.filter((item) => ["feed", "inventory"].includes(item.module) && item.status === "low").length}</strong></div></Link>
        </div>
      </section>

      <section className="dashboard-panel command-quick-panel">
        <div className="section-row"><div><span className="eyebrow">Common work</span><h2>Quick actions</h2></div></div>
        <div className="command-quick-grid">
          <Link href="/animals/new"><span><PawPrint size={18} /></span><strong>Add animal</strong><small>Permanent profile</small></Link>
          <Link href="/births"><span><Egg size={18} /></span><strong>Record birth</strong><small>Create newborn profile</small></Link>
          <Link href="/health"><span><Stethoscope size={18} /></span><strong>Health record</strong><small>Vaccination or treatment</small></Link>
          <Link href="/weights"><span><CalendarClock size={18} /></span><strong>Record weight</strong><small>Update growth history</small></Link>
          <Link href="/feed"><span><Package size={18} /></span><strong>Feed usage</strong><small>Received or used</small></Link>
          <Link href="/milk-production"><span><Milk size={18} /></span><strong>Milk production</strong><small>Morning and evening</small></Link>
          <Link href="/expenses"><span><ReceiptText size={18} /></span><strong>Add expense</strong><small>Attach receipt</small></Link>
          <Link href="/daily-log"><span><Activity size={18} /></span><strong>Daily farm log</strong><small>Complete daily picture</small></Link>
        </div>
      </section>

      <section className="dashboard-panel command-commerce-panel">
        <div className="section-row"><div><span className="eyebrow">Storefront activity</span><h2>Orders & shop stock</h2><p>Farm operations are central; customer commerce remains available here.</p></div><Link className="text-link" href="/orders">View orders</Link></div>
        <div className="command-commerce-summary">
          <div><ShoppingBag size={18} /><span><small>Open orders</small><strong>{orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length}</strong></span></div>
          <div><Package size={18} /><span><small>Shop stock alerts</small><strong>{lowShopStock.length}</strong></span></div>
          <div><ReceiptText size={18} /><span><small>Latest order</small><strong>{orders[0]?.reference || "—"}</strong></span></div>
          <Link className="button button-secondary button-small" href="/products"><Plus size={15} /> Manage products</Link>
        </div>
      </section>

      {!isAdmin && (
        <section className="dashboard-panel command-commerce-panel">
          <div className="section-row"><div><span className="eyebrow">Account security</span><h2>Change password</h2><p>Update your own staff sign-in password.</p></div></div>
          <ChangePassword compact />
        </section>
      )}

      <p className="command-data-note"><ShieldCheck size={14} /> {BUSINESS.name}: staff operate and record; administrators monitor, review, investigate and report.</p>
    </div>
  );
}
