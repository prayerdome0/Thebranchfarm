import { BUSINESS } from "@/lib/constants";
import { formatOperationValue, type FarmModuleDefinition } from "@/lib/farmModules";
import { formatDate, formatDisplayDate, money } from "@/lib/utils";
import type { Animal, AuditEvent, FarmOperationRecord, HealthRecord } from "@/types";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const parsed = new URL(value, typeof window === "undefined" ? "https://thebranchfarm.com" : window.location.origin);
    return ["http:", "https:", "data:"].includes(parsed.protocol) ? escapeHtml(parsed.toString()) : "";
  } catch {
    return "";
  }
}

function reportNumber(prefix: string) {
  const now = new Date();
  return `${prefix}-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${now.getTime().toString().slice(-5)}`;
}

function baseDocument(options: {
  title: string;
  reference: string;
  subtitle?: string;
  body: string;
  generatedBy?: string;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const logo = `${origin}/logo.png`;
  const generated = new Intl.DateTimeFormat("en-SZ", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(options.title)} · ${escapeHtml(options.reference)}</title>
<style>
*{box-sizing:border-box}body{margin:0;color:#18251d;background:#edf1ed;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5}.sheet{width:min(900px,calc(100% - 30px));margin:24px auto;padding:42px 48px;background:white;box-shadow:0 8px 40px #1835221c}.report-head{display:flex;align-items:center;justify-content:space-between;gap:28px;padding-bottom:22px;border-bottom:3px solid #1d5b3b}.brand{display:flex;align-items:center;gap:14px}.brand img{width:66px;height:66px;object-fit:contain}.brand strong{display:block;color:#173e2c;font-family:Georgia,serif;font-size:20px}.brand small{color:#b47b25;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.report-title{text-align:right}.report-title h1{margin:0;color:#173e2c;font-family:Georgia,serif;font-size:24px;letter-spacing:.02em}.report-title p{margin:3px 0;color:#607066}.report-ref{font-weight:800;color:#263b2e}.meta-strip{margin:18px 0 24px;padding:12px 15px;display:flex;justify-content:space-between;gap:16px;background:#f0f5f1;border-left:4px solid #c59641;color:#4e6255}.section{margin-top:24px;break-inside:avoid}.section h2{margin:0 0 12px;padding-bottom:7px;color:#1d5b3b;border-bottom:1px solid #d9e2da;font-family:Georgia,serif;font-size:16px}.detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0 28px}.detail{min-height:48px;padding:9px 0;border-bottom:1px solid #edf0ed}.detail small{display:block;color:#748078;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.detail strong{font-size:12px;white-space:pre-wrap}.notes{padding:14px;background:#f7f9f6;border:1px solid #e1e7e1;border-radius:6px;white-space:pre-wrap}.photo{width:220px;max-height:180px;object-fit:cover;border-radius:7px;border:1px solid #dce4dd}.attachments{display:flex;gap:12px;flex-wrap:wrap}.attachment{padding:10px 12px;background:#f5f8f5;border:1px solid #dce5dd;border-radius:6px;color:#1d5b3b;text-decoration:none;font-weight:700}.record-info{padding:16px;background:#183e2c;color:#fff}.record-info .detail{border-color:#ffffff22}.record-info .detail small{color:#c7d4cb}.approval{margin-top:38px;display:grid;grid-template-columns:1fr 1fr;gap:50px}.signature{padding-top:45px;border-bottom:1px solid #1d2b22}.signature-label{margin-top:5px;color:#66746b;font-size:10px}.status{display:inline-block;padding:4px 9px;border-radius:999px;background:#e4f2e8;color:#1f6842;font-size:10px;font-weight:800;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{padding:9px 7px;color:#5e6c63;background:#eff4f0;text-align:left;font-size:9px;letter-spacing:.06em;text-transform:uppercase}td{padding:10px 7px;border-bottom:1px solid #e7ece8;vertical-align:top}tr{break-inside:avoid}.num{text-align:right}.toolbar{position:fixed;right:18px;top:18px;display:flex;gap:8px;z-index:5}.toolbar button{padding:10px 16px;border:0;border-radius:999px;color:white;background:#1d5b3b;font-weight:700;cursor:pointer}.toolbar button:last-child{color:#1d5b3b;background:white;border:1px solid #cbd7ce}footer{margin-top:34px;padding-top:14px;display:flex;justify-content:space-between;border-top:1px solid #dae2db;color:#718078;font-size:9px}
@page{size:A4;margin:12mm}@media print{body{background:white}.sheet{width:100%;margin:0;padding:12px 16px;box-shadow:none}.toolbar{display:none}.section{break-inside:avoid}a{color:inherit;text-decoration:none}}@media(max-width:650px){.sheet{padding:24px}.report-head{align-items:flex-start;flex-direction:column}.report-title{text-align:left}.detail-grid{grid-template-columns:1fr}.approval{grid-template-columns:1fr}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save PDF</button><button onclick="window.close()">Close</button></div>
<main class="sheet"><header class="report-head"><div class="brand"><img src="${escapeHtml(logo)}" alt="The Branch Farm logo"/><div><strong>${escapeHtml(BUSINESS.name)}</strong><small>${escapeHtml(BUSINESS.slogan)}</small><p>${escapeHtml(BUSINESS.location)}</p></div></div><div class="report-title"><h1>${escapeHtml(options.title)}</h1>${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : ""}<span class="report-ref">${escapeHtml(options.reference)}</span></div></header>
<div class="meta-strip"><span><strong>Date generated:</strong> ${escapeHtml(generated)}</span><span><strong>Generated by:</strong> ${escapeHtml(options.generatedBy || "Authorized farm user")}</span></div>
${options.body}
<footer><span>${escapeHtml(BUSINESS.name)} · ${escapeHtml(BUSINESS.location)} · ${escapeHtml(BUSINESS.phoneDisplay)}</span><span>Confidential farm record · ${escapeHtml(options.reference)}</span></footer></main></body></html>`;
}

function openDocument(html: string) {
  if (typeof window === "undefined") return;
  const popup = window.open("", "_blank");
  if (!popup) {
    window.alert("Your browser blocked the report window. Allow pop-ups for this site and try again.");
    return;
  }
  popup.opener = null;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

function detail(label: string, value: unknown) {
  return `<div class="detail"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value || "—")}</strong></div>`;
}

export function printOperationRecord(
  record: FarmOperationRecord,
  definition: FarmModuleDefinition,
  generatedBy?: string,
  history: AuditEvent[] = [],
) {
  const sections = new Map<string, string[]>();
  for (const field of definition.fields) {
    const section = field.section || "Record details";
    const rows = sections.get(section) || [];
    const value = ["animal", "staff"].includes(field.type)
      ? record.values[`${field.key}Label`] || record.values[field.key]
      : record.values[field.key];
    rows.push(detail(field.label, formatOperationValue(field, value)));
    sections.set(section, rows);
  }
  const fields = Array.from(sections.entries())
    .map(([section, rows]) => `<section class="section"><h2>${escapeHtml(section)}</h2><div class="detail-grid">${rows.join("")}</div></section>`)
    .join("");
  const media = (record.attachments || []).filter((item) => item.resourceType === "image");
  const files = (record.attachments || []).filter((item) => item.resourceType !== "image");
  const attachments = record.attachments?.length
    ? `<section class="section"><h2>Photos & supporting documents</h2><div class="attachments">${media.map((item) => `<a href="${safeUrl(item.url)}" target="_blank"><img class="photo" src="${safeUrl(item.url)}" alt="${escapeHtml(item.name)}"/></a>`).join("")}${files.map((item) => `<a class="attachment" href="${safeUrl(item.url)}" target="_blank">${escapeHtml(item.name)}</a>`).join("")}</div></section>`
    : "";
  const review = record.reviewStatus !== "not-required"
    ? `<section class="section"><h2>Management review</h2><div class="detail-grid">${detail("Review status", record.reviewStatus)}${detail("Reviewed by", record.reviewedByName)}${detail("Review date", formatDate(record.reviewedAt, true))}${detail("Review note", record.reviewNote)}</div></section>`
    : "";
  const updateHistory = history.length
    ? `<section class="section"><h2>Update history</h2><table><thead><tr><th>Date / time</th><th>Who</th><th>Action</th><th>Details</th></tr></thead><tbody>${history.map((event) => `<tr><td>${escapeHtml(formatDate(event.createdAt, true))}</td><td>${escapeHtml(event.createdByName)}</td><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.description)}</td></tr>`).join("")}</tbody></table></section>`
    : "";
  const body = `<p><span class="status">${escapeHtml(record.status)}</span></p>${fields}${attachments}${review}${updateHistory}
<section class="section record-info"><h2>Record information</h2><div class="detail-grid">${detail("Recorded by", record.createdByName)}${detail("Date recorded", formatDate(record.createdAt, true))}${detail("Last updated by", record.updatedByName)}${detail("Last updated", formatDate(record.updatedAt, true))}</div></section>
<div class="approval"><div><div class="signature"></div><div class="signature-label">Staff signature / date</div></div><div><div class="signature"></div><div class="signature-label">Administrator approval / date</div></div></div>`;
  openDocument(baseDocument({
    title: `${definition.label} record`,
    subtitle: record.title,
    reference: record.reference,
    body,
    generatedBy,
  }));
}

export function printAnimalRecord(options: {
  animal: Animal;
  health: HealthRecord[];
  operations: FarmOperationRecord[];
  generatedBy?: string;
}) {
  const { animal, health, operations } = options;
  const photo = animal.photo ? `<section class="section"><img class="photo" style="width:280px;max-height:230px" src="${safeUrl(animal.photo)}" alt="${escapeHtml(animal.name || animal.animalId)}"/></section>` : "";
  const information = [
    ["Animal ID", animal.animalId], ["Tag number", animal.tagNumber], ["Name / nickname", animal.name], ["Type", animal.animalType],
    ["Breed", animal.breed], ["Sex", animal.sex], ["Date of birth", formatDisplayDate(animal.dateOfBirth)], ["Estimated age", animal.estimatedAge],
    ["Weight", animal.weight != null ? `${animal.weight} kg` : "—"], ["Colour", animal.colour], ["Identifying features", animal.identifyingFeatures],
    ["Current location", animal.location], ["Status", animal.status], ["Health status", animal.healthStatus],
  ].map(([label, value]) => detail(String(label), value)).join("");
  const acquisition = [
    ["Registration type", animal.registrationType], ["Acquisition / purchase date", formatDisplayDate(animal.acquisitionDate || animal.datePurchased)],
    ["Purchase price", money(animal.purchasePrice)], ["Seller / source", animal.supplier], ["Seller contact", animal.sellerContact],
    ["Purchased for", animal.purchasedFor], ["Transport information", animal.transportInformation],
  ].map(([label, value]) => detail(String(label), value)).join("");
  const healthRows = health.length ? health.map((entry) => `<tr><td>${escapeHtml(formatDisplayDate(entry.date))}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.problem)}</td><td>${escapeHtml(entry.medication || entry.treatment || entry.actionTaken || "—")}</td><td>${escapeHtml(formatDisplayDate(entry.nextDate))}</td><td>${escapeHtml(entry.createdByName)}</td></tr>`).join("") : `<tr><td colspan="6">No health records</td></tr>`;
  const activityRows = operations.length ? operations.map((entry) => `<tr><td>${escapeHtml(formatDisplayDate(entry.date))}</td><td>${escapeHtml(entry.module)}</td><td>${escapeHtml(entry.title)}</td><td>${escapeHtml(entry.status)}</td><td>${escapeHtml(entry.createdByName)}</td></tr>`).join("") : `<tr><td colspan="5">No linked operational history</td></tr>`;
  const body = `${photo}<section class="section"><h2>Animal information</h2><div class="detail-grid">${information}</div></section><section class="section"><h2>Acquisition</h2><div class="detail-grid">${acquisition}</div></section>
