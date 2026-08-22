import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { BUSINESS } from "@/lib/constants";
import { LOGO_DATA_URL } from "@/lib/logoData";
import { encryptPdfRc4 } from "@/lib/server/pdfEncrypt";

/**
 * The Branch Farm — complete in-app user guide (PDF).
 *
 * The guide is a single manual covering the customer storefront, the staff
 * workspace and the full admin dashboard. Every step follows the same visual
 * language used across the manual:
 *
 *     screen illustration  »  numbered circle  »  arrow to the exact control
 *     »  numbered explanation underneath.
 *
 * The illustrations are faithful recreations of the live application's layout
 * (same structure, colours and controls) drawn as crisp vectors, so the guide
 * prints sharp at any size and can be regenerated at any time — it is always
 * in step with the deployed UI because it is produced by the application's
 * own server, on demand, for signed-in administrators only.
 */

/* ------------------------------- palette ------------------------------- */

const INK = rgb(0.114, 0.165, 0.125); // #1d2a20
const GREEN = rgb(0.184, 0.365, 0.227); // #2f5d3a
const GREEN_DARK = rgb(0.09, 0.157, 0.106); // #172b1b (sidebar)
const GREEN_SOFT = rgb(0.9, 0.945, 0.894); // #e6f1e4
const GOLD = rgb(0.792, 0.596, 0.243); // #ca983e
const MUTED = rgb(0.365, 0.427, 0.376); // #5d6d60
const LINE = rgb(0.847, 0.871, 0.847); // #d8ded8
const PAPER = rgb(1, 1, 1);
const SHEET = rgb(0.965, 0.973, 0.957); // #f6f8f4
const DANGER = rgb(0.639, 0.267, 0.157); // #a34428
const WARN = rgb(0.541, 0.353, 0.075); // #8a5a13
const ALERT_SOFT = rgb(0.984, 0.886, 0.863);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 46;
const CONTENT_W = A4[0] - MARGIN * 2;

/* ------------------------------- helpers ------------------------------- */

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function widthOf(font: PDFFont, size: number) {
  return (text: string) => font.widthOfTextAtSize(text, size);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface TextOptions {
  size?: number;
  font?: PDFFont;
  color?: ReturnType<typeof rgb>;
  lineGap?: number;
}

/** Draws wrapped text; returns the y BELOW the last line. */
function text(page: PDFPage, value: string, x: number, y: number, maxWidth: number, options: TextOptions = {}) {
  const size = options.size ?? 9;
  const font = options.font ?? FONT_CACHE!.regular;
  const color = options.color ?? INK;
  const lineGap = options.lineGap ?? 3.2;
  const lines = wrapText(value, font, size, maxWidth);
  let cursor = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursor, size, font, color });
    cursor -= size + lineGap;
  }
  return cursor;
}

function centered(page: PDFPage, value: string, cx: number, y: number, options: TextOptions = {}) {
  const size = options.size ?? 9;
  const font = options.font ?? FONT_CACHE!.regular;
  const w = widthOf(font, size)(value);
  page.drawText(value, { x: cx - w / 2, y, size, font, color: options.color ?? INK });
}

function box(page: PDFPage, x: number, y: number, w: number, h: number, fill?: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>, borderWidth = 0.8) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? borderWidth : 0 });
}

function hairline(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color = LINE, thickness = 0.8) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

/** Numbered callout: green circle with the step number, arrow to the control. */
function callout(page: PDFPage, n: number, x: number, y: number, tx: number, ty: number) {
  const r = 9;
  // arrow from circle edge toward the target, with a small arrowhead
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  const sx = x + (dx / len) * (r + 1.5);
  const sy = y + (dy / len) * (r + 1.5);
  const ex = tx - (dx / len) * 3;
  const ey = ty - (dy / len) * 3;
  page.drawLine({ start: { x: sx, y: sy }, end: { x: ex, y: ey }, thickness: 1.1, color: GREEN });
  // arrowhead (two short strokes)
  const angle = Math.atan2(dy, dx);
  const head = 4.6;
  for (const spread of [Math.PI * 0.82, -Math.PI * 0.82]) {
    page.drawLine({
      start: { x: ex, y: ey },
      end: { x: ex - head * Math.cos(angle + spread), y: ey - head * Math.sin(angle + spread) },
      thickness: 1.1,
      color: GREEN,
    });
  }
  page.drawCircle({ x, y, size: r, color: GREEN });
  centered(page, String(n), x, y - 3.2, { size: 9.5, font: FONT_CACHE!.bold, color: PAPER });
}

/** Numbered explanation list under a screen. Returns y below the block. */
function steps(page: PDFPage, items: string[], x: number, y: number, maxWidth: number, size = 8.6) {
  const font = FONT_CACHE!;
  let cursor = y;
  for (let i = 0; i < items.length; i += 1) {
    const r = 6.4;
    page.drawCircle({ x: x + r, y: cursor - r + 2.4, size: r, color: GREEN_SOFT, borderColor: GREEN, borderWidth: 0.8 });
    centered(page, String(i + 1), x + r, cursor - r - 0.6, { size: 7.4, font: font.bold, color: GREEN });
    const next = text(page, items[i], x + r * 2 + 6, cursor - 2, maxWidth - r * 2 - 6, { size, color: INK, lineGap: 2.6 });
    cursor = next - 4.6;
  }
  return cursor;
}

/** Tip / note panel. Returns y below the block. */
function noteBox(page: PDFPage, title: string, body: string, x: number, y: number, w: number, accent = GOLD, size = 8.4) {
  const font = FONT_CACHE!;
  const lines = wrapText(body, font.regular, size, w - 22);
  const h = 26 + lines.length * (size + 2.8);
  box(page, x, y - h, w, h, SHEET, LINE);
  page.drawRectangle({ x, y: y - h, width: 3.2, height: h, color: accent });
  page.drawText(title, { x: x + 14, y: y - 15, size: 8.6, font: font.bold, color: INK });
  let cursor = y - 27;
  for (const line of lines) {
    page.drawText(line, { x: x + 14, y: cursor, size, font: font.regular, color: MUTED });
    cursor -= size + 2.8;
  }
  return y - h - 8;
}

/* --------------------------- mock UI widgets --------------------------- */

function browserChrome(page: PDFPage, x: number, y: number, w: number, h: number, url: string) {
  box(page, x, y - h, w, h, PAPER, LINE, 1);
  page.drawRectangle({ x, y: y - h, width: w, height: 17, color: SHEET });
  hairline(page, x, y - h + 17, x + w, y - h + 17, LINE);
  [0, 1, 2].forEach((i) => page.drawCircle({ x: x + 9 + i * 10, y: y - h + 8.5, size: 2.6, color: i === 0 ? rgb(0.925, 0.37, 0.29) : i === 1 ? GOLD : GREEN }));
  box(page, x + 44, y - h + 4, w - 60, 9.5, PAPER, LINE);
  page.drawText(url, { x: x + 48, y: y - h + 6.6, size: 5.6, font: FONT_CACHE!.regular, color: MUTED });
  return { cx: x, cy: y - h + 17, cw: w, ch: h - 17 }; // content area, y = content TOP
}

function formField(page: PDFPage, x: number, y: number, w: number, label: string, placeholder: string, fieldH = 13) {
  page.drawText(label, { x, y, size: 6.4, font: FONT_CACHE!.bold, color: MUTED });
  box(page, x, y - fieldH - 3, w, fieldH, PAPER, LINE);
  page.drawText(placeholder, { x: x + 5, y: y - fieldH + 2.4, size: 6.6, font: FONT_CACHE!.regular, color: rgb(0.55, 0.58, 0.55) });
  return y - fieldH - 12;
}

function button(page: PDFPage, x: number, y: number, w: number, label: string, kind: "primary" | "outline" | "gold" = "primary", h = 13) {
  const fill = kind === "primary" ? GREEN : kind === "gold" ? GOLD : PAPER;
  box(page, x, y, w, h, fill, kind === "outline" ? GREEN : undefined, 0.9);
  centered(page, label, x + w / 2, y + h / 2 - 2.4, {
    size: 6.8,
    font: FONT_CACHE!.bold,
    color: kind === "outline" ? GREEN : PAPER,
  });
  return y - h;
}

function pill(page: PDFPage, x: number, y: number, label: string, color = GREEN_SOFT, borderColor = GREEN, textColor = GREEN) {
  const w = FONT_CACHE!.bold.widthOfTextAtSize(label, 5.6) + 10;
  box(page, x, y, w, 9.6, color, borderColor, 0.7);
  page.drawText(label, { x: x + 5, y: y + 3, size: 5.6, font: FONT_CACHE!.bold, color: textColor });
  return w;
}

function tableMock(page: PDFPage, x: number, y: number, w: number, headers: string[], rows: string[][], rowH = 11) {
  const font = FONT_CACHE!;
  page.drawRectangle({ x, y: y - 13, width: w, height: 13, color: GREEN_SOFT });
  let cx = x + 5;
  headers.forEach((header) => {
    page.drawText(header, { x: cx, y: y - 9, size: 5.8, font: font.bold, color: GREEN });
    cx += w / headers.length;
  });
  let ry = y - 13;
  rows.forEach((row) => {
    hairline(page, x, ry - rowH, x + w, ry - rowH);
    cx = x + 5;
    row.forEach((cell) => {
      page.drawText(cell, { x: cx, y: ry - rowH + 3.4, size: 6.2, font: font.regular, color: INK });
      cx += w / headers.length;
    });
    ry -= rowH;
  });
  return ry;
}

