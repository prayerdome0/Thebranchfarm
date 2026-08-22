import { BUSINESS } from "@/lib/constants";
import { LOGO_DATA_URL } from "@/lib/logoData";

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
  signedAt?: Date | string | { seconds?: number } | null;
  /** Toolbar back link (defaults to the storefront). */
  backHref?: string;
  backLabel?: string;
}

const KIND_COPY = {
  receipt: { label: "Receipt", tagline: `Receipt — ${BUSINESS.name} · ${BUSINESS.slogan}. Thank you.` },
  invoice: { label: "Invoice", tagline: `Invoice — ${BUSINESS.name} · ${BUSINESS.slogan}. Payable on collection/delivery.` },
  quotation: { label: "Quotation", tagline: `Quotation — ${BUSINESS.name} · ${BUSINESS.slogan}. Prices held for validity.` },
} as const;

/**
 * Signature + preparer block shown on every receipt, quotation and invoice.
 * When a signature was captured it is printed with the signer's name and
 * date; otherwise a signature line is left so the document can be signed by
 * hand after printing. No digital-signature marker text is printed.
 */
function signatureBlockHtml(input: PrintableDocumentInput) {
  const preparer = input.preparedBy || input.authorizedBy || input.signedByName || "The Branch Farm";
  const name = escapeHtml(
    input.signature ? input.authorizedBy || input.signedByName || "Authorized" : preparer,
  );
  const date = input.signedAt ? ` &middot; ${escapeHtml(formatDate(input.signedAt))}` : "";
  return `
    <div class="signature-block">
      <div class="sig-image">${input.signature ? `<img src="${input.signature}" alt="Signature" />` : ""}</div>
      <div class="sig-details">
        <span class="sig-title">${input.signature ? "Authorized Signature" : "Signature"}</span>
        ${input.signature ? "" : `<span class="sig-meta">sign here</span>`}
        <span class="sig-by" data-fill-line="preparedBy">Prepared by: ${name}${date}</span>
      </div>
    </div>`;
}

