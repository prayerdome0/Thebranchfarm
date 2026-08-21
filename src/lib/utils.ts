import { BUSINESS, FREE_DELIVERY_NORMALIZED } from "@/lib/constants";
import type { TimestampValue } from "@/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function money(value: number | null | undefined) {
  if (value == null) return "To be arranged";
  return `${BUSINESS.currency}${value.toLocaleString("en-SZ", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isFreeDelivery(location: string) {
  const normalized = location.trim().toLowerCase();
  return [...FREE_DELIVERY_NORMALIZED].some(
    (area) => normalized === area || normalized.includes(area),
  );
}

export function deliveryDetails(location: string) {
  return isFreeDelivery(location)
    ? { fee: 0, label: "FREE delivery" }
    : { fee: null, label: "To be arranged" };
}

export function toDate(value: TimestampValue | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date(value.seconds * 1000);
  }
  return null;
}

export function formatDate(value: TimestampValue | undefined, includeTime = false) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-SZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function phoneHref(phone?: string) {
  return `tel:${(phone || "").replace(/[^+\d]/g, "")}`;
}

export function whatsappHref(phone: string, message?: string) {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function initials(name?: string) {
  if (!name) return "BF";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function friendlyError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists for this email address.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Use a stronger password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "We could not reach the service. Check your connection and try again.",
    "permission-denied": "You do not have permission to complete that action.",
    unauthenticated: "Please sign in and try again.",
    unavailable: "The service is temporarily unavailable. Please try again.",
    "failed-precondition": "That action is not valid in the current state. Refresh and try again.",
    "invalid-argument": "Please review the information and try again.",
  };
  return messages[code] || messages[code.replace("functions/", "")] || "Something went wrong. Please try again.";
}

export function generateVerificationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "VER-";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const byte of bytes) value += alphabet[byte % alphabet.length];
  return value;
}
