"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { getMyNotifications, markNotificationRead } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { AppNotification } from "@/types";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (user) getMyNotifications(user.uid).then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); }, [user]);
  const read = async (item: AppNotification) => { if (item.read) return; await markNotificationRead(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry)); };
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Notifications</h2><p>Order and document updates sent to your account.</p></div></section><section className="dashboard-panel">{loading ? <Loading label="Loading notifications…" /> : !items.length ? <EmptyState icon={Bell} title="All quiet for now" description="Updates about your orders and documents will appear here." /> : <div className="notification-list">{items.map((item) => <button onClick={() => read(item)} className={item.read ? "" : "unread"} key={item.id}><span><Bell size={19} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatDate(item.createdAt, true)}</small></div>{item.read ? <CheckCheck size={17} /> : <i />}</button>)}</div>}</section></div>;
}
