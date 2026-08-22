import {
  BUSINESS,
  QUOTATION_NUMBER_PREFIX,
  QUOTATION_STATUS_LABELS,
  RECEIPT_NUMBER_PREFIX,
} from "@/lib/constants";
import type { PrintableDocumentInput } from "@/lib/server/printable";
import type { Quotation, QuotationLine, QuotationStatus, Receipt } from "@/types";

export function round2(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export interface DocumentTotals {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  amountPaid: number;
  balance: number;
}

/**
 * Canonical totals for quotations and receipts:
 * subtotal → minus discount → plus tax (on the discounted subtotal)
 * → plus delivery → total; balance = total − amount paid.
 */
export function computeDocumentTotals(input: {
  items: QuotationLine[];
  /** Form inputs may still be strings — they are coerced and clamped. */
  discount?: number | string;
  taxRate?: number | string;
  deliveryFee?: number | string;
  amountPaid?: number | string;
}): DocumentTotals {
  const subtotal = round2(
    (input.items || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
      0,
    ),
  );
  const discount = Math.min(Math.max(Number(input.discount) || 0, 0), subtotal);
  const taxRate = Math.min(Math.max(Number(input.taxRate) || 0, 0), 100);
  const taxAmount = round2(((subtotal - discount) * taxRate) / 100);
  const deliveryFee = Math.max(Number(input.deliveryFee) || 0, 0);
  const total = round2(subtotal - discount + taxAmount + deliveryFee);
  const amountPaid = Math.min(Math.max(Number(input.amountPaid) || 0, 0), total);
  const balance = round2(total - amountPaid);
  return {
    subtotal,
    discount,
    taxRate,
    taxAmount,
    deliveryFee,
    total,
    amountPaid,
    balance,
  };
}

/**
 * Professional sequential document numbers, e.g. `QF-2026-0007`.
 * Scans the existing numbers for the current year and continues the sequence;
 * starts at 0001 when nothing exists yet.
 */
export function nextDocumentNumber(
  prefix: string,
  existing: Array<string | undefined | null>,
  year = new Date().getFullYear(),
) {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`, "i");
  let max = 0;
  for (const value of existing) {
    const match = String(value || "").match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function generateQuotationNumber(existing: Array<string | undefined | null>) {
  return nextDocumentNumber(QUOTATION_NUMBER_PREFIX, existing);
}

export function generateReceiptNumber(existing: Array<string | undefined | null>) {
  return nextDocumentNumber(RECEIPT_NUMBER_PREFIX, existing);
}

/** Record shape without the Firestore bookkeeping fields (added on write). */
export type QuotationRecord = Omit<
  Quotation,
  "id" | "createdBy" | "createdByName" | "createdAt" | "updatedBy" | "updatedByName" | "updatedAt" | "archived"
>;
export type ReceiptRecord = Omit<
  Receipt,
  "id" | "createdBy" | "createdByName" | "createdAt" | "updatedBy" | "updatedByName" | "updatedAt" | "archived"
>;

export function normalizeQuotationStatus(status?: string | null): QuotationStatus {
  return (QUOTATION_STATUS_LABELS[status || ""] ? status : "draft") as QuotationStatus;
}

export function quotationStatusLabel(status?: string | null) {
  return QUOTATION_STATUS_LABELS[normalizeQuotationStatus(status)];
}

export function productToLine(product: {
  id: string;
  name: string;
  unit?: string;
  price: number;
  salePrice?: number | null;
}, quantity = 1): QuotationLine {
  return {
    productId: product.id,
    name: product.name,
    unit: product.unit || "each",
    price: Number(product.salePrice || product.price || 0),
    quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
  };
}

function lines(input: Quotation | Receipt): QuotationLine[] {
  return (input.items || []).map((line) => ({
    name: line.name,
    quantity: Number(line.quantity) || 0,
    price: Number(line.price) || 0,
    unit: line.unit,
  }));
}

/** Map a stored quotation onto the printable document model. */
export function buildQuotationDocumentInput(
  q: Quotation,
  currency: string = BUSINESS.currency,
): PrintableDocumentInput {
  const totals = computeDocumentTotals({
    items: q.items || [],
    discount: q.discount,
    taxRate: q.taxRate,
    deliveryFee: q.deliveryFee,
    amountPaid: 0,
  });
  return {
    kind: "quotation",
    reference: q.quotationNumber,
    date: q.date,
    lines: lines(q),
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxRate: totals.taxRate,
    taxAmount: totals.taxAmount,
    total: totals.total,
    currency,
    customer: { name: q.customer, phone: q.customerPhone, email: q.customerEmail },
    paymentStatus: quotationStatusLabel(q.status),
    notes: q.notes,
    validUntil: q.validUntil ? new Date(`${q.validUntil}T23:59:59`) : undefined,
    preparedBy: q.authorizedBy,
    status: quotationStatusLabel(q.status),
  };
}

/** Map a stored receipt onto the printable document model (incl. signature). */
export function buildReceiptDocumentInput(
  r: Receipt,
  currency: string = BUSINESS.currency,
): PrintableDocumentInput {
  const total = Number(r.total ?? r.amount ?? 0);
  const amountPaid = Number(r.amountPaid ?? r.amount ?? 0);
  return {
    kind: "receipt",
    reference: r.receiptNumber,
    date: r.date,
    lines: r.items ? lines(r) : [],
    subtotal: Number(r.subtotal ?? r.amount ?? 0),
    discount: Number(r.discount ?? 0),
    taxRate: Number(r.taxRate ?? 0),
    taxAmount: Number(r.taxAmount ?? 0),
    total,
    amountPaid,
    balance: Number(r.balance ?? Math.max(round2(total - amountPaid), 0)),
    currency,
    customer: { name: r.customer, phone: r.customerPhone, email: r.customerEmail },
    paymentMethod: r.paymentMethod,
    paymentStatus: r.amount >= total && total > 0 ? "Paid in full" : amountPaid > 0 ? "Partially paid" : "Unpaid",
    notes: [r.description, r.notes].filter(Boolean).join(" · "),
    authorizedBy: r.authorizedBy,
    signature: r.signature,
    signedByName: r.signedByName,
    signedAt: r.signedAt,
  };
}