/** Inline script that powers the toolbar: fill-in fields + download. */
function toolbarScript(input: PrintableDocumentInput, currency: string) {
  const bootstrap = {
    kind: input.kind,
    reference: input.reference,
    total: Number(input.total) || 0,
    currency,
    isReceipt: input.kind === "receipt",
  };
  return `
  <script>
  (function () {
    "use strict";
    var boot = ${JSON.stringify(bootstrap).replace(/</g, "\\u003c")};
    var params = new URLSearchParams(location.search);
    var toolbar = document.querySelector(".toolbar");
    var panel = document.getElementById("fill-panel");

    function money(value) {
      var amount = Number.isFinite(value) ? value : 0;
      var digits = Number.isInteger(amount) ? 0 : 2;
      return boot.currency + amount.toLocaleString("en-SZ", { minimumFractionDigits: digits, maximumFractionDigits: 2 });
    }
    function setText(selector, value) {
      var node = document.querySelector(selector);
      if (node) node.textContent = value;
    }
    function ensureMeta(key, label) {
      var existing = document.querySelector('[data-fill="' + key + '"]');
      if (existing) return existing;
      var dl = document.querySelector("dl");
      if (!dl) return null;
      var row = document.createElement("div");
      var dt = document.createElement("dt"); dt.textContent = label;
      var dd = document.createElement("dd"); dd.setAttribute("data-fill", key); dd.textContent = "—";
      row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
      return dd;
    }
    function escapeHtml(value) {
      return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }
    function apply() {
      var preparedBy = (document.getElementById("fill-preparedBy") || {}).value || "";
      var paymentMethod = (document.getElementById("fill-paymentMethod") || {}).value || "";
      var paymentStatus = (document.getElementById("fill-paymentStatus") || {}).value || "";
      var notes = (document.getElementById("fill-notes") || {}).value || "";
      if (preparedBy.trim()) {
        var node = ensureMeta("preparedBy", "Prepared by");
        if (node) node.textContent = preparedBy.trim();
        var line = document.querySelector('[data-fill-line="preparedBy"]');
        if (line) line.textContent = "Prepared by: " + preparedBy.trim();
      }
      if (paymentMethod.trim()) {
        var methodNode = ensureMeta("paymentMethod", "Payment method");
        if (methodNode) methodNode.textContent = paymentMethod.trim();
      }
      if (paymentStatus) {
        var statusNode = ensureMeta("paymentStatus", "Payment status");
        if (statusNode) statusNode.textContent = paymentStatus;
      }
      if (boot.isReceipt) {
        var paid = parseFloat((document.getElementById("fill-amountPaid") || {}).value);
        if (!Number.isNaN(paid) && paid >= 0) {
          setText("#amount-paid-value", money(paid));
          var balance = Math.max(boot.total - paid, 0);
          setText("#balance-value", money(balance));
          var full = document.getElementById("paid-full");
          var due = document.getElementById("paid-due");
          var settled = paid >= boot.total;
          if (full) full.style.display = settled ? "" : "none";
          if (due) due.style.display = settled ? "none" : "";
        }
      }
      var notesBox = document.getElementById("notes-box");
      if (notesBox) {
        var trimmed = notes.trim();
        notesBox.style.display = trimmed ? "" : "none";
        var target = notesBox.querySelector("[data-fill-line='notes']");
        if (target) target.innerHTML = escapeHtml(trimmed).replace(/\\n/g, "<br>");
      }
    }
    var inputs = panel ? panel.querySelectorAll("input, select, textarea") : [];
    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
    if (panel) {
      var toggle = document.getElementById("fill-toggle");
      if (toggle) toggle.addEventListener("click", function () {
        var open = panel.getAttribute("data-open") === "1";
        panel.setAttribute("data-open", open ? "0" : "1");
        panel.style.display = open ? "none" : "block";
        if (!open) {
          var first = panel.querySelector("input");
          if (first) first.focus();
        }
      });
      if (params.has("edit")) {
        panel.setAttribute("data-open", "1");
        panel.style.display = "block";
      }
      if (!boot.isReceipt) {
        var amountField = document.getElementById("fill-amountPaid-field");
        if (amountField) amountField.style.display = "none";
      }
    }
    var downloadButton = document.getElementById("download-button");
    if (downloadButton) downloadButton.addEventListener("click", function () {
      apply();
      var clone = document.documentElement.cloneNode(true);
      var chrome = clone.querySelectorAll(".toolbar, #fill-panel");
      Array.prototype.forEach.call(chrome, function (node) { node.parentNode.removeChild(node); });
      var html = "<!DOCTYPE html>" + clone.outerHTML;
      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = boot.kind + "-" + String(boot.reference).replace(/[^\\w.-]+/g, "-") + ".html";
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 5000);
    });
  })();
  </script>`;
}

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

  const meta: Array<[string, string, string]> = [
    ["Date", formatDate(input.date), "date"],
    input.customer?.name ? ["Customer", input.customer.name, "customer"] : null,
    input.customer?.phone ? ["Phone", input.customer.phone, "phone"] : null,
    input.customer?.email ? ["Email", input.customer.email, "email"] : null,
    input.fulfillment ? ["Fulfilment", input.fulfillment, "fulfillment"] : null,
    input.deliveryAddress ? ["Delivery Location", input.deliveryAddress, "deliveryAddress"] : null,
    ["Payment method", input.paymentMethod || "—", "paymentMethod"],
    ["Payment status", input.paymentStatus || "—", "paymentStatus"],
    input.kind === "quotation" && input.validUntil ? ["Valid until", formatDate(input.validUntil), "validUntil"] : null,
    ["Prepared by", input.preparedBy || input.authorizedBy || "The Branch Farm", "preparedBy"],
  ].filter(Boolean) as Array<[string, string, string]>;

  const amountPaid = Number(input.amountPaid ?? 0);
  const balance = input.balance != null ? Number(input.balance) : Math.max(Number(input.total) - amountPaid, 0);
  const paidInFull = amountPaid > 0 && balance <= 0;

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
  #fill-panel { display: none; position: fixed; top: 60px; right: 14px; z-index: 20; width: min(330px, calc(100vw - 28px)); background: #fff; border: 1px solid #d8ded8; border-radius: 12px; padding: 14px; box-shadow: 0 16px 40px rgba(22,38,26,.18); font-family: Segoe UI, Arial, sans-serif; }
  #fill-panel h3 { margin: 0 0 4px; font-size: .84rem; color: #2f5d3a; }
  #fill-panel p.hint { margin: 0 0 10px; font-size: .68rem; color: #7d8a80; }
  #fill-panel label { display: block; font-size: .68rem; font-weight: 700; color: #405044; margin-top: 9px; }
  #fill-panel input, #fill-panel select, #fill-panel textarea { width: 100%; margin-top: 3px; padding: 7px 9px; border: 1px solid #cfd8d0; border-radius: 8px; font: 500 .78rem Segoe UI, Arial, sans-serif; color: #1d2a20; }
  #fill-panel textarea { min-height: 58px; resize: vertical; }
  @media print { body { background: #fff; } .sheet { margin: 0; border: 0; max-width: none; } .toolbar, #fill-panel { display: none !important; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" id="download-button">Download</button>
    <button type="button" onclick="window.print()">Print / Save PDF</button>
    <button type="button" id="fill-toggle">Fill details</button>
    <a href="${escapeHtml(input.backHref || "/")}">${escapeHtml(input.backLabel || "Back to shop")}</a>
  </div>

  <div id="fill-panel">
    <h3>Fill in the document</h3>
    <p class="hint">Type here and the ${escapeHtml(copy.label.toLowerCase())} updates live. Then press Download, or Print / Save PDF.</p>
    <label for="fill-preparedBy">Prepared by</label>
    <input id="fill-preparedBy" type="text" placeholder="Name of the person completing this ${escapeHtml(copy.label.toLowerCase())}" />
    <label for="fill-paymentMethod">Payment method</label>
    <input id="fill-paymentMethod" type="text" placeholder="Cash, Transfer, Card…" />
    <label for="fill-paymentStatus">Payment status</label>
    <select id="fill-paymentStatus">
      <option value="">Leave as is</option>
      <option value="Paid">Paid</option>
      <option value="Unpaid">Unpaid</option>
      <option value="Partially paid">Partially paid</option>
    </select>
    <div id="fill-amountPaid-field">
      <label for="fill-amountPaid">Amount paid (E)</label>
      <input id="fill-amountPaid" type="number" min="0" step="0.01" placeholder="0" />
    </div>
    <label for="fill-notes">Notes</label>
    <textarea id="fill-notes" placeholder="Extra notes to print on the ${escapeHtml(copy.label.toLowerCase())}"></textarea>
  </div>

  <main class="sheet">
    <header>
      <div class="brand">
        <img src="${LOGO_DATA_URL}" alt="${escapeHtml(BUSINESS.name)} logo" style="width:72px;height:72px;object-fit:contain;float:left;margin:0 12px 4px 0" />
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

    <dl>${meta.map(([t, v, key]) => `<div><dt>${escapeHtml(t)}</dt><dd data-fill="${escapeHtml(key)}">${escapeHtml(v)}</dd></div>`).join("")}</dl>

    <div class="delivery"><strong>Delivery:</strong> ${escapeHtml(BUSINESS.deliveryFree)} ${escapeHtml(BUSINESS.deliveryOther)}</div>

    <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="muted">No items</td></tr>`}</tbody></table>

    <div class="totals">
      <div><span>Subtotal</span><span>${escapeHtml(formatMoney(input.subtotal, currency))}</span></div>
      ${input.discount ? `<div><span>Discount</span><span>&minus;${escapeHtml(formatMoney(input.discount, currency))}</span></div>` : ""}
      ${input.taxAmount ? `<div><span>Tax${input.taxRate ? ` (${escapeHtml(input.taxRate)}%)` : ""}</span><span>${escapeHtml(formatMoney(input.taxAmount, currency))}</span></div>` : ""}
      ${input.deliveryFee != null ? `<div><span>Delivery</span><span>${input.deliveryFee ? escapeHtml(formatMoney(input.deliveryFee, currency)) : "Free"}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${escapeHtml(formatMoney(input.total, currency))}</span></div>
      ${input.kind === "receipt" ? `
      <div class="paid"><span>Amount paid</span><span id="amount-paid-value">${escapeHtml(formatMoney(amountPaid, currency))}</span></div>
      <div class="paid full" id="paid-full" style="${paidInFull ? "" : "display:none"}"><span>Paid in full</span><span>&#10003;</span></div>
      <div class="paid due" id="paid-due" style="${paidInFull ? "display:none" : ""}"><span>Balance due</span><span id="balance-value">${escapeHtml(formatMoney(balance, currency))}</span></div>` : ""}
    </div>

    <div class="notes" id="notes-box" style="${input.notes ? "" : "display:none"}"><strong>Notes</strong><br /><span data-fill-line="notes">${escapeHtml(input.notes)}</span></div>

    ${signatureBlockHtml(input)}

    <footer><span>${escapeHtml(BUSINESS.name)} · ${escapeHtml(BUSINESS.slogan)} · ${escapeHtml(BUSINESS.location)}</span><span>${escapeHtml(copy.label)} ${escapeHtml(input.reference)} · ${new Date().toLocaleString("en-GB")}</span></footer>
  </main>
${toolbarScript(input, currency)}
</body>
</html>`;
}
