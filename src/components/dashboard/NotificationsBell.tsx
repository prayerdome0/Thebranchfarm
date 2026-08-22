"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardCheck,
  ShoppingBag,
  Wallet,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { watchAllProducts, watchFarmOperations, watchOrders } from "@/lib/firebase/data";
import {
  deriveNotifications,
  type AppNotification,
  type NotificationTone,
} from "@/lib/notifications";
import type { FarmOperationRecord, Order, Product } from "@/types";

const READ_KEY = "tbf.notifications.read.v1";
const READ_LIMIT = 300;

const KIND_META: Record<AppNotification["kind"], { icon: LucideIcon; permission: string | null }> = {
  "order-new": { icon: ShoppingBag, permission: "Orders" },
  "order-unpaid": { icon: Wallet, permission: "Orders" },
  "stock-out": { icon: AlertTriangle, permission: "Products" },
  "stock-low": { icon: AlertTriangle, permission: "Products" },
  "incident-open": { icon: AlertTriangle, permission: "Farm Operations" },
  "task-overdue": { icon: ClipboardCheck, permission: "Farm Operations" },
  "ops-low-stock": { icon: Wheat, permission: "Farm Operations" },
};

const TONE_CLASS: Record<NotificationTone, string> = {
  success: "notification-dot-success",
  warning: "notification-dot-warning",
  critical: "notification-dot-critical",
  info: "notification-dot-info",
};

function loadReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-READ_LIMIT)));
  } catch {
    /* private mode / quota — read state simply won't persist */
  }
}

function timeAgo(at: number) {
  if (!at) return "";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/**
 * Live notification bell for the workspace: new orders, unpaid orders, stock
 * problems, open incidents and overdue tasks. Anything that needs attention
 * lands here the moment the data changes, and clicking an item opens the
 * exact record.
 */
export function NotificationsBell() {
  const { can, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [operations, setOperations] = useState<FarmOperationRecord[] | null>(null);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    // Local read-state only exists in the browser; the bell is rendered
    // client-side behind auth, so this initializer never runs on the server.
    if (typeof window === "undefined") return new Set();
    return loadReadIds();
  });
  const seenPendingOrders = useRef<Set<string> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stopOrders = watchOrders((list) => {
      setOrders(list);
      const pendingNow = new Set(list.filter((order) => order.status === "pending").map((order) => order.id));
      const previous = seenPendingOrders.current;
      if (previous) {
        for (const order of list) {
          if (order.status === "pending" && !previous.has(order.id)) {
            showToast(`🔔 New order ${order.reference} from ${order.customer.name}`, "success");
          }
        }
      }
      seenPendingOrders.current = pendingNow;
    });
    const stopProducts = watchAllProducts((list) => setProducts(list));
    const stopOperations = watchFarmOperations(null, (list) => setOperations(list));
    return () => {
      stopOrders();
      stopProducts();
      stopOperations();
    };
  }, [showToast]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const notifications = useMemo(() => {
    if (!orders || !products || !operations) return [];
    return deriveNotifications(orders, products, operations).filter((item) => {
      const permission = KIND_META[item.kind].permission;
      return isAdmin || !permission || can(permission);
    });
  }, [orders, products, operations, isAdmin, can]);

  const unread = useMemo(
    () => notifications.filter((item) => !readIds.has(item.id)).length,
    [notifications, readIds],
  );

  const markAllRead = () => {
    const next = new Set(readIds);
    for (const item of notifications) next.add(item.id);
    setReadIds(next);
    saveReadIds(next);
  };

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  return (
    <div className="notifications-root" ref={rootRef}>
      <button
        type="button"
        className="notifications-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="notifications-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notifications-panel" role="dialog" aria-label="Notifications">
          <header className="notifications-panel-head">
            <strong>Notifications</strong>
            <span>{unread ? `${unread} unread` : "All caught up"}</span>
            {notifications.length > 0 && (
              <button type="button" onClick={markAllRead} className="notifications-mark-all">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </header>
          <div className="notifications-list">
            {notifications.length ? (
              notifications.map((item) => {
                const Icon = KIND_META[item.kind].icon;
                const isUnread = !readIds.has(item.id);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={isUnread ? "notification-item notification-item-unread" : "notification-item"}
                    onClick={() => {
                      markRead(item.id);
                      setOpen(false);
                    }}
                  >
                    <span className={`notification-icon ${TONE_CLASS[item.tone]}`}>
                      <Icon size={16} />
                    </span>
                    <span className="notification-copy">
                      <strong>{item.title}</strong>
                      <small>{item.body}</small>
                      {item.at ? <em>{timeAgo(item.at)}</em> : null}
                    </span>
                    {isUnread && <span className="notification-unread-dot" aria-label="unread" />}
                  </Link>
                );
              })
            ) : (
              <p className="notifications-empty">
                Nothing needs attention right now — new orders, payment updates, stock levels,
                incidents and overdue tasks will appear here automatically.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
