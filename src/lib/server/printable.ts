import { BUSINESS } from "@/lib/constants";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: number, currency = "E") {
  const amount = Number.isFinite(value) ? value : 0;
  return `${currency}${amount.toLocaleString("en-SZ", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date | string | { seconds?: number } | null | undefined) {
  if (!value) return "—";
  if (value instanceof Date) return value.toLocaleDateString("en-GB", { dateStyle: "medium" });
  if (typeof value === "object") {
    const seconds = value.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toLocaleDateString("en-GB", { dateStyle: "medium" });
    }
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

export interface PrintableLine {
  name: string;
  unit?: string;
  quantity: number;
  price: number;
}

export interface PrintableDocumentInput {
  kind: "receipt" | "invoice" | "quotation";
  reference: string;
  date: Date | string | { seconds?: number } | null | undefined;
  lines: PrintableLine[];
  subtotal: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  deliveryFee?: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  currency?: string;
  customer?: { name?: string; phone?: string; email?: string };
  fulfillment?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  validUntil?: Date;
  preparedBy?: string;
  /** Quotation lifecycle label (Draft, Sent, Accepted…). */
  status?: string;
  authorizedBy?: string;
  /** PNG data-URL signature captured on the device. */
  signature?: string;
  signedByName?: string;
  signedAt?: Date | string | null;
  /** Toolbar back link (defaults to the storefront). */
  backHref?: string;
  backLabel?: string;
}

const KIND_COPY = {
  receipt: { label: "Receipt", tagline: `Receipt — ${BUSINESS.name} · ${BUSINESS.slogan}. Thank you.` },
  invoice: { label: "Invoice", tagline: `Invoice — ${BUSINESS.name} · ${BUSINESS.slogan}. Payable on collection/delivery.` },
  quotation: { label: "Quotation", tagline: `Quotation — ${BUSINESS.name} · ${BUSINESS.slogan}. Prices held for validity.` },
} as const;

export function renderPrintableDocument(input: PrintableDocumentInput) {
  const currency = input.currency || BUSINESS.currency;
  const copy = KIND_COPY[input.kind];
  const rows = input.lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.name)}${line.unit ? ` <span class="muted">(${escapeHtml(line.unit)})</span>` : ""}</td>
          <td class="num">${escapeHtml(line.quantity)}</td>
          <td class="num">${escapeHtml(formatMoney(line.price, currency))}</td>
          <td class="num strong">${escapeHtml(formatMoney(line.price * line.quantity, currency))}</td>
        </tr>`,
    )
    .join("");

  const meta: Array<[string, string]> = [
    ["Date", formatDate(input.date)],
    input.customer?.name ? ["Customer", input.customer.name] : null,
    input.customer?.phone ? ["Phone", input.customer.phone] : null,
    input.customer?.email ? ["Email", input.customer.email] : null,
    input.fulfillment ? ["Fulfilment", input.fulfillment] : null,
    input.deliveryAddress ? ["Delivery Location", input.deliveryAddress] : null,
    input.paymentMethod ? ["Payment method", input.paymentMethod] : null,
    input.paymentStatus ? ["Payment status", input.paymentStatus] : null,
    input.kind === "quotation" && input.validUntil ? ["Valid until", formatDate(input.validUntil)] : null,
    input.preparedBy ? ["Prepared by", input.preparedBy] : null,
    input.authorizedBy ? ["Authorized by", input.authorizedBy] : null,
  ].filter(Boolean) as Array<[string, string]>;

  const hasPaidBlock =
    input.kind === "receipt" && (Number(input.amountPaid) > 0 || input.balance != null);
  const paidInFull =
    hasPaidBlock && Number(input.balance) <= 0 && Number(input.amountPaid) > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(copy.label)} ${escapeHtml(input.reference)} · ${escapeHtml(BUSINESS.name)} · ${escapeHtml(BUSINESS.slogan)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, serif; color: #1d2a20; background: #f2f4f1; }
  .sheet { max-width: 760px; margin: 24px auto; background: #fff; padding: 40px 44px; border: 1px solid #e2e7e2; border-radius: 14px; }
  header { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #2f5d3a; padding-bottom: 18px; }
  .brand h1 { margin: 0; font-size: 1.45rem; }
  .brand .slogan { color: #ca983e; font-size: .8rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
  .brand p { margin: 3px 0 0; color: #5d6d60; font-size: .8rem; font-family: Segoe UI, Arial, sans-serif; }
  .kind { text-align: right; }
  .kind h2 { margin: 0; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 3px; color: #2f5d3a; }
  .kind span { font-family: Segoe UI, Arial, sans-serif; font-size: .8rem; color: #5d6d60; display: block; }
  .kind .ref { font-size: 1.05rem; font-weight: 700; margin-top: 4px; color: #1d2a20; }
  .tagline { margin: 14px 0 0; color: #5d6d60; font-style: italic; font-size: .85rem; }
  dl { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin: 22px 0 8px; font-family: Segoe UI, Arial, sans-serif; }
  dl div { display: flex; gap: 8px; font-size: .82rem; }
  dt { color: #5d6d60; min-width: 120px; }
  dd { margin: 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: .84rem; }
  th { text-align: left; border-bottom: 1px solid #d8ded8; padding: 8px 6px; font-family: Segoe UI, Arial, sans-serif; font-size: .68rem; text-transform: uppercase; color: #5d6d60; }
  td { padding: 10px 6px; border-bottom: 1px solid #edf0ed; }
  .num { text-align: right; }
  .strong { font-weight: 700; }
  .muted { color: #7d8a80; }
  .totals { margin-left: auto; width: min(320px, 100%); margin-top: 14px; font-size: .86rem; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #2f5d3a; margin-top: 6px; padding-top: 10px; font-size: 1.05rem; font-weight: 700; }
  .totals .paid { margin-top: 2px; font-size: .86rem; }
  .totals .paid.due span:last-child { color: #a34428; font-weight: 700; }
  .totals .paid.full span { color: #1f6942; font-weight: 700; }
  .signature-block { margin-top: 34px; display: flex; align-items: flex-end; gap: 22px; border-top: 1px solid #e2e7e2; padding-top: 22px; }
  .sig-image { flex: 0 0 240px; height: 110px; display: flex; align-items: flex-end; border-bottom: 1.5px solid #2f5d3a; }
  .sig-image img { max-width: 100%; max-height: 100px; object-fit: contain; }
  .sig-details { display: flex; flex-direction: column; gap: 3px; font-family: Segoe UI, Arial, sans-serif; }
  .sig-title { font-size: .82rem; font-weight: 700; letter-spacing: .04em; }
  .sig-meta { font-size: .74rem; color: #7d8a80; font-style: italic; }
  .sig-by { font-size: .78rem; color: #405044; }
  .chip { display: inline-block; margin-top: 8px; padding: 4px 12px; border: 1.5px solid #2f5d3a; border-radius: 999px; color: #2f5d3a; font-family: Segoe UI, Arial, sans-serif; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  footer { margin-top: 30px; border-top: 1px solid #e2e7e2; padding-top: 16px; font-family: Segoe UI, Arial, sans-serif; font-size: .74rem; color: #5d6d60; display: flex; justify-content: space-between; flex-wrap: wrap; }
  .toolbar { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; }
  .toolbar button, .toolbar a { font: 600 .78rem Segoe UI, Arial, sans-serif; padding: 9px 14px; border-radius: 999px; border: 0; cursor: pointer; text-decoration: none; }
  .toolbar button { background: #2f5d3a; color: #fff; }
  .toolbar a { background: #fff; color: #2f5d3a; border: 1px solid #cfd8d0; }
  .notes { margin-top: 16px; font-size: .8rem; color: #405044; background: #f6f8f5; border-radius: 10px; padding: 12px 14px; font-family: Segoe UI, Arial, sans-serif; }
  .delivery { margin-top: 12px; font-size: .75rem; color: #5d6d60; background: #f0f5ef; border-radius: 8px; padding: 10px 12px; }
  @media print { body { background: #fff; } .sheet { margin: 0; border: 0; max-width: none; } .toolbar { display: none; } }
</style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button><a href="${escapeHtml(input.backHref || "/")}">${escapeHtml(input.backLabel || "Back to shop")}</a></div>
  <main class="sheet">
    <header>
      <div class="brand">
        <h1>${escapeHtml(BUSINESS.name)}</h1>
        <div class="slogan">${escapeHtml(BUSINESS.slogan)}</div>
        <p>${escapeHtml(BUSINESS.fullLocation || BUSINESS.location)} · ${escapeHtml(BUSINESS.phoneDisplay)}</p>
        <p>WhatsApp ${escapeHtml(BUSINESS.whatsappDisplay)} · ${escapeHtml(BUSINESS.email)}</p>
      </div>
      <div class="kind">
        <h2>${escapeHtml(copy.label)}</h2>
        <span>${escapeHtml(BUSINESS.name)} · ${escapeHtml(BUSINESS.slogan)}</span>
        <span class="ref">${escapeHtml(input.reference)}</span>
        ${input.status ? `<span class="chip">${escapeHtml(input.status)}</span>` : ""}
      </div>
    </header>
    <p class="tagline">${escapeHtml(copy.tagline)}</p>

    <dl>${meta.map(([t, v]) => `<div><dt>${escapeHtml(t)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>

    <div class="delivery"><strong>Delivery:</strong> ${escapeHtml(BUSINESS.deliveryFree)} ${escapeHtml(BUSINESS.deliveryOther)}</div>

    <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">No items</td></tr>`}</tbody></table>

    <div class="totals">
      <div><span>Subtotal</span><span>${escapeHtml(formatMoney(input.subtotal, currency))}</span></div>
      ${input.discount ? `<div><span>Discount</span><span>&minus;${escapeHtml(formatMoney(input.discount, currency))}</span></div>` : ""}
      ${input.taxAmount ? `<div><span>Tax${input.taxRate ? ` (${escapeHtml(input.taxRate)}%)` : ""}</span><span>${escapeHtml(formatMoney(input.taxAmount, currency))}</span></div>` : ""}
      ${input.deliveryFee != null ? `<div><span>Delivery</span><span>${input.deliveryFee ? escapeHtml(formatMoney(input.deliveryFee, currency)) : "Free"}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${escapeHtml(formatMoney(input.total, currency))}</span></div>
      ${input.kind === "receipt" ? `
      <div class="paid"><span>Amount paid</span><span>${escapeHtml(formatMoney(input.amountPaid ?? 0, currency))}</span></div>
      ${paidInFull ? `<div class="paid full"><span>Paid in full</span><span>&#10003;</span></div>` : `<div class="paid due"><span>Balance due</span><span>${escapeHtml(formatMoney(input.balance ?? 0, currency))}</span></div>`}` : ""}
    </div>

    ${input.notes ? `<div class="notes"><strong>Notes</strong><br />${escapeHtml(input.notes)}</div>` : ""}

    ${input.signature ? `
    <div class="signature-block">
      <div class="sig-image"><img src="${input.signature}" alt="Customer signature" /></div>
      <div class="sig-details">
        <span class="sig-title">Authorized Signature</span>
        <span class="sig-meta">[signed digitally]</span>
        <span class="sig-by">Authorized by: ${escapeHtml(input.authorizedBy || input.signedByName || "Admin")}${input.signedAt ? ` &middot; ${escapeHtml(formatDate(input.signedAt))}` : ""}</span>
      </div>
    </div>` : ""}

    <footer><span>${escapeHtml(BUSINESS.name)} · ${escapeHtml(BUSINESS.slogan)} · ${escapeHtml(BUSINESS.location)}</span><span>${escapeHtml(copy.label)} ${escapeHtml(input.reference)} · ${new Date().toLocaleString("en-GB")}</span></footer>
  </main>
</body>
</html>`;
}