<section class="section"><h2>Health & vaccination history</h2><table><thead><tr><th>Date</th><th>Type</th><th>Observation / reason</th><th>Treatment / vaccine</th><th>Next date</th><th>Recorded by</th></tr></thead><tbody>${healthRows}</tbody></table></section>
<section class="section"><h2>Weight, breeding & activity history</h2><table><thead><tr><th>Date</th><th>Module</th><th>Record</th><th>Status</th><th>Recorded by</th></tr></thead><tbody>${activityRows}</tbody></table></section>
${animal.notes ? `<section class="section"><h2>Notes</h2><div class="notes">${escapeHtml(animal.notes)}</div></section>` : ""}
<section class="section record-info"><h2>Record information</h2><div class="detail-grid">${detail("Recorded by", animal.createdByName)}${detail("Created", formatDate(animal.createdAt, true))}${detail("Last updated by", animal.updatedByName)}${detail("Last updated", formatDate(animal.updatedAt, true))}</div></section><div class="approval"><div><div class="signature"></div><div class="signature-label">Prepared by / date</div></div><div><div class="signature"></div><div class="signature-label">Approved by / date</div></div></div>`;
  openDocument(baseDocument({ title: "Animal record", subtitle: `${animal.animalType} · ${animal.name || animal.animalId}`, reference: `ANM-${animal.animalId}`, body, generatedBy: options.generatedBy }));
}

export function printCustomerDocument(options: {
  kind: "quotation" | "receipt";
  reference: string;
  date: string;
  customer: string;
  items: Array<{ name: string; quantity: number; price: number; unit?: string }>;
  total: number;
  amountPaid?: number;
  balance?: number;
  status?: string;
  notes?: string;
}) {
  const rows = options.items.length
    ? options.items.map((item) => `<tr><td>${escapeHtml(item.name)}${item.unit ? ` (${escapeHtml(item.unit)})` : ""}</td><td class="num">${escapeHtml(item.quantity)}</td><td class="num">${escapeHtml(money(item.price))}</td><td class="num">${escapeHtml(money(item.quantity * item.price))}</td></tr>`).join("")
    : `<tr><td colspan="4">No line items recorded.</td></tr>`;
  const body = `<section class="section"><h2>Document information</h2><div class="detail-grid">${detail("Customer", options.customer)}${detail("Date", formatDisplayDate(options.date))}${detail("Status", options.status)}${detail("Reference", options.reference)}</div></section>
