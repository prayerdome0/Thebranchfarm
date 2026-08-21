"use client";

import { ScrollText, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCollection } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { TimestampValue } from "@/types";

interface Audit { id: string; action: string; actorId?: string; actorName?: string; actorRole?: string; targetType?: string; targetId?: string; before?: unknown; after?: unknown; details?: Record<string, unknown>; timestamp?: TimestampValue; createdAt?: TimestampValue; }
export default function AuditPage() {
  const [items, setItems] = useState<Audit[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => { getCollection<Audit>("auditLogs", 300, "timestamp").then(setItems).catch(() => setItems([])); }, []);
  const visible = useMemo(() => items.filter((item) => !search || JSON.stringify(item).toLowerCase().includes(search.toLowerCase())), [items, search]);
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Audit history</h2><p>Accountable records for security, marketplace, documents and farm changes.</p></div></section><div className="audit-security"><ShieldCheck size={21} /><div><strong>Append-only business history</strong><p>Clients can read permitted logs, but cannot edit or delete them. Secure functions write privileged events.</p></div></div><section className="dashboard-panel audit-panel"><label className="search-field"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action, person or reference" /></label><div className="audit-list">{visible.map((item) => <article key={item.id}><span><ScrollText size={18} /></span><div><div><strong>{item.action.replaceAll("_", " ")}</strong><em>{item.actorRole || "system"}</em></div><p>{item.actorName || item.actorId || "Secure system"}{item.targetType && <> changed <b>{item.targetType}</b></>}{item.targetId && <> · {item.targetId}</>}</p>{Boolean(item.before !== undefined || item.after !== undefined) && <small>FROM: {summary(item.before)} → TO: {summary(item.after)}</small>}</div><time>{formatDate(item.timestamp || item.createdAt, true)}</time></article>)}{!visible.length && <div className="panel-empty-copy">No matching audit events are visible.</div>}</div></section></div>;
}
function summary(value: unknown) { if (value == null) return "—"; if (typeof value === "string" || typeof value === "number") return String(value); const text = JSON.stringify(value); return text.length > 90 ? `${text.slice(0, 87)}…` : text; }