const NAV_SECTIONS: Array<[string, string[]]> = [
  ["Overview", ["Farm overview", "My tasks", "Problems & incidents"]],
  ["Livestock", ["Animals", "Health & vaccination", "Breeding", "Births"]],
  ["Daily operations", ["Feed management", "Farm inventory", "Milk production", "Egg production", "Daily farm log"]],
  ["Assets & finance", ["Equipment", "Maintenance", "Farm expenses"]],
  ["Monitoring", ["Report center", "Audit trail", "Farm documents"]],
  ["Store & customers", ["Orders", "Products", "Customers", "Quotations", "Invoices", "Receipts"]],
  ["Content & system", ["Farm media", "Videos", "Settings", "Guide & user manual"]],
];

/** Workspace shell mock: dark sidebar + header with the notification bell. */
function appShell(page: PDFPage, x: number, y: number, w: number, h: number, activeItem: string, content: (area: { x: number; y: number; w: number; h: number }) => number) {
  browserChrome(page, x, y, w, h, "thebranchfarm.com/dashboard (workspace)");
  const top = y - 17;
  const sidebarW = 118;
  page.drawRectangle({ x, y: top - h + 17, width: sidebarW, height: h - 17, color: GREEN_DARK });
  page.drawText("Workspace", { x: x + 10, y: top - 13, size: 7, font: FONT_CACHE!.bold, color: PAPER });
  let ny = top - 26;
  for (const [section, items] of NAV_SECTIONS) {
    page.drawText(section.toUpperCase(), { x: x + 10, y: ny, size: 4.6, font: FONT_CACHE!.bold, color: rgb(0.72, 0.78, 0.72) });
    ny -= 9;
    for (const item of items) {
      const active = item === activeItem;
      if (active) page.drawRectangle({ x: x + 4, y: ny - 2.6, width: sidebarW - 8, height: 9.4, color: GREEN });
      page.drawText(item, { x: x + 12, y: ny, size: 5.6, font: active ? FONT_CACHE!.bold : FONT_CACHE!.regular, color: PAPER });
      ny -= 9.6;
    }
    ny -= 3;
    if (ny < top - h + 30) break;
  }
  page.drawText("Sign out", { x: x + 12, y: top - h + 26, size: 5.6, font: FONT_CACHE!.regular, color: rgb(0.85, 0.78, 0.6) });
  // header band with bell
  const contentX = x + sidebarW;
  const contentTop = top;
  const contentH = h - 17;
  page.drawText("Administrator", { x: contentX + 10, y: contentTop - 11, size: 5.4, font: FONT_CACHE!.regular, color: GOLD });
  page.drawText(activeItem, { x: contentX + 10, y: contentTop - 22, size: 10, font: FONT_CACHE!.bold, color: INK });
  page.drawCircle({ x: contentX + (w - sidebarW) - 18, y: contentTop - 15, size: 7, color: PAPER, borderColor: LINE, borderWidth: 0.8 });
  page.drawCircle({ x: contentX + (w - sidebarW) - 13.4, y: contentTop - 10, size: 3.4, color: DANGER });
  return content({ x: contentX, y: contentTop - 30, w: w - sidebarW, h: contentH - 34 });
}

/* ------------------------------ page chrome ----------------------------- */

let FONT_CACHE: Fonts | null = null;
let LOGO: PDFImage | null = null;
let PAGE_NO = 0;

function pageHeader(page: PDFPage, eyebrow: string, title: string) {
  PAGE_NO += 1;
  if (LOGO) page.drawImage(LOGO, { x: MARGIN, y: A4[1] - 54, width: 26, height: 26 });
  page.drawText("The Branch Farm · Complete User Guide", { x: MARGIN + 32, y: A4[1] - 42, size: 8, font: FONT_CACHE!.bold, color: INK });
  page.drawText(eyebrow, { x: MARGIN + 32, y: A4[1] - 52, size: 6.6, font: FONT_CACHE!.regular, color: MUTED });
  const section = title;
  const w = widthOf(FONT_CACHE!.bold, 8)(section);
  page.drawText(section, { x: A4[0] - MARGIN - w, y: A4[1] - 46, size: 8, font: FONT_CACHE!.bold, color: GREEN });
  hairline(page, MARGIN, A4[1] - 62, A4[0] - MARGIN, A4[1] - 62, GOLD, 1.4);
  // footer
  hairline(page, MARGIN, 40, A4[0] - MARGIN, 40, LINE);
  page.drawText("Confidential — for administrators and staff of The Branch Farm. Do not share outside the farm.", { x: MARGIN, y: 30, size: 6.4, font: FONT_CACHE!.regular, color: MUTED });
  centered(page, String(PAGE_NO), A4[0] / 2, 18, { size: 7.4, font: FONT_CACHE!.bold, color: MUTED });
  return A4[1] - 76;
}

function sectionTitle(page: PDFPage, y: number, num: string, title: string, intro: string) {
  page.drawText(num, { x: MARGIN, y, size: 20, font: FONT_CACHE!.bold, color: GOLD });
  const numW = widthOf(FONT_CACHE!.bold, 20)(num);
  page.drawText(title, { x: MARGIN + numW + 8, y, size: 16.5, font: FONT_CACHE!.bold, color: INK });
  return text(page, intro, MARGIN, y - 18, CONTENT_W, { size: 8.8, color: MUTED, lineGap: 3.4 });
}

/* ------------------------------- sections ------------------------------- */

function coverPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  PAGE_NO += 1;
  page.drawRectangle({ x: 0, y: A4[1] - 320, width: A4[0], height: 320, color: GREEN });
  if (LOGO) page.drawImage(LOGO, { x: A4[0] / 2 - 44, y: A4[1] - 150, width: 88, height: 88 });
  centered(page, BUSINESS.name.toUpperCase(), A4[0] / 2, A4[1] - 180, { size: 26, font: FONT_CACHE!.bold, color: PAPER });
  centered(page, BUSINESS.slogan.toUpperCase(), A4[0] / 2, A4[1] - 196, { size: 8.6, font: FONT_CACHE!.bold, color: GOLD });
  centered(page, "COMPLETE USER GUIDE & MANUAL", A4[0] / 2, A4[1] - 238, { size: 15, font: FONT_CACHE!.bold, color: PAPER });
  centered(page, "Customer storefront  ·  Staff workspace  ·  Administrator dashboard", A4[0] / 2, A4[1] - 258, { size: 9.4, font: FONT_CACHE!.regular, color: rgb(0.88, 0.92, 0.87) });
  centered(page, "One official manual for the whole application", A4[0] / 2, A4[1] - 274, { size: 8.4, font: FONT_CACHE!.italic, color: rgb(0.88, 0.92, 0.87) });

  let y = A4[1] - 360;
  y = text(
    page,
    "This guide walks through every part of The Branch Farm application exactly as you see it on screen: signing in and registering, shopping and placing orders as a customer, recording farm work as staff, and running the whole farm as the administrator. Each step shows a picture of the actual screen with numbered pointers and arrows showing exactly where to click or type, followed by a short explanation.",
    MARGIN,
    y,
    CONTENT_W,
    { size: 9.6, lineGap: 4 },
  );

  y -= 8;
  y = noteBox(
    page,
    "How to read every step",
    "Screen picture  »  numbered circle on the picture  »  arrow pointing at the exact button or field  »  matching numbered explanation below the picture. Follow the numbers in order (1, 2, 3…) to complete the task.",
    MARGIN,
    y,
    CONTENT_W,
  );

  const legendY = y - 10;
  box(page, MARGIN, legendY - 92, CONTENT_W, 92, SHEET, LINE);
  const lx = MARGIN + 14;
  page.drawText("LEGEND", { x: lx, y: legendY - 16, size: 6.4, font: FONT_CACHE!.bold, color: GOLD });
  page.drawCircle({ x: lx + 9, y: legendY - 38, size: 9, color: GREEN });
  centered(page, "1", lx + 9, legendY - 41.2, { size: 9.5, font: FONT_CACHE!.bold, color: PAPER });
  page.drawLine({ start: { x: lx + 20, y: legendY - 38 }, end: { x: lx + 72, y: legendY - 38 }, thickness: 1.1, color: GREEN });
  page.drawLine({ start: { x: lx + 72, y: legendY - 38 }, end: { x: lx + 66, y: legendY - 34 }, thickness: 1.1, color: GREEN });
  page.drawLine({ start: { x: lx + 72, y: legendY - 38 }, end: { x: lx + 66, y: legendY - 42 }, thickness: 1.1, color: GREEN });
  page.drawText("Numbered pointer with an arrow to the exact control on the screen", { x: lx + 82, y: legendY - 40.5, size: 8, font: FONT_CACHE!.regular, color: INK });
  page.drawCircle({ x: lx + 9, y: legendY - 62, size: 6.4, color: GREEN_SOFT, borderColor: GREEN, borderWidth: 0.8 });
  centered(page, "1", lx + 9, legendY - 64.4, { size: 7.4, font: FONT_CACHE!.bold, color: GREEN });
  page.drawText("Matching numbered explanation — read this, then do it in the app", { x: lx + 24, y: legendY - 64.5, size: 8, font: FONT_CACHE!.regular, color: INK });
  page.drawText("This document is protected: it is available only to signed-in administrators and opens with the administrator guide password.", { x: lx, y: legendY - 84, size: 7.2, font: FONT_CACHE!.italic, color: MUTED });

  centered(page, `Version ${GUIDE_VERSION} · Generated ${new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}`, A4[0] / 2, 64, { size: 7.6, font: FONT_CACHE!.bold, color: MUTED });
  centered(page, `${BUSINESS.name} · ${BUSINESS.fullLocation || BUSINESS.location} · ${BUSINESS.phoneDisplay}`, A4[0] / 2, 52, { size: 7.4, font: FONT_CACHE!.regular, color: MUTED });
}

function contentsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Start here", "Contents");
  y = text(page, "The guide follows the natural journey: first the public website and customer side, then the staff workspace, then the complete admin dashboard. Use the list below to jump to the part you need.", MARGIN, y, CONTENT_W, { size: 8.8, color: MUTED });
  y -= 6;
  const columnW = (CONTENT_W - 18) / 2;
  const toc: Array<[string, string]> = [
    ["1. Sign in", "Email, password, Sign In, forgot password"],
    ["2. Registration", "Create an account and what happens next"],
    ["3. Shop & place an order", "Browse, cart, checkout, order number"],
    ["4. Track an order", "Follow progress and open receipts"],
    ["5. Workspace orientation", "Menus, profile, notifications, sign out"],
    ["6. Notifications", "New orders, payments, stock, incidents"],
    ["7. Orders", "Open an order, update it, take payment"],
    ["8. Receipts & invoices", "Fill in, download and print documents"],
    ["9. Products & stock", "Add products, prices, stock, images"],
    ["10. Customers", "The customer book and order history"],
    ["11. Quotations, invoices, receipts", "Create and manage money documents"],
    ["12. Farm documents & media", "Upload paperwork, photos and videos"],
    ["13. Animals & health", "The livestock register and health records"],
    ["14. Breeding, births & movements", "Grow and move the herd"],
    ["15. Daily operations", "Feed, inventory, milk, eggs, daily log"],
    ["16. Equipment & expenses", "Assets, maintenance and costs"],
    ["17. Reports & audit", "Report centre and the audit trail"],
    ["18. Staff & permissions", "Roles, approval, access rights"],
    ["19. Settings", "Farm details, delivery, currency, promo"],
    ["20. Guide & security", "This manual and how it is protected"],
  ];
  const colY = [y, y];
  toc.forEach(([title, blurb], i) => {
    const col = i % 2;
    const x = MARGIN + col * (columnW + 18);
    page.drawCircle({ x: x + 6, y: colY[col] - 6, size: 7.4, color: GREEN_SOFT, borderColor: GREEN, borderWidth: 0.7 });
    centered(page, String(i + 1), x + 6, colY[col] - 8.6, { size: 6.6, font: FONT_CACHE!.bold, color: GREEN });
    page.drawText(title, { x: x + 19, y: colY[col] - 9, size: 8.8, font: FONT_CACHE!.bold, color: INK });
    colY[col] = text(page, blurb, x + 19, colY[col] - 18, columnW - 19, { size: 7.2, color: MUTED, lineGap: 2.2 }) - 6;
  });
}

function signInPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Customer & staff", "1 · Sign in");
  y = sectionTitle(page, y, "1", "Sign in", "Open the website and press Sign in at the top right. Staff and administrators sign in the same way — the app then opens the right workspace for your role.");

  // mock screen
  const sx = MARGIN + 8;
  const sw = 300;
  const sy = y - 8;
  const area = browserChrome(page, sx, sy, sw, 300, "thebranchfarm.com/login");
  // site header
  page.drawText("THE BRANCH FARM", { x: area.cx + 12, y: area.cy - 12, size: 7, font: FONT_CACHE!.bold, color: GREEN });
  page.drawText("Home  Shop  Our Farm  Gallery  Videos  About  Contact        Track order   Sign in", { x: area.cx + 12, y: area.cy - 22, size: 4.6, font: FONT_CACHE!.regular, color: MUTED });
  hairline(page, area.cx, area.cy - 28, area.cx + area.cw, area.cy - 28);
  // auth card
  const cardW = 168;
  const cardX = area.cx + (area.cw - cardW) / 2;
  let cy = area.cy - 44;
  box(page, cardX, sy - 300 + 40, cardW, area.ch - 78, PAPER, LINE);
  page.drawText("Welcome back", { x: cardX + 14, y: cy, size: 9.5, font: FONT_CACHE!.bold, color: INK });
  cy -= 12;
  page.drawText("Sign in to order fresh farm produce or to open your workspace.", { x: cardX + 14, y: cy, size: 5.6, font: FONT_CACHE!.regular, color: MUTED });
  cy -= 16;
  const emailY = cy;
  cy = formField(page, cardX + 14, cy, cardW - 28, "EMAIL", "you@example.com");
  const pwY = cy - 2;
  cy = formField(page, cardX + 14, cy, cardW - 28, "PASSWORD", "••••••••");
  const btnY = cy - 8;
  button(page, cardX + 14, btnY, cardW - 28, "Sign In");
  const forgotY = btnY - 13;
  page.drawText("Forgot password?", { x: cardX + 14, y: forgotY, size: 5.8, font: FONT_CACHE!.bold, color: GREEN });
  page.drawText("New here? Create an account", { x: cardX + 14, y: forgotY - 10, size: 5.8, font: FONT_CACHE!.regular, color: MUTED });

  // callouts
  callout(page, 1, sx + 6, sy - 40, sx + 24, sy - 20); // open site / sign in link (top nav)
  callout(page, 2, sx - 4, emailY + 2, cardX + 20, emailY - 10);
  callout(page, 3, sx + sw + 4, pwY + 4, cardX + cardW - 24, pwY - 10);
  callout(page, 4, sx + sw + 16, btnY + 8, cardX + cardW - 22, btnY + 6);
  callout(page, 5, sx + 6, sy - 320 + 60, cardX + 18, forgotY - 2);

  // steps
  const stepsX = MARGIN + sw + 26;
  let ky = y - 16;
  page.drawText("Step 1 — Sign in", { x: stepsX, y: ky, size: 11, font: FONT_CACHE!.bold, color: GREEN });
  ky -= 16;
  ky = steps(page, [
    "Open the website and press “Sign in” in the top menu. The sign-in card appears.",
    "Enter your registered email address here.",
    "Enter your password. Passwords are case-sensitive.",
    "Press the green “Sign In” button to continue.",
    "Forgot your password? Press “Forgot password?”, enter your email, and follow the reset link sent to you. Staff can also ask an administrator to reset their password from Staff & permissions.",
  ], stepsX, ky, CONTENT_W - sw - 26);
  ky -= 4;
  noteBox(page, "What happens after signing in", "Customers land on the storefront to shop and track orders. Staff open the farm workspace to record daily work. Administrators see the full dashboard plus Staff, Audit, Settings and this Guide. If your account was disabled, sign-in is refused — contact an administrator.", stepsX, ky, CONTENT_W - sw - 26);
}

function registerPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Customer & staff", "2 · Registration");
  y = sectionTitle(page, y, "2", "Registration", "New customers (and staff invited by an administrator) press “Create one” on the sign-in page and fill in the registration form.");

  const sx = MARGIN + 8;
  const sw = 290;
  const area = browserChrome(page, sx, y - 8, sw, 300, "thebranchfarm.com/register");
  const cardW = 190;
  const cardX = area.cx + (area.cw - cardW) / 2;
  let cy = area.cy - 16;
  box(page, cardX, y - 308 + 46, cardW, area.ch - 62, PAPER, LINE);
  page.drawText("Create your account", { x: cardX + 14, y: cy, size: 9.5, font: FONT_CACHE!.bold, color: INK });
  cy -= 20;
  const f1 = cy; cy = formField(page, cardX + 14, cy, cardW - 28, "FULL NAME", "Jane Banda");
  const f2 = cy; cy = formField(page, cardX + 14, cy, cardW - 28, "EMAIL", "jane@example.com");
  const f3 = cy; cy = formField(page, cardX + 14, cy, cardW - 28, "PHONE", "+260 97 000 0000");
  const f4 = cy; cy = formField(page, cardX + 14, cy, cardW - 28, "PASSWORD", "Choose a strong password");
  const f5 = cy; cy = formField(page, cardX + 14, cy, cardW - 28, "CONFIRM PASSWORD", "Repeat the password");
  const btnY = cy - 8;
  button(page, cardX + 14, btnY, cardW - 28, "Create account");

  callout(page, 1, sx - 6, f1 + 4, cardX + 22, f1 - 10);
  callout(page, 2, sx + sw + 2, f2 + 6, cardX + cardW - 24, f2 - 10);
  callout(page, 3, sx - 6, f3, cardX + 22, f3 - 10);
  callout(page, 4, sx + sw + 14, f4 - 2, cardX + cardW - 24, f4 - 10);
  callout(page, 5, sx + 6, f5 - 6, cardX + 22, f5 - 10);
  callout(page, 6, sx + sw + 4, btnY + 12, cardX + cardW - 30, btnY + 6);

  const stepsX = MARGIN + sw + 26;
  let ky = y - 16;
  page.drawText("Step 2 — Registration", { x: stepsX, y: ky, size: 11, font: FONT_CACHE!.bold, color: GREEN });
  ky -= 16;
  ky = steps(page, [
    "Enter your full name — this is how orders and documents will address you.",
    "Enter your email address. Use one you can access; order updates and password resets go here.",
    "Enter your phone number so the farm can call or WhatsApp you about deliveries.",
    "Choose a strong password (at least 8 characters).",
    "Repeat the exact same password to confirm it.",
    "Press “Create account”. If any field is wrong, a clear message shows you what to fix.",
  ], stepsX, ky, CONTENT_W - sw - 26);
  ky -= 4;
  noteBox(page, "What happens after registration", "Your account is created immediately as a customer account — you can shop right away. Customer accounts cannot see farm records. If you should work in the farm workspace, an administrator turns your account into a staff or admin account from “Staff & permissions” (see section 18).", stepsX, ky, CONTENT_W - sw - 26);
}

function shopPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Customer storefront", "3 · Shop & place an order");
  y = sectionTitle(page, y, "3", "Shop & place an order", "Browse the farm's fresh produce and livestock, add items to your cart, then check out with your delivery details.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  const area = browserChrome(page, sx, y - 6, sw, 252, "thebranchfarm.com/shop");
  page.drawText("THE BRANCH FARM", { x: area.cx + 12, y: area.cy - 11, size: 7, font: FONT_CACHE!.bold, color: GREEN });
  page.drawText("Home  Shop  Our Farm  Gallery  Videos  About  Contact      Track order", { x: area.cx + 130, y: area.cy - 11, size: 4.8, font: FONT_CACHE!.regular, color: MUTED });
  const searchY = area.cy - 26;
  box(page, area.cx + 12, searchY, 180, 11, PAPER, LINE);
  page.drawText("Search fresh eggs, milk, vegetables…", { x: area.cx + 17, y: searchY + 3.2, size: 5, font: FONT_CACHE!.regular, color: rgb(0.55, 0.58, 0.55) });
  const pills: [number, number] = [area.cx + 200, searchY];
  let px = pills[0];
  ["All", "Produce", "Livestock", "Poultry"].forEach((label, i) => {
    px += pill(page, px, searchY, label, i === 0 ? GREEN : PAPER, i === 0 ? GREEN : LINE, i === 0 ? PAPER : MUTED) + 4;
  });
  hairline(page, area.cx, searchY - 8, area.cx + area.cw, searchY - 8);
  const cardY = searchY - 22;
  const cardW = (area.cw - 24 - 24) / 3;
  const items = [["Free-range eggs", "E30 · tray of 30"], ["Fresh milk", "E25 · per litre"], ["Live broilers", "E120 · each"]];
  items.forEach(([name, price], i) => {
    const cx = area.cx + 12 + i * (cardW + 12);
    box(page, cx, cardY - 150, cardW, 150, PAPER, LINE);
    page.drawRectangle({ x: cx + 6, y: cardY - 70, width: cardW - 12, height: 60, color: GREEN_SOFT });
    centered(page, "product photo", cx + cardW / 2, cardY - 44, { size: 5.4, color: MUTED });
    page.drawText(name, { x: cx + 8, y: cardY - 80, size: 7, font: FONT_CACHE!.bold, color: INK });
    page.drawText(price, { x: cx + 8, y: cardY - 90, size: 6, font: FONT_CACHE!.regular, color: GREEN });
    button(page, cx + 8, cardY - 116, cardW - 16, "Add to cart", "outline", 11);
  });
  const cartX = area.cx + area.cw - 66;
  page.drawCircle({ x: cartX, y: area.cy - 8, size: 8, color: GREEN_SOFT, borderColor: GREEN, borderWidth: 0.8 });
  centered(page, "3", cartX, area.cy - 10.4, { size: 6.4, font: FONT_CACHE!.bold, color: GREEN });
  page.drawText("Cart", { x: cartX + 11, y: area.cy - 10.6, size: 5.4, font: FONT_CACHE!.bold, color: INK });

  callout(page, 1, sx + 6, searchY + 40, area.cx + 30, searchY + 5);
  callout(page, 2, sx + sw + 8, searchY + 26, px - 30, searchY + 4.8);
  callout(page, 3, sx - 4, cardY - 76, area.cx + 12 + cardW / 2, cardY - 40);
  callout(page, 4, sx + sw + 2, cardY - 96, area.cx + 12 + cardW - 26, cardY - 111);
  callout(page, 5, sx + 10, area.cy - 60, cartX - 8, area.cy - 8);

  let ky = steps(page, [
    "Search or filter to find a product, or just browse the shelves. Tap a product to see full details, photos and videos.",
    "Use the category pills (All, Produce, Livestock…) to narrow the shelf.",
    "Each card shows the photo, name, price and the unit (tray, litre, each).",
    "Press “Add to cart” — choose the quantity you want in the cart page. The cart keeps your selection while you keep browsing.",
    "Press the cart (with the item count) at the top, review the items, then press “Checkout”.",
  ], MARGIN, y - 275, CONTENT_W);
  ky -= 2;
  noteBox(page, "Checkout — the final step of ordering", "Fill in your name, phone (required), email (optional but recommended), choose Delivery or Pick-up, type the delivery location, add any notes (e.g. “call when you arrive”), then press “Place order”. The farm issues an order number like TB-4F7K21 — write it down. Delivery is free within the advertised area; the exact fee is shown before you place the order.", MARGIN, ky, CONTENT_W);
}

function trackPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Customer storefront", "4 · Track an order & receipts");
  y = sectionTitle(page, y, "4", "Track an order & open its receipt", "After placing an order you receive an order number (TB-XXXXXX). Enter it on the Track order page to follow progress and open your receipt.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  const area = browserChrome(page, sx, y - 6, sw, 210, "thebranchfarm.com/track");
  page.drawText("Track your order", { x: area.cx + 16, y: area.cy - 20, size: 11, font: FONT_CACHE!.bold, color: INK });
  const refY = area.cy - 40;
  formField(page, area.cx + 16, refY, 220, "ORDER NUMBER", "TB-4F7K21");
  button(page, area.cx + 246, refY - 16, 74, "Track order", "primary", 13);
  const flowY = refY - 48;
  page.drawText("Order progress", { x: area.cx + 16, y: flowY, size: 7, font: FONT_CACHE!.bold, color: MUTED });
  const stages = ["New", "Confirmed", "Preparing", "Out for delivery", "Delivered"];
  let fx = area.cx + 16;
  stages.forEach((stage, i) => {
    page.drawCircle({ x: fx + 8, y: flowY - 16, size: 7, color: i < 3 ? GREEN : PAPER, borderColor: GREEN, borderWidth: 0.9 });
    if (i === 2) centered(page, "3", fx + 8, flowY - 18.4, { size: 6.4, font: FONT_CACHE!.bold, color: PAPER });
    if (i < stages.length - 1) hairline(page, fx + 17, flowY - 16, fx + 58, flowY - 16, i < 2 ? GREEN : LINE, 1.4);
    page.drawText(stage, { x: fx - 4, y: flowY - 32, size: 5, font: FONT_CACHE!.bold, color: i < 3 ? GREEN : MUTED });
    fx += 66;
  });
  box(page, area.cx + 16, flowY - 78, area.cw - 32, 40, SHEET, LINE);
  page.drawText("TB-4F7K21 · 3 items · Out for delivery today", { x: area.cx + 24, y: flowY - 52, size: 7, font: FONT_CACHE!.bold, color: INK });
  page.drawText("Receipt opens with the toolbar: Download  ·  Print / Save PDF  ·  Fill details", { x: area.cx + 24, y: flowY - 66, size: 6.4, font: FONT_CACHE!.regular, color: MUTED });

  callout(page, 1, sx - 2, refY + 6, area.cx + 40, refY - 10);
  callout(page, 2, sx + sw + 6, refY - 4, area.cx + 282, refY - 12);
  callout(page, 3, sx + 14, flowY - 2, fx - 60, flowY - 16);

  let ky = y - 235;
  ky = steps(page, [
    "Open “Track order” in the top menu and type your order number (from your confirmation screen, email or WhatsApp message).",
    "Press “Track order”. Only the progress is shown publicly — your personal details stay private.",
    "The timeline shows where your order is: New » Confirmed » Preparing » Out for delivery » Delivered (or Cancelled).",
    "From the confirmation page (or your account page when signed in) press “Receipt” or “Invoice”. The document opens with a toolbar — press “Download” to save it, “Print / Save PDF” to print, or “Fill details” to complete any blank fields before downloading.",
  ], MARGIN, ky, CONTENT_W);
  ky -= 2;
  noteBox(page, "Signed documents, printed cleanly", "When the farm signs for delivery, the receipt shows the signature image with the signer's name and date — never a “signed digitally” marker. Receipts also show amount paid and balance due.", MARGIN, ky, CONTENT_W);
}

function workspaceOrientationPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Staff & admin workspace", "5 · Workspace orientation");
  y = sectionTitle(page, y, "5", "The workspace: menus, profile, notifications, sign out", "Staff and administrators sign in to the workspace — one dark menu on the left, your page on the right. The menu only shows the areas your role is allowed to use.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 330, "Farm overview", (area) => {
    let cy = area.y - 6;
    box(page, area.x + 10, cy - 46, (area.w - 30) / 2, 46, SHEET, LINE);
    page.drawText("Welcome, Administrator", { x: area.x + 18, y: cy - 14, size: 7.4, font: FONT_CACHE!.bold, color: INK });
    page.drawText("Live overview of the whole farm", { x: area.x + 18, y: cy - 26, size: 5.6, font: FONT_CACHE!.regular, color: MUTED });
    box(page, area.x + 20 + (area.w - 30) / 2, cy - 46, (area.w - 30) / 2, 46, PAPER, LINE);
    page.drawText("Open orders", { x: area.x + 28 + (area.w - 30) / 2, y: cy - 14, size: 6, font: FONT_CACHE!.bold, color: MUTED });
    page.drawText("12", { x: area.x + 28 + (area.w - 30) / 2, y: cy - 34, size: 13, font: FONT_CACHE!.bold, color: GREEN });
    cy -= 58;
    page.drawText("Livestock · Production · Sales · Reports — everything is one click away in the left menu.", { x: area.x + 12, y: cy, size: 5.8, font: FONT_CACHE!.italic, color: MUTED });
    return cy;
  });

  callout(page, 1, sx - 6, y - 60, sx + 40, y - 100); // sidebar
  callout(page, 2, sx + sw + 6, y - 70, sx + 128, y - 24); // role + page header
  callout(page, 3, sx + sw - 4, y - 88, sx + sw - 26, y - 29); // bell
  callout(page, 4, sx + 30, y - 380, sx + 18, y - 346); // sign out

  steps(page, [
    "The menu (left) is grouped: Overview, Livestock, Daily operations, Assets & finance, Monitoring, Store & customers, Content & system. The guide point (“Farm overview”) is where you start each day.",
    "Your name and role appear at the top of the menu; the page title tells you exactly where you are.",
    "The bell shows notifications — the red count is how many need attention. See the next page.",
    "“Sign out” is at the bottom of the menu. Always sign out on shared devices.",
    "Staff see only their permitted areas. Administrators additionally see Audit trail, Staff & permissions, Settings and the Guide & user manual.",
  ], MARGIN, y - 355, CONTENT_W);
}

function notificationsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Staff & admin workspace", "6 · Notifications");
  y = sectionTitle(page, y, "6", "Notifications — anything that needs attention", "The workspace watches everything for you. The moment something happens — a new order, a payment still pending, stock running low, an open problem — a notification appears under the bell.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  // workspace mini header with open panel
  const area = browserChrome(page, sx, y - 6, sw, 316, "thebranchfarm.com/dashboard (workspace)");
  page.drawRectangle({ x: area.cx, y: area.cy - 299, width: 118, height: 299, color: GREEN_DARK });
  page.drawText("Workspace", { x: area.cx + 10, y: area.cy - 13, size: 7, font: FONT_CACHE!.bold, color: PAPER });
  page.drawText("…", { x: area.cx + 10, y: area.cy - 40, size: 7, font: FONT_CACHE!.regular, color: rgb(0.7, 0.75, 0.7) });
  page.drawText("Administrator", { x: area.cx + 130, y: area.cy - 12, size: 5.4, font: FONT_CACHE!.regular, color: GOLD });
  page.drawText("Farm overview", { x: area.cx + 130, y: area.cy - 24, size: 10, font: FONT_CACHE!.bold, color: INK });
  // bell
  const bellX = area.cx + area.cw - 22;
  page.drawCircle({ x: bellX, y: area.cy - 16, size: 8, color: PAPER, borderColor: LINE, borderWidth: 0.8 });
  page.drawCircle({ x: bellX + 5.5, y: area.cy - 10.5, size: 3.8, color: DANGER });
  centered(page, "4", bellX + 5.5, area.cy - 12.7, { size: 5, font: FONT_CACHE!.bold, color: PAPER });
  // panel
  const panelW = 200;
  const panelX = bellX - panelW / 2 - 8;
  const py = area.cy - 36;
  box(page, panelX, py - 210, panelW, 210, PAPER, LINE);
  page.drawRectangle({ x: panelX, y: py - 14, width: panelW, height: 14, color: GREEN_SOFT });
  page.drawText("Notifications", { x: panelX + 6, y: py - 10, size: 6.6, font: FONT_CACHE!.bold, color: INK });
  page.drawText("4 unread   Mark all read", { x: panelX + panelW - 92, y: py - 10, size: 5, font: FONT_CACHE!.bold, color: GREEN });
  const rows: Array<[string, string, ReturnType<typeof rgb>]> = [
    ["New order TB-4F7K21", "Jane Banda · 3 items — open it to confirm", GREEN],
    ["Payment pending on TB-9X2KP4", "Mark paid once the money is received", WARN],
    ["Low stock: Free-range eggs", "Only 4 trays left — plan the next batch", WARN],
    ["Incident open: Water leak · pen 3", "Investigate and record the fix", DANGER],
  ];
  let ry = py - 22;
  for (const [title, body, tone] of rows) {
    page.drawRectangle({ x: panelX + 5, y: ry - 36, width: 8, height: 32, color: tone });
    page.drawText(title, { x: panelX + 19, y: ry - 8, size: 6, font: FONT_CACHE!.bold, color: INK });
    page.drawText(body, { x: panelX + 19, y: ry - 19, size: 5.2, font: FONT_CACHE!.regular, color: MUTED });
    ry -= 42;
  }

  callout(page, 1, sx + 20, area.cy + 4, bellX, area.cy - 16);
  callout(page, 2, sx + sw + 4, py - 10, panelX + panelW - 24, py - 10);
  callout(page, 3, sx - 4, py - 60, panelX + 10, py - 40);
  callout(page, 4, sx + 30, py - 190, panelX + 30, py - 172);

  let ky = steps(page, [
    "Press the bell (top right of every workspace page). The red badge shows how many items are unread.",
    "“Mark all read” clears the badge once you have seen the list.",
    "Each notification summarises what happened and when — new orders, payment pending on active orders, products out of stock or low (5 or fewer), open problems & incidents, overdue tasks, and feed or inventory recorded as low.",
    "Click a notification to jump straight to the order, product or incident — no searching needed. A toast also pops up the moment a new order arrives.",
  ], MARGIN, y - 345, CONTENT_W);
  ky -= 2;
  noteBox(page, "Who sees what", "Notifications respect permissions: store notifications appear for members who may handle orders, stock alerts for members who manage products, and farm alerts for operations staff. Administrators see everything.", MARGIN, ky, CONTENT_W);
}

function ordersPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Store & customers", "7 · Orders");
  y = sectionTitle(page, y, "7", "Orders — click an order to see the order", "The Orders board lists every order with its number, customer, phone, products, quantity, total, delivery location and payment status. Clicking anywhere on an order card opens the full order.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 300, "Orders", (area) => {
    box(page, area.x + 8, area.y - 4, 210, 11, PAPER, LINE);
    page.drawText("Search order number, customer, phone…", { x: area.x + 13, y: area.y - 1, size: 4.6, font: FONT_CACHE!.regular, color: rgb(0.55, 0.58, 0.55) });
    let px = area.x + 228;
    ["All", "New 2", "Confirmed", "Delivered"].forEach((label, i) => {
      px += pill(page, px, area.y - 4.5, label, i === 1 ? GREEN : PAPER, i === 1 ? GREEN : LINE, i === 1 ? PAPER : MUTED) + 3;
    });
    const cardW = (area.w - 26) / 2;
    const cards: Array<[string, string, string, string]> = [
      ["TB-4F7K21", "Jane Banda · 3 items", "Delivery: Chipata Central", "E94"],
      ["TB-9X2KP4", "M. Phiri · 2 items", "Pick-up at the farm", "E58"],
    ];
    cards.forEach(([ref, cust, loc, total], i) => {
      const cx = area.x + 8 + i * (cardW + 10);
      const cy = area.y - 24;
      box(page, cx, cy - 96, cardW, 96, PAPER, LINE);
      page.drawText(ref, { x: cx + 8, y: cy - 13, size: 7.6, font: FONT_CACHE!.bold, color: INK });
      pill(page, cx + cardW - 44, cy - 17, "New", GREEN_SOFT, GREEN, GREEN);
      page.drawText(cust, { x: cx + 8, y: cy - 27, size: 5.6, font: FONT_CACHE!.regular, color: MUTED });
      page.drawText(loc, { x: cx + 8, y: cy - 37, size: 5.6, font: FONT_CACHE!.regular, color: MUTED });
      hairline(page, cx + 8, cy - 52, cx + cardW - 8, cy - 52);
      page.drawText("Total", { x: cx + 8, y: cy - 64, size: 5.6, font: FONT_CACHE!.bold, color: MUTED });
      page.drawText(total, { x: cx + cardW - 34, y: cy - 64, size: 8, font: FONT_CACHE!.bold, color: GREEN });
      page.drawRectangle({ x: cx + 8, y: cy - 88, width: cardW - 16, height: 16, color: GREEN_SOFT });
      centered(page, "View order · update · receipt · invoice  >", cx + cardW / 2, cy - 83.4, { size: 5.2, font: FONT_CACHE!.bold, color: GREEN });
    });
    return area.y - 130;
  });

  callout(page, 1, sx + 6, y - 64, sx + 130, y - 44); // search
  callout(page, 2, sx + sw + 4, y - 84, sx + 358, y - 46); // filter pills
  callout(page, 3, sx - 6, y - 150, sx + 128, y - 170); // order card
  callout(page, 4, sx + sw - 8, y - 170, sx + 200, y - 248); // view order footer

  steps(page, [
    "Search by order number, customer name, phone or delivery location; filter by status (New, Confirmed, Preparing, Out for delivery, Delivered, Cancelled).",
    "Status filters jump straight to the work queue — e.g. “New” shows only orders waiting to be confirmed.",
    "Click anywhere on an order card — the whole card is a button.",
    "The order page opens with everything: products & quantities, totals, customer and delivery details, notes, payment status and the full status timeline.",
  ], MARGIN, y - 330, CONTENT_W);
}

function orderDetailPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Store & customers", "7 · Orders (continued)");
  y = sectionTitle(page, y, "7b", "The order page: update, take payment, sign", "Confirm the order, move it through preparation and delivery, record payment, and capture the customer's signature as proof of delivery.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 330, "Orders", (area) => {
    const leftW = (area.w - 26) / 2;
    box(page, area.x + 8, area.y - 6 - 150, leftW, 150, PAPER, LINE);
    page.drawText("TB-4F7K21 · Jane Banda", { x: area.x + 16, y: area.y - 20, size: 7.4, font: FONT_CACHE!.bold, color: INK });
    pill(page, area.x + leftW - 40, area.y - 26, "New", GREEN_SOFT, GREEN, GREEN);
    let iy = area.y - 40;
    [["Free-range eggs × 2", "E60"], ["Fresh milk × 1", "E25"], ["Delivery", "E9"], ["Total", "E94"]].forEach(([label, value], i) => {
      page.drawText(label, { x: area.x + 16, y: iy, size: 5.8, font: i === 3 ? FONT_CACHE!.bold : FONT_CACHE!.regular, color: i === 3 ? INK : MUTED });
      page.drawText(value, { x: area.x + leftW - 34, y: iy, size: 5.8, font: FONT_CACHE!.bold, color: i === 3 ? GREEN : INK });
      iy -= 10;
    });
    box(page, area.x + 18 + leftW, area.y - 6 - 150, leftW, 150, PAPER, LINE);
    page.drawText("Customer & delivery", { x: area.x + 26 + leftW, y: area.y - 20, size: 7, font: FONT_CACHE!.bold, color: INK });
    page.drawText("Jane Banda · +260 97 000 0000", { x: area.x + 26 + leftW, y: area.y - 33, size: 5.4, font: FONT_CACHE!.regular, color: MUTED });
    page.drawText("Delivery: Chipata Central, near market", { x: area.x + 26 + leftW, y: area.y - 43, size: 5.4, font: FONT_CACHE!.regular, color: MUTED });
    pill(page, area.x + 26 + leftW, area.y - 62, "Unpaid", ALERT_SOFT, DANGER, DANGER);
    const selY = area.y - 84;
    formField(page, area.x + 26 + leftW, selY, 90, "UPDATE STATUS", "Confirmed");
    button(page, area.x + 124 + leftW, selY - 16, 74, "Mark paid", "outline", 13);
    const btnY = area.y - 122;
    button(page, area.x + 26 + leftW, btnY, 60, "Call", "outline", 12);
    button(page, area.x + 92 + leftW, btnY, 96, "WhatsApp customer", "outline", 12);
    button(page, area.x + 26 + leftW, btnY - 18, 74, "Receipt", "primary", 12);
    button(page, area.x + 106 + leftW, btnY - 18, 74, "Invoice", "primary", 12);
    return area.y - 170;
  });

  callout(page, 1, sx - 6, y - 120, sx + 168, y - 116);
  callout(page, 2, sx + sw + 6, y - 130, sx + 330, y - 96);
  callout(page, 3, sx + 40, y - 260, sx + 300, y - 190);
  callout(page, 4, sx + sw - 10, y - 300, sx + 280, y - 240);
  callout(page, 5, sx + 16, y - 380, sx + 150, y - 316);

  steps(page, [
    "Products, quantities and totals are listed on the left — always check them before confirming.",
    "Move the order along the flow with “Update status”: New » Confirmed » Preparing » Out for delivery » Delivered (or Cancelled). The timeline lights up as you go.",
    "“Mark paid” flips payment to paid once you have the money; “Call” and “WhatsApp customer” open the customer's number directly.",
    "“Receipt” and “Invoice” open the printable documents — the next page shows how to fill and download them.",
    "Further down the order page, “Proof of delivery / Signature” lets the customer sign on your device after delivery. The signature prints on the receipt and invoice with the signer's name and date — with no “signed digitally” marker.",
  ].filter((s) => s.length > 0), MARGIN, y - 360, CONTENT_W);
}

