import { BUSINESS } from "@/lib/constants";
import type { TimestampValue } from "@/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${BUSINESS.currency}${value.toLocaleString("en-SZ", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
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

export function formatDisplayDate(isoDate?: string | null) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-SZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ageFromDateOfBirth(isoDate?: string | null) {
  if (!isoDate) return null;
  const dob = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 0) return null;
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (!remainder) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${remainder} month${remainder === 1 ? "" : "s"}`;
}

export function formatBytes(bytes?: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const rawCode =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: string }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: string }).message)
        : "";
  const fromMessage = message.match(/\((auth|functions|firestore|storage)\/[a-z0-9-]+\)/i)?.[1] || "";
  const code = rawCode || fromMessage;
  const normalized = code.replace(/^(auth|functions|firestore|storage)\//, "");
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists for this email address. Try signing in instead.",
    "email-already-in-use": "An account already exists for this email address. Try signing in instead.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "invalid-credential": "The email or password is incorrect.",
    "auth/invalid-login-credentials": "The email or password is incorrect.",
    "invalid-login-credentials": "The email or password is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "The email or password is incorrect.",
    "user-not-found": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "wrong-password": "The email or password is incorrect.",
    "auth/missing-password": "Enter your password.",
    "missing-password": "Enter your password.",
    "auth/missing-email": "Enter your email address.",
    "missing-email": "Enter your email address.",
    "auth/user-disabled": "This account has been disabled. Please contact the farm administrator.",
    "user-disabled": "This account has been disabled. Please contact the farm administrator.",
    "auth/operation-not-allowed": "Email sign-in is not enabled yet. Please contact the farm administrator.",
    "operation-not-allowed": "Email sign-in is not enabled yet. Please contact the farm administrator.",
    "auth/weak-password": "Use a stronger password with at least 8 characters.",
    "weak-password": "Use a stronger password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "We could not reach the service. Check your connection and try again.",
    "network-request-failed": "We could not reach the service. Check your connection and try again.",
    "auth/invalid-api-key": "The sign-in service is not configured correctly. Please try again later.",
    "invalid-api-key": "The sign-in service is not configured correctly. Please try again later.",
    "auth/unauthorized-domain": "This website is not authorized for sign-in yet. Please contact the farm administrator.",
    "unauthorized-domain": "This website is not authorized for sign-in yet. Please contact the farm administrator.",
    "auth/configuration-not-found": "Firebase Authentication is not fully configured yet. Please try again later.",
    "configuration-not-found": "Firebase Authentication is not fully configured yet. Please try again later.",
    "permission-denied": "You do not have permission to complete that action.",
    unauthenticated: "Please sign in and try again.",
    unavailable: "The service is temporarily unavailable. Please try again.",
    "failed-precondition": "That action is not valid in the current state. Refresh and try again.",
    "invalid-argument": "Please review the information and try again.",
    "not-found": "That record or service is not available yet. Please try again shortly.",
    internal: "The service hit an unexpected problem. Please try again.",
    "deadline-exceeded": "The service took too long to respond. Check your connection and try again.",
    "resource-exhausted": "The service is busy right now. Please try again in a moment.",
    "storage/unauthorized": "You do not have permission to upload that file.",
    "storage/quota-exceeded": "The file is too large to upload.",
    "storage/canceled": "The upload was interrupted. Please try again.",
    cancelled: "The request was interrupted. Please try again.",
    aborted: "The request was interrupted. Please try again.",
  };
  return (
    messages[code] ||
    messages[normalized] ||
    messages[`auth/${normalized}`] ||
    "Something went wrong. Please try again."
  );
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function documentCategory(fileName: string, mimeType: string) {
  const type = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("video/")) return "video";
  if (
    type.includes("word") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".rtf")
  ) {
    return "word";
  }
  if (
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  ) {
    return "excel";
  }
  return "other";
}
