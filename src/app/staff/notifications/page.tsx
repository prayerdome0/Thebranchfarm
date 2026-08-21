"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getStaffNotifications, markNotificationRead } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { AppNotification } from "@/types";

export default function StaffNotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getStaffNotifications().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); }, []);
  const read = async (item: AppNotification) => { if (!item.read) { await markNotificationRead(item.id).catch(() => {}); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry)); } };
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Operational notifications</h2><p>New orders and farm alerts relevant to staff permissions.</p></div><span className="unread-count">{items.filter((item) => !item.read).length} unread</span></section><section className="dashboard-panel">{loading ? <div className="loading-state"><i className="loader" /> Loading staff alerts…</div> : items.length ? <div className="notification-list">{items.map((item) => <button key={item.id} className={item.read ? "" : "unread"} onClick={() => read(item)}><span><Bell size={19} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatDate(item.createdAt, true)}</small></div>{item.link ? <Link href={item.link} onClick={(event) => event.stopPropagation()}>Open</Link> : item.read ? <CheckCheck size={17} /> : <i />}</button>)}</div> : <EmptyState icon={Bell} title="No staff alerts" description="New operational notifications will appear here." />}</section></div>;
}