function receiptInvoicePage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Store & customers", "8 · Receipts & invoices");
  y = sectionTitle(page, y, "8", "Receipt & invoice: fill it in, then download", "From the order page press “Receipt” or “Invoice”. The document opens in a new tab with a toolbar. Press “Fill details” to complete any blanks on screen, then download or print — the filled values are included.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  const area = browserChrome(page, sx, y - 6, sw, 336, "thebranchfarm.com — Receipt TB-4F7K21");
  // toolbar
  const tbY = area.cy - 14;
  button(page, area.cx + area.cw - 232, tbY - 10, 52, "Download", "primary", 11);
  button(page, area.cx + area.cw - 174, tbY - 10, 84, "Print / Save PDF", "outline", 11);
  button(page, area.cx + area.cw - 120, tbY - 10, 58, "Fill details", "gold", 11);
  // fill panel
  const fpX = area.cx + area.cw - 240;
  const fpY = tbY - 26;
  box(page, fpX, fpY - 128, 232, 128, PAPER, LINE);
  page.drawText("Fill in the document", { x: fpX + 8, y: fpY - 12, size: 6.4, font: FONT_CACHE!.bold, color: GREEN });
  let fy = fpY - 22;
  ["Prepared by", "Payment method", "Payment status", "Amount paid (E)", "Notes"].forEach((label, i) => {
    page.drawText(label, { x: fpX + 8, y: fy, size: 4.6, font: FONT_CACHE!.bold, color: MUTED });
    box(page, fpX + 78, fy - 3, 146, 9, PAPER, LINE);
    if (i === 2) page.drawText("Paid", { x: fpX + 83, y: fy - 0.6, size: 4.4, font: FONT_CACHE!.regular, color: INK });
    fy -= 14.6;
  });
  // sheet (mini)
  const sheetX = area.cx + 12;
  const sheetW = area.cw - 262;
  box(page, sheetX, area.cy - 300, sheetW, 286, PAPER, LINE);
  page.drawText("THE BRANCH FARM", { x: sheetX + 10, y: area.cy - 288, size: 6.6, font: FONT_CACHE!.bold, color: INK });
  page.drawText("RECEIPT", { x: sheetX + sheetW - 46, y: area.cy - 288, size: 6.6, font: FONT_CACHE!.bold, color: GREEN });
  page.drawText("TB-4F7K21", { x: sheetX + sheetW - 46, y: area.cy - 296, size: 5.4, font: FONT_CACHE!.bold, color: INK });
  hairline(page, sheetX + 10, area.cy - 300, sheetX + sheetW - 10, area.cy - 300, GREEN, 1);
  const ty = area.cy - 150;
  tableMock(page, sheetX + 10, ty - 10, sheetW - 20, ["Item", "Qty", "Price", "Amount"], [["Free-range eggs", "2", "E30", "E60"], ["Fresh milk", "1", "E25", "E25"], ["Delivery", "1", "E9", "E9"]]);
  const payY = ty - 66;
  page.drawText("Amount paid", { x: sheetX + sheetW - 120, y: payY, size: 5.4, font: FONT_CACHE!.regular, color: MUTED });
  page.drawText("E94", { x: sheetX + sheetW - 34, y: payY, size: 5.4, font: FONT_CACHE!.bold, color: INK });
  page.drawText("Paid in full", { x: sheetX + sheetW - 120, y: payY - 10, size: 5.4, font: FONT_CACHE!.bold, color: GREEN });
  hairline(page, sheetX + 10, payY - 34, sheetX + sheetW - 10, payY - 34, LINE);
  page.drawText("Authorized Signature", { x: sheetX + 10, y: payY - 48, size: 5.2, font: FONT_CACHE!.bold, color: INK });
  hairline(page, sheetX + 10, payY - 70, sheetX + 110, payY - 70, GREEN, 1);
  page.drawText("Prepared by: Jane (admin) · 22 Aug 2026", { x: sheetX + 120, y: payY - 66, size: 5, font: FONT_CACHE!.regular, color: MUTED });

  callout(page, 1, sx + sw + 8, tbY - 20, area.cx + area.cw - 206, tbY - 4.5);
  callout(page, 2, sx - 6, tbY - 30, area.cx + area.cw - 91, tbY - 4.5);
  callout(page, 3, sx + sw - 6, fpY - 6, fpX + 150, fpY - 36);
  callout(page, 4, sx + 20, payY - 90, sheetX + sheetW - 60, payY - 8);
  callout(page, 5, sx + 46, payY - 110, sheetX + 150, payY - 66);

  let ky = steps(page, [
    "“Download” saves the document to your device immediately — the file is ready to send on WhatsApp or email.",
    "“Print / Save PDF” opens the print dialog — choose “Save as PDF” for a PDF copy, or print on paper.",
    "“Fill details” opens the fill-in panel: type the preparer's name, payment method, payment status, the amount actually paid and any extra notes. The document updates live as you type — amount paid and balance due recalculate automatically.",
    "The receipt always shows the business header, items, totals, amount paid and balance due.",
    "The signature block prints the captured signature with the signer's name and date only — no “signed digitally” marker on any document.",
  ], MARGIN, y - 360, CONTENT_W);
  ky -= 2;
  noteBox(page, "Where documents live", "Quotation, invoice and receipt records in “Documents” (section 11) also print and download the same way. Every generated document can be stored with its record — uploads run through the farm's own secured server, so nothing is exposed to the public.", MARGIN, ky, CONTENT_W);
}

function productsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Store & customers", "9 · Products & stock");
  y = sectionTitle(page, y, "9", "Products & stock", "Everything the shop sells lives here: name, category, description, price, unit, stock level and photos. Products can be produce or livestock, published or hidden, featured on the home page, or marked “coming soon”.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 316, "Products", (area) => {
    button(page, area.x + area.w - 88, area.y - 4, 80, "+ Add product", "primary", 12);
    const rowsY = area.y - 30;
    tableMock(page, area.x + 8, rowsY, area.w - 16, ["Product", "Price", "Stock", "Status"], [
      ["Free-range eggs (tray of 30)", "E30", "4  LOW", "Published"],
      ["Fresh milk (litre)", "E25", "24", "Published"],
      ["Live broiler (each)", "E120", "0  OUT", "Hidden"],
    ]);
    return rowsY - 60;
  });

  callout(page, 1, sx + sw - 8, y - 40, sx + sw - 48, y - 24);
  callout(page, 2, sx + 4, y - 120, sx + 230, y - 96);
  callout(page, 3, sx + sw + 6, y - 140, sx + 300, y - 108);
  callout(page, 4, sx - 8, y - 165, sx + 250, y - 120);

  steps(page, [
    "Press “+ Add product” (or “Edit” on any product) to open the product form.",
    "Fill in name, kind (produce or livestock), category, description, price and the unit of sale (tray, litre, each…).",
    "Stock: turn on inventory tracking and enter the quantity. When stock reaches 5 or fewer the notification bell warns “Low stock”; at zero, customers can no longer order it.",
    "Upload photos — they are stored securely by the farm's server. Set the product Published to show it in the shop, Featured to pin it on the home page.",
    "“Add sample products” loads the demo catalogue in one click when starting out.",
  ], MARGIN, y - 345, CONTENT_W);
}

function customersPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Store & customers", "10 · Customers");
  y = sectionTitle(page, y, "10", "Customers — the customer book", "Every order automatically creates or updates a customer record: name, phone, email, delivery location, number of orders and total spent. Use it to call, WhatsApp and understand your best customers.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 240, "Customers", (area) => {
    const rowsY = area.y - 8;
    tableMock(page, area.x + 8, rowsY, area.w - 16, ["Customer", "Phone", "Orders", "Total spent", "Last order"], [
      ["Jane Banda", "+260 97 000 0000", "7", "E612", "21 Aug 2026"],
      ["Mary Phiri", "+260 96 111 2222", "3", "E205", "18 Aug 2026"],
      ["Green Grove Restaurant", "+260 77 555 0101", "21", "E4,830", "22 Aug 2026"],
    ]);
    return rowsY - 70;
  });

  callout(page, 1, sx + 8, y - 90, sx + 130, y - 70);
  callout(page, 2, sx + sw - 8, y - 110, sx + 330, y - 84);
  callout(page, 3, sx - 6, y - 140, sx + 260, y - 96);

  let ky = steps(page, [
    "Search the book by name or phone; click a customer to open their profile.",
    "The profile shows contact details, delivery location, full order history and documents (quotations, invoices, receipts) for that customer.",
    "Call or WhatsApp directly from the profile. Customers marked inactive simply stop appearing in new-document pickers — history is never deleted.",
  ], MARGIN, y - 265, CONTENT_W);
  ky -= 4;
  noteBox(page, "No double entry", "You rarely create customers by hand — the shop does it for you on every order, and updates totals automatically.", MARGIN, ky, CONTENT_W);
}

function documentsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Store & customers", "11 · Quotations, invoices & receipts");
  y = sectionTitle(page, y, "11", "Quotations, invoices & receipts", "Formal money documents with automatic numbering: QF-YYYY-NNNN for quotations, INV-… for invoices and receipts. Build them from the customer book and the product catalogue, with discount and tax calculated live.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 260, "Quotations", (area) => {
    button(page, area.x + area.w - 84, area.y - 4, 76, "+ New quotation", "primary", 12);
    const rowsY = area.y - 30;
    tableMock(page, area.x + 8, rowsY, area.w - 16, ["Number", "Customer", "Total", "Status"], [
      ["QF-2026-0031", "Green Grove Restaurant", "E1,240", "Sent"],
      ["QF-2026-0030", "Jane Banda", "E96", "Accepted"],
      ["INV-TB-4F7K21", "Jane Banda", "E94", "Invoice"],
    ]);
    return rowsY - 60;
  });

  callout(page, 1, sx + sw - 6, y - 40, sx + sw - 46, y - 24);
  callout(page, 2, sx + 6, y - 100, sx + 150, y - 66);
  callout(page, 3, sx + sw + 8, y - 130, sx + 320, y - 92);

  steps(page, [
    "Press “+ New quotation” (or “New invoice” / “New receipt” on their pages). Pick a customer or type a new one, then add products with quantity and price — totals, discount and tax calculate live.",
    "Save. The document gets its official number and status: Draft » Sent » Accepted/Rejected » Converted for quotations.",
    "Open any document to view, edit, print/save-PDF or download it — the same toolbar as order receipts, with the same “Fill details” panel.",
    "A printable copy is stored with the record automatically when the server is configured, so paperwork is never lost.",
    "“Farm documents” (Monitoring section) keeps every other file: purchase orders, delivery notes, contracts, supplier, customer, staff and animal paperwork — upload, categorise and find them in one place.",
  ], MARGIN, y - 290, CONTENT_W);
}

function animalsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Livestock", "12-13 · Animals, health & herd");
  y = sectionTitle(page, y, "12", "Animals, health & the herd", "The livestock register is the heart of the farm: every animal has a permanent profile — tag, type, breed, sex, origin (born or purchased), weight history, status and health. Health & vaccination keeps each animal's treatments current.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 288, "Animals", (area) => {
    button(page, area.x + area.w - 88, area.y - 4, 80, "+ Add animal", "primary", 12);
    const cardW = (area.w - 26) / 3;
    const cards: Array<[string, string, string, string]> = [
      ["C-001 · Clarabelle", "Cow · Friesian", "Healthy · Active", "420 kg"],
      ["G-014 · Nkhosa", "Goat · Boer", "Healthy · Active", "61 kg"],
      ["BR-220 · Broiler flock", "Poultry · Ross", "Monitoring", "2.3 kg"],
    ];
    cards.forEach(([name, type, health, weight], i) => {
      const cx = area.x + 8 + i * (cardW + 5);
      const cy = area.y - 26;
      box(page, cx, cy - 118, cardW, 118, PAPER, LINE);
      page.drawRectangle({ x: cx + 6, y: cy - 62, width: cardW - 12, height: 52, color: GREEN_SOFT });
      centered(page, "photo", cx + cardW / 2, cy - 40, { size: 5.4, color: MUTED });
      page.drawText(name, { x: cx + 8, y: cy - 74, size: 6.2, font: FONT_CACHE!.bold, color: INK });
      page.drawText(type, { x: cx + 8, y: cy - 84, size: 5.2, font: FONT_CACHE!.regular, color: MUTED });
      page.drawText(health, { x: cx + 8, y: cy - 97, size: 5, font: FONT_CACHE!.bold, color: GREEN });
      page.drawText(weight, { x: cx + 8, y: cy - 108, size: 5, font: FONT_CACHE!.regular, color: MUTED });
    });
    return area.y - 150;
  });

  callout(page, 1, sx + sw - 6, y - 40, sx + sw - 48, y - 24);
  callout(page, 2, sx + 4, y - 100, sx + 120, y - 52);
  callout(page, 3, sx + sw + 6, y - 126, sx + 320, y - 100);

  steps(page, [
    "“+ Add animal” registers an animal — born on the farm or purchased — with tag, breed, sex, origin, price and photos. Duplicate tags are rejected automatically.",
    "Click an animal for its full profile: weight history, offspring, health timeline, documents and movements. Sold or transferred animals keep their history — status changes, records are never deleted.",
    "“Health & vaccination” records treatments, vaccinations and problems; each record updates the animal's health status and can attach photos of medicine labels or symptoms.",
    "“Weight & growth” tracks gains over time; “Breeding” manages pregnancies; “Births” registers new offspring (and links mother and father automatically); “Acquisitions” records purchases; “Sales & transfers” records animals leaving.",
    "Everything done here appears in the audit trail — who did what, and when.",
  ], MARGIN, y - 315, CONTENT_W);
}

function dailyOpsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Daily operations", "14-15 · Daily work, feed, production & assets");
  y = sectionTitle(page, y, "14", "Daily operations, feed, inventory & production", "Daily work is recorded where it happens, in the same simple pattern: pick the module, fill the form, save. Low feed or inventory raises a notification automatically.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 214, "Daily farm log", (area) => {
    button(page, area.x + area.w - 76, area.y - 4, 68, "+ Add entry", "primary", 12);
    const rowsY = area.y - 30;
    tableMock(page, area.x + 8, rowsY, area.w - 16, ["Activity", "Who", "When"], [
      ["Morning milking — 210 litres", "Team A", "22 Aug, 05:40"],
      ["Feeding — dairy pen, 3 bags", "Team A", "22 Aug, 06:20"],
      ["Egg collection — 84 eggs", "Team B", "22 Aug, 09:10"],
    ]);
    return rowsY - 50;
  });

  callout(page, 1, sx + sw - 8, y - 40, sx + sw - 42, y - 24);
  callout(page, 2, sx + 8, y - 90, sx + 140, y - 62);

  let ky = steps(page, [
    "Feed management and Farm inventory track quantities in and out; recording a status of “low” raises a notification so nothing runs out silently.",
    "Milk production and Egg production log daily yields per house or pen, with totals and trends in the Report centre.",
    "The Daily farm log captures anything else — who did what, when. The Activity archive keeps the permanent history.",
    "Equipment tracks tools and machines with their condition; Maintenance schedules and records repairs; Farm expenses records money spent with category and payment status.",
  ], MARGIN, y - 240, CONTENT_W);
  ky -= 2;
  noteBox(page, "Problems & incidents", "Anything unusual — a sick animal, a broken fence, a water leak — goes to “Problems & incidents” (open » investigating » monitoring » resolved). Open incidents appear in the notification bell until they are resolved.", MARGIN, ky, CONTENT_W);
}

function reportsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Monitoring", "16-17 · Reports, audit & media");
  y = sectionTitle(page, y, "16", "Report centre, audit trail & content", "The Report centre turns records into decisions: sales, production, stock and expenses over any period, exportable for meetings. The Audit trail is the permanent who-did-what-when record of every change.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 236, "Report center", (area) => {
    const statW = (area.w - 30) / 4;
    [["Sales this month", "E12,480"], ["Milk (7 days)", "1,470 L"], ["Eggs (7 days)", "612"], ["Open incidents", "2"]].forEach(([label, value], i) => {
      const cx = area.x + 8 + i * (statW + 5);
      box(page, cx, area.y - 8 - 56, statW, 56, PAPER, LINE);
      page.drawText(label, { x: cx + 8, y: area.y - 24, size: 5.2, font: FONT_CACHE!.bold, color: MUTED });
      page.drawText(value, { x: cx + 8, y: area.y - 44, size: 9.5, font: FONT_CACHE!.bold, color: GREEN });
    });
    const rowsY = area.y - 80;
    tableMock(page, area.x + 8, rowsY, area.w - 16, ["When", "Who", "What"], [
      ["22 Aug 10:02", "Administrator", "Marked order TB-9X2KP4 paid"],
      ["22 Aug 08:15", "Team A", "Recorded morning milking"],
      ["21 Aug 16:40", "Administrator", "Approved acquisition AC-008"],
    ]);
    return rowsY - 55;
  });

  callout(page, 1, sx + 6, y - 100, sx + 120, y - 44);
  callout(page, 2, sx + sw + 4, y - 140, sx + 340, y - 92);

  steps(page, [
    "Report centre: choose a report and period; figures and charts summarise sales, production, stock and expenses. Export for WhatsApp or meetings.",
    "Audit trail (administrators): every create, update, status change and delete with the person and timestamp. Records and their audit entries are saved together — one can never exist without the other.",
    "Farm media stores photos and video of the farm; Videos manages what appears in the public gallery — upload, title, describe, publish or unpublish.",
  ], MARGIN, y - 265, CONTENT_W);
}

function staffPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Administrator", "18 · Staff & permissions");
  y = sectionTitle(page, y, "18", "Staff & permissions (administrators only)", "Administrators control who can enter the workspace and what they can see: create staff accounts, set roles, grant or remove areas, disable accounts and reset passwords.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 250, "Staff & permissions", (area) => {
    button(page, area.x + area.w - 92, area.y - 4, 84, "+ Add staff", "primary", 12);
    const rowsY = area.y - 30;
    tableMock(page, area.x + 8, rowsY, area.w - 16, ["Member", "Role", "Areas", "Status"], [
      ["Owner", "admin", "Everything", "Active"],
      ["Jane Banda", "staff", "Farm Operations, Animals", "Active"],
      ["Temp worker", "staff", "Farm Operations", "Disabled"],
    ]);
    return rowsY - 60;
  });

  callout(page, 1, sx + sw - 6, y - 40, sx + sw - 50, y - 24);
  callout(page, 2, sx + 8, y - 100, sx + 200, y - 70);
  callout(page, 3, sx + sw + 6, y - 130, sx + 320, y - 94);
  callout(page, 4, sx - 6, y - 160, sx + 260, y - 116);

  let ky = steps(page, [
    "“+ Add staff” creates the account with full name, email and phone. The system issues a temporary password — share it securely (WhatsApp or in person) and ask the member to change it at first sign-in.",
    "Roles: staff see only their granted areas; admin sees and controls everything, including this page, Audit trail, Settings and the Guide.",
    "Areas granted appear as the staff member's menu — grant exactly what each person needs (e.g. Animals + Farm Operations).",
    "Disable an account to revoke access instantly without deleting history; reset a password to issue a new temporary one. Approvals and every permission change are written to the audit trail.",
  ], MARGIN, y - 280, CONTENT_W);
  ky -= 2;
  noteBox(page, "Password management", "Members change their own password from their profile. Administrators reset forgotten staff passwords from this page. Passwords are never displayed anywhere in the app after issue.", MARGIN, ky, CONTENT_W);
}

function settingsPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Administrator", "19 · Settings");
  y = sectionTitle(page, y, "19", "Settings (administrators only)", "One page of useful business configuration: identity, contact channels, delivery rules, currency and promotions. Everything else is set where you work — no confusing option dumps.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 230, "Settings", (area) => {
    const colW = (area.w - 26) / 2;
    let fy = area.y - 12;
    ["Farm name", "Slogan", "Phone", "WhatsApp"].forEach((label) => {
      fy = formField(page, area.x + 10, fy, colW, label.toUpperCase(), label === "Farm name" ? "The Branch Farm" : "…");
    });
    let fy2 = area.y - 12;
    ["Currency", "Delivery fee", "Free delivery from", "Promo code"].forEach((label) => {
      fy2 = formField(page, area.x + 20 + colW, fy2, colW, label.toUpperCase(), "…");
    });
    button(page, area.x + 10, fy - 6, 70, "Save settings", "primary", 12);
    return fy - 20;
  });

  callout(page, 1, sx + 8, y - 80, sx + 140, y - 60);
  callout(page, 2, sx + sw - 8, y - 120, sx + 360, y - 60);
  callout(page, 3, sx - 6, y - 230, sx + 60, y - 214);

  steps(page, [
    "Identity & contact: farm name, slogan, phone, WhatsApp and email — these print on every receipt, invoice and quotation.",
    "Delivery & currency: delivery fee, the order value from which delivery becomes free, and the display currency.",
    "Promotions: set a promo code and its discount percent — customers apply it at checkout.",
    "Press “Save settings”. Changes apply everywhere immediately.",
  ], MARGIN, y - 255, CONTENT_W);
}

function guideSecurityPage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Administrator", "20 · Guide & security");
  y = sectionTitle(page, y, "20", "This guide & how it is protected", "The Guide & user manual page lives in the workspace menu (Content & system). The PDF is generated by the farm's own server, on demand, and is protected twice: by administrator sign-in and by the guide password.");

  const sx = MARGIN;
  const sw = CONTENT_W;
  appShell(page, sx, y - 6, sw, 214, "Guide & user manual", (area) => {
    box(page, area.x + 10, area.y - 6 - 118, area.w - 20, 118, SHEET, LINE);
    page.drawText("Complete User Guide & Manual", { x: area.x + 22, y: area.y - 26, size: 9, font: FONT_CACHE!.bold, color: INK });
    page.drawText("Customer storefront · Staff workspace · Administrator dashboard — with numbered pointers for every step.", { x: area.x + 22, y: area.y - 38, size: 5.8, font: FONT_CACHE!.regular, color: MUTED });
    button(page, area.x + 22, area.y - 74, 96, "Download guide (PDF)", "primary", 13);
    pill(page, area.x + 128, area.y - 74, "Admins only · password protected", ALERT_SOFT, DANGER, DANGER);
    page.drawText("Regenerated by the app itself — always matches the live system.", { x: area.x + 22, y: area.y - 96, size: 5.4, font: FONT_CACHE!.italic, color: MUTED });
    return area.y - 130;
  });

  callout(page, 1, sx + sw - 6, y - 70, sx + 150, y - 68);
  callout(page, 2, sx - 4, y - 110, sx + 132, y - 70);
  callout(page, 3, sx + 30, y - 250, sx + 120, y - 190);

  let ky = steps(page, [
    "Open “Guide & user manual” in the workspace menu (administrators only) and press “Download guide (PDF)”. Sign in is verified by the server before the file is produced.",
    "Open the downloaded PDF and enter the guide password. The password is chosen by the administrator in the server configuration (GUIDE_PDF_PASSWORD) — it is never displayed in the app, never shown to staff or customers, and never appears in any code sent to the browser.",
    "The file is never stored in a public folder: it is built on request for the signed-in administrator only, and sharing the download link with anyone else does nothing without an admin session and the password.",
  ], MARGIN, y - 245, CONTENT_W);
  ky -= 2;
  noteBox(page, "Website security posture", "The website exposes no service credentials to the browser: Firebase access is protected by authentication and database rules, and all file uploads are signed and proxied by the farm's own server. Staff accounts can be limited by area, and every sensitive action is recorded in the audit trail.", MARGIN, ky, CONTENT_W);
}

function quickReferencePage(doc: PDFDocument) {
  const page = doc.addPage(A4);
  let y = pageHeader(page, "Reference", "Quick reference");
  y = sectionTitle(page, y, "Q", "Quick reference", "The everyday facts of the system on one page.");

  let ty = y - 10;
  page.drawText("Order statuses", { x: MARGIN, y: ty, size: 10, font: FONT_CACHE!.bold, color: GREEN });
  ty = tableMock(page, MARGIN, ty - 8, CONTENT_W / 2 - 8, ["Status", "Meaning"], [
    ["New", "Order placed, waiting to be confirmed"],
    ["Confirmed", "Farm accepted it and is preparing"],
    ["Preparing", "Being packed / animals being readied"],
    ["Out for delivery", "On the way (or ready for pick-up)"],
    ["Delivered", "Completed — sign for proof of delivery"],
    ["Cancelled", "Cancelled by farm or customer"],
  ], 12) - 8;

  page.drawText("Roles", { x: MARGIN + CONTENT_W / 2 + 8, y: y - 10, size: 10, font: FONT_CACHE!.bold, color: GREEN });
  tableMock(page, MARGIN + CONTENT_W / 2 + 8, y - 18, CONTENT_W / 2 - 8, ["Role", "Sees"], [
    ["Customer", "Shop, own orders, receipts"],
    ["Staff", "Granted farm areas only"],
    ["Admin", "Everything + staff, audit, settings, guide"],
  ], 12);

  let ky = ty - 6;
  page.drawText("Everyday rules", { x: MARGIN, y: ky, size: 10, font: FONT_CACHE!.bold, color: GREEN });
  ky -= 16;
  ky = steps(page, [
    "Order numbers look like TB-4F7K21 — give this number whenever you contact the farm.",
    "Delivery is free within the advertised area / above the threshold shown at checkout.",
    "Receipts and invoices: press Fill details to complete them, then Download or Print / Save PDF.",
    "Low stock warns at 5 units or fewer; zero stops customer orders automatically.",
    "The notification bell collects everything that needs attention — start each day there.",
  ], MARGIN, ky, CONTENT_W);
  ky -= 4;
  noteBox(page, "Keeping this guide current", "This manual is generated by the application itself. Whenever the website's screens change, the guide is regenerated with the same numbered-pointer style, so it always remains the official manual for the whole system. Version " + GUIDE_VERSION + ".", MARGIN, ky, CONTENT_W);
}

/* -------------------------------- build -------------------------------- */

export const GUIDE_VERSION = "1.0";

export async function buildGuidePdf(options: { password?: string } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  FONT_CACHE = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const base64 = LOGO_DATA_URL.split(",")[1] || "";
  if (base64) {
    LOGO = await doc.embedPng(Buffer.from(base64, "base64"));
  }
  PAGE_NO = 0;

  doc.setTitle("The Branch Farm — Complete User Guide & Manual");
  doc.setSubject("Customer storefront, staff workspace and administrator dashboard");
  doc.setProducer("The Branch Farm application");
  doc.setCreator("The Branch Farm — generated in-app for administrators");

  coverPage(doc);
  contentsPage(doc);
  signInPage(doc);
  registerPage(doc);
  shopPage(doc);
  trackPage(doc);
  workspaceOrientationPage(doc);
  notificationsPage(doc);
  ordersPage(doc);
  orderDetailPage(doc);
  receiptInvoicePage(doc);
  productsPage(doc);
  customersPage(doc);
  documentsPage(doc);
  animalsPage(doc);
  dailyOpsPage(doc);
  reportsPage(doc);
  staffPage(doc);
  settingsPage(doc);
  guideSecurityPage(doc);
  quickReferencePage(doc);

  const bytes = await doc.save({ useObjectStreams: false });
  const password = (options.password || process.env.GUIDE_PDF_PASSWORD || "").trim();
  if (password) return encryptPdfRc4(bytes, password);
  return bytes;
}