<section class="section"><h2>Items</h2><table><thead><tr><th>Description</th><th class="num">Quantity</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></section>
<section class="section"><h2>Totals</h2><div class="detail-grid">${detail("Grand total", money(options.total))}${options.amountPaid != null ? detail("Amount paid", money(options.amountPaid)) : ""}${options.balance != null ? detail("Balance", money(options.balance)) : ""}</div></section>
${options.notes ? `<section class="section"><h2>Notes</h2><div class="notes">${escapeHtml(options.notes)}</div></section>` : ""}<div class="approval"><div><div class="signature"></div><div class="signature-label">Customer / date</div></div><div><div class="signature"></div><div class="signature-label">Authorized by ${escapeHtml(BUSINESS.name)} / date</div></div></div>`;
  openDocument(baseDocument({ title: options.kind === "quotation" ? "Quotation" : "Receipt", subtitle: `Issued to ${options.customer}`, reference: options.reference, body, generatedBy: options.customer }));
}

export interface ReportColumn { key: string; label: string; align?: "left" | "right"; }
export interface ReportRow { [key: string]: string | number | boolean | null | undefined; }

export function printFarmReport(options: {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  dateFrom?: string;
  dateTo?: string;
  totals?: Array<{ label: string; value: string }>;
  generatedBy?: string;
}) {
  const reference = reportNumber("TBF-RPT");
  const rows = options.rows.length
    ? options.rows.map((row) => `<tr>${options.columns.map((column) => `<td class="${column.align === "right" ? "num" : ""}">${escapeHtml(row[column.key] ?? "—")}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${options.columns.length}">No records in the selected period.</td></tr>`;
  const totals = options.totals?.length ? `<section class="section"><h2>Summary</h2><div class="detail-grid">${options.totals.map((item) => detail(item.label, item.value)).join("")}</div></section>` : "";
  const period = options.dateFrom || options.dateTo ? `<p><strong>Reporting period:</strong> ${escapeHtml(formatDisplayDate(options.dateFrom))} – ${escapeHtml(formatDisplayDate(options.dateTo))}</p>` : "";
  const body = `${period}${totals}<section class="section"><h2>Report records</h2><table><thead><tr>${options.columns.map((column) => `<th class="${column.align === "right" ? "num" : ""}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></section><div class="approval"><div><div class="signature"></div><div class="signature-label">Prepared by / date</div></div><div><div class="signature"></div><div class="signature-label">Reviewed / approved by / date</div></div></div>`;
  openDocument(baseDocument({ title: options.title, subtitle: options.subtitle, reference, body, generatedBy: options.generatedBy }));
}

export function auditRows(events: AuditEvent[]): ReportRow[] {
  return events.map((event) => ({ date: formatDate(event.createdAt, true), staff: event.createdByName, action: event.action, record: event.entityLabel, description: event.description }));
}
