"use client";

import { Download, Fingerprint, History, Search, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { watchAuditTrail } from "@/lib/firebase/data";
import { printFarmReport } from "@/lib/farmReports";
import { cn, formatDate } from "@/lib/utils";
import type { AuditEvent } from "@/types";

export default function AuditPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  useEffect(() => watchAuditTrail((list) => { setEvents(list); setLoading(false); }, 1500), []);

  const actions = useMemo(() => Array.from(new Set(events.map((event) => event.action))), [events]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      if (action !== "all" && event.action !== action) return false;
      if (!term) return true;
      return [event.createdByName, event.entityLabel, event.entityType, event.description, event.module]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });
  }, [events, search, action]);

  const today = new Date().toISOString().slice(0, 10);
  const eventsToday = events.filter((event) => {
    const value = event.createdAt;
    const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : value && "seconds" in value ? new Date(value.seconds * 1000) : null;
    return date?.toISOString().slice(0, 10) === today;
  });
  const users = new Set(events.map((event) => event.createdBy).filter(Boolean));

  const exportAudit = () => printFarmReport({
    title: "Audit Trail Report",
    subtitle: "Immutable Who → What → When history across farm operations",
    columns: [{ key: "date", label: "Date / time" }, { key: "staff", label: "Staff member" }, { key: "action", label: "Action" }, { key: "record", label: "Record" }, { key: "description", label: "Description" }],
    rows: visible.map((event) => ({ date: formatDate(event.createdAt, true), staff: event.createdByName, action: event.action, record: event.entityLabel, description: event.description })),
    totals: [{ label: "Audit events", value: String(visible.length) }, { label: "Staff represented", value: String(users.size) }, { label: "Events today", value: String(eventsToday.length) }],
    generatedBy: user?.fullName,
  });

  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="dashboard-stack audit-center">
        <section className="audit-hero">
          <div><span className="eyebrow">Administrator only</span><h2>Audit Trail</h2><p>A permanent accountability ledger. See exactly who created, updated, approved, rejected, archived or deleted a record — and when.</p></div>
          <span className="audit-lock"><Fingerprint size={30} /></span>
        </section>

        <section className="operation-stat-grid">
          <article><span><History size={20} /></span><div><small>Audit events</small><strong>{events.length}</strong></div></article>
          <article><span><UserRound size={20} /></span><div><small>Staff represented</small><strong>{users.size}</strong></div></article>
          <article><span><ShieldCheck size={20} /></span><div><small>Events today</small><strong>{eventsToday.length}</strong></div></article>
          <article><span><Fingerprint size={20} /></span><div><small>Editable events</small><strong>0</strong></div></article>
        </section>

        <section className="dashboard-panel audit-panel">
          <div className="operation-toolbar">
            <div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff, record, module or action…" /></div>
            <select value={action} onChange={(event) => setAction(event.target.value)}><option value="all">All actions</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <button className="button button-secondary" onClick={exportAudit}><Download size={16} /> Export</button>
          </div>
          {loading ? <Loading label="Loading audit trail…" /> : visible.length ? (
            <div className="audit-timeline">
              {visible.map((event) => (
                <article key={event.id}>
                  <span className={cn("audit-event-icon", `audit-${event.action}`)}><Fingerprint size={16} /></span>
                  <div className="audit-event-copy"><small>{formatDate(event.createdAt, true)} · {event.entityType.replace(/-/g, " ")}</small><strong>{event.description}</strong><p>Record: <b>{event.entityLabel}</b>{event.module ? ` · Module: ${event.module.replace(/-/g, " ")}` : ""}</p></div>
                  <div className="audit-event-person"><UserRound size={14} /><span><small>Action by</small><strong>{event.createdByName}</strong></span></div>
                  <span className={cn("audit-action-pill", `audit-${event.action}`)}>{event.action.replace(/-/g, " ")}</span>
                </article>
              ))}
            </div>
          ) : <EmptyState icon={Search} title="No matching audit events" description={events.length ? "Try a different search or action filter." : "Audit events appear automatically when farm records are created or changed."} />}
        </section>

        <div className="operation-accountability-note"><ShieldCheck size={18} /><div><strong>Append-only security</strong><p>Firestore policy allows authorized staff to append audit events as part of a record write. Update and delete are denied to everyone, including administrators.</p></div></div>
      </div>
    </ProtectedRoute>
  );
}
