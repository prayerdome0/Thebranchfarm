"use client";

import { jsPDF } from "jspdf";
import { BUSINESS } from "@/lib/constants";
import { money } from "@/lib/utils";

export async function generateReportPdf(data: {
  title: string;
  range: string;
  metrics: Array<{ label: string; value: string }>;
  orders: Array<{ number: string; date: string; customer: string; status: string; total: number }>;
}) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const green = "#173b2b";
  pdf.setFillColor(green); pdf.rect(0, 0, 210, 38, "F");
  pdf.setTextColor("#ffffff"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(BUSINESS.name.toUpperCase(), 16, 16);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(`${BUSINESS.slogan} · ${BUSINESS.location}`, 16, 23); pdf.text("ADMINISTRATION REPORT", 194, 16, { align: "right" }); pdf.text(data.range, 194, 23, { align: "right" });
  let y = 52; pdf.setTextColor("#17241e"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.text(data.title, 16, y); y += 13;
  const cardWidth = 42; data.metrics.slice(0, 4).forEach((metric, index) => { const x = 16 + index * 45; pdf.setFillColor("#f3f0e7"); pdf.roundedRect(x, y, cardWidth, 24, 2, 2, "F"); pdf.setFontSize(7.5); pdf.setTextColor("#667168"); pdf.text(metric.label.toUpperCase(), x + 3, y + 7); pdf.setTextColor(green); pdf.setFontSize(13); pdf.text(metric.value, x + 3, y + 17); }); y += 35;
  pdf.setFontSize(11); pdf.setTextColor(green); pdf.text("ORDER SUMMARY", 16, y); y += 7;
  pdf.setFillColor(green); pdf.rect(16, y, 178, 8, "F"); pdf.setTextColor("#ffffff"); pdf.setFontSize(7.5); pdf.text("ORDER", 19, y + 5); pdf.text("DATE", 57, y + 5); pdf.text("CUSTOMER", 84, y + 5); pdf.text("STATUS", 139, y + 5); pdf.text("TOTAL", 191, y + 5, { align: "right" }); y += 13;
  pdf.setTextColor("#26342d"); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  for (const order of data.orders) { if (y > 275) { pdf.addPage(); y = 20; } pdf.text(order.number, 19, y); pdf.text(order.date, 57, y); pdf.text(pdf.splitTextToSize(order.customer, 48)[0], 84, y); pdf.text(order.status, 139, y); pdf.text(money(order.total), 191, y, { align: "right" }); pdf.setDrawColor("#e1e5e1"); pdf.line(16, y + 3, 194, y + 3); y += 8; }
  if (!data.orders.length) pdf.text("No orders recorded for this period.", 19, y);
  const pages = pdf.getNumberOfPages(); for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); pdf.setFontSize(7); pdf.setTextColor("#879087"); pdf.text(`Generated ${new Date().toLocaleString("en-SZ")} · Firebase data`, 16, 290); pdf.text(`Page ${page} of ${pages}`, 194, 290, { align: "right" }); }
  pdf.save(`The-Branch-Farm-${data.title.replace(/\s+/g, "-")}.pdf`);
}
