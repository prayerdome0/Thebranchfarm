import type { FarmOperationRecord, Order, Product } from "@/types";

/**
 * Admin workspace notifications.
 *
 * Notifications are DERIVED from the live data the workspace already watches
 * (orders, products, farm operations) — so they cover "anything that needs
 * attention" without extra infrastructure: new orders, unpaid orders, stock
 * problems, open incidents and overdue tasks.
 */

export type NotificationTone = "success" | "warning" | "critical" | "info";

export interface AppNotification {
  /** Stable id — regenerating from the same data yields the same id. */
  id: string;
  kind:
    | "order-new"
    | "order-unpaid"
    | "stock-out"
    | "stock-low"
    | "incident-open"
    | "task-overdue"
    | "ops-low-stock";
  tone: NotificationTone;
  title: string;
  body: string;
  /** Workspace page that opens when the notification is clicked. */
  href: string;
  /** When the underlying event happened (ms epoch), for ordering. */
  at: number;
}

export const LOW_STOCK_THRESHOLD = 5;

function timeOf(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  const seconds = (value as { seconds?: number }).seconds;
  if (typeof seconds === "number") return seconds * 1000;
  return 0;
}

const UNPAID_ACTIVE_STATUSES = new Set(["confirmed", "processing", "ready", "completed"]);

export function deriveNotifications(
  orders: Order[],
  products: Product[],
  operations: FarmOperationRecord[],
): AppNotification[] {
  const list: AppNotification[] = [];

  for (const order of orders) {
    const created = timeOf(order.createdAt);
    if (order.status === "pending") {
      list.push({
        id: `order-new:${order.id}`,
        kind: "order-new",
        tone: "success",
        title: `New order ${order.reference}`,
        body: `${order.customer.name} · ${order.items.reduce((sum, item) => sum + item.quantity, 0)} items — open it to confirm, then prepare the delivery.`,
        href: `/orders/${order.id}`,
        at: created,
      });
    }
    if (order.status !== "cancelled" && order.paymentStatus === "unpaid" && UNPAID_ACTIVE_STATUSES.has(order.status)) {
      list.push({
        id: `order-unpaid:${order.id}`,
        kind: "order-unpaid",
        tone: "warning",
        title: `Payment pending on ${order.reference}`,
        body: `${order.customer.name} — mark it paid once the money is received, then print the receipt.`,
        href: `/orders/${order.id}`,
        at: timeOf(order.updatedAt) || created,
      });
    }
  }

  for (const product of products) {
    if (!product.trackInventory || !product.active || product.comingSoon) continue;
    if ((product.stock ?? 0) <= 0) {
      list.push({
        id: `stock-out:${product.id}`,
        kind: "stock-out",
        tone: "critical",
        title: `Out of stock: ${product.name}`,
        body: "Customers cannot order it until you restock. Update the quantity or turn off inventory tracking.",
        href: `/products/${product.id}/edit`,
        at: timeOf(product.updatedAt) || timeOf(product.createdAt),
      });
    } else if (product.stock <= LOW_STOCK_THRESHOLD) {
      list.push({
        id: `stock-low:${product.id}`,
        kind: "stock-low",
        tone: "warning",
        title: `Low stock: ${product.name}`,
        body: `Only ${product.stock} ${product.unit || "units"} left — plan the next batch or restock.`,
        href: `/products/${product.id}/edit`,
        at: timeOf(product.updatedAt) || timeOf(product.createdAt),
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const record of operations) {
    if (record.archived) continue;
    if (record.module === "incident" && !["resolved", "closed"].includes(record.status)) {
      list.push({
        id: `incident-open:${record.id}`,
        kind: "incident-open",
        tone: record.priority === "high" || record.priority === "critical" ? "critical" : "warning",
        title: `Incident ${record.status}: ${record.title}`,
        body: record.summary || "An incident report still needs attention.",
        href: "/incidents",
        at: timeOf(record.createdAt),
      });
    } else if (
      record.module === "task" &&
      !["completed", "cancelled"].includes(record.status) &&
      record.dueDate &&
      String(record.dueDate).slice(0, 10) < today
    ) {
      list.push({
        id: `task-overdue:${record.id}`,
        kind: "task-overdue",
        tone: "warning",
        title: `Task overdue: ${record.title}`,
        body: `Due ${String(record.dueDate).slice(0, 10)}${record.assignedToName ? ` · ${record.assignedToName}` : ""}.`,
        href: "/tasks",
        at: timeOf(record.createdAt),
      });
    } else if (["feed", "inventory"].includes(record.module) && record.status === "low") {
      list.push({
        id: `ops-low-stock:${record.id}`,
        kind: "ops-low-stock",
        tone: "warning",
        title: `${record.module === "feed" ? "Feed" : "Inventory"} running low: ${record.title}`,
        body: record.summary || "Recorded as low in stock — restock soon.",
        href: record.module === "feed" ? "/feed" : "/inventory",
        at: timeOf(record.createdAt),
      });
    }
  }

  return list.sort((a, b) => b.at - a.at);
}
