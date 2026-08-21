"use client";

import Link from "next/link";
import { Bell, CheckCheck, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getCollection, markNotificationRead } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { AppNotification } from "@/types";

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  useEffect(() => { getCollection<AppNotification>("notifications", 200).then(setItems).catch(() => setItems([])); }, []);
  const read = async (item: AppNotification) => { if (!item.read) { await markNotificationRead(item.id).catch(() => {}); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry)); } };
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Notification center</h2><p>Business, order, inventory and farm activity alerts.</p></div><span className="unread-count">{items.filter((item) => !item.read).length} unread</span></section><section className="dashboard-panel"><div className="notification-list admin-notification-list">{items.map((item) => <button key={item.id} onClick={() => read(item)} className={!item.read ? "unread" : ""}><span><Bell size={19} /></span><div><small>{item.type}</small><strong>{item.title}</strong><p>{item.body}</p><em>{formatDate(item.createdAt, true)}</em></div>{item.link ? <Link href={item.link} onClick={(e) => e.stopPropagation()}>Open</Link> : item.read ? <CheckCheck size={17} /> : <i />}</button>)}{!items.length && <div className="empty-state compact"><span className="empty-icon"><Bell size={24} /></span><h3>No notifications yet</h3><p>New orders and operational alerts will appear here.</p></div>}</div></section></div>;
}
