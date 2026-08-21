"use client";

import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { BUSINESS } from "@/lib/constants";
import { formatDate, money } from "@/lib/utils";
import type { BusinessDocument } from "@/types";

async function imageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("image-load-failed");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateBusinessPdf(record: BusinessDocument) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const width = 210;
  const margin = 16;
  const right = width - margin;
  const green = "#173b2b";
  const gold = "#c8963e";
  const ink = "#17241e";
  const muted = "#647168";
  const pale = "#f3f0e7";
  const verifyUrl = `${window.location.origin}/verify/${record.verificationCode}`;
  const [logo, qr] = await Promise.all([
    imageData("/logo.png").catch(() => ""),
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 340, color: { dark: green, light: "#ffffff" } }),
  ]);

  // Branded header
  pdf.setFillColor(green);
  pdf.rect(0, 0, width, 42, "F");
  if (logo) pdf.addImage(logo, "PNG", margin, 7, 27, 27);
  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(BUSINESS.name.toUpperCase(), 48, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(BUSINESS.slogan, 48, 22);
  pdf.setTextColor("#d9e5dd");
  pdf.text(BUSINESS.location, 48, 29);
  pdf.text(`${BUSINESS.phoneDisplay}  ·  WhatsApp ${BUSINESS.whatsappDisplay}`, 48, 34);

  let y = 54;
  pdf.setTextColor(ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(record.type.toUpperCase(), margin, y);
  pdf.setFontSize(11);
  pdf.setTextColor(gold);
  pdf.text(record.documentNumber, right, y, { align: "right" });
  y += 9;
  pdf.setDrawColor("#d8ded8");
  pdf.line(margin, y, right, y);
  y += 9;

  pdf.setTextColor(muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("ISSUED TO", margin, y);
  pdf.text("DOCUMENT DETAILS", 112, y);
  y += 6;
  pdf.setTextColor(ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(record.customer.fullName, margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(record.customer.phone || "", margin, y + 5);
  if (record.customer.email) pdf.text(record.customer.email, margin, y + 10);
  pdf.text(`Issue date: ${formatDate(record.createdAt)}`, 112, y);
  if (record.orderNumber) pdf.text(`Order: ${record.orderNumber}`, 112, y + 5);
  pdf.text(`Status: ${record.status.toUpperCase()}`, 112, y + 10);
  if (record.paymentMethod) pdf.text(`Payment: ${record.paymentMethod}`, 112, y + 15);
  if (record.paymentReference) pdf.text(`Reference: ${record.paymentReference}`, 112, y + 20);
  y += record.paymentMethod ? 28 : 21;

  // Product table
  const columns = [margin, 102, 126, 156, right];
  pdf.setFillColor(pale);
  pdf.roundedRect(margin, y, right - margin, 9, 1.5, 1.5, "F");
  pdf.setTextColor(green);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("PRODUCT", columns[0] + 3, y + 6);
  pdf.text("QTY", columns[1], y + 6);
  pdf.text("UNIT", columns[2], y + 6);
  pdf.text("PRICE", columns[3], y + 6);
  pdf.text("TOTAL", columns[4], y + 6, { align: "right" });
  y += 13;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(ink);
  pdf.setFontSize(9);

  record.items.forEach((item, index) => {
    if (y > 238) {
      pdf.addPage();
      y = 20;
    }
    const nameLines = pdf.splitTextToSize(item.productName, 79) as string[];
    const rowHeight = Math.max(10, nameLines.length * 4.5 + 3);
    pdf.text(nameLines, columns[0] + 3, y);
    pdf.text(String(item.quantity), columns[1], y);
    pdf.text(item.unit, columns[2], y);
    pdf.text(money(item.price), columns[3], y);
    pdf.setFont("helvetica", "bold");
    pdf.text(money(item.subtotal), columns[4], y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    y += rowHeight;
    pdf.setDrawColor(index % 2 === 0 ? "#e4e8e4" : "#edf0ed");
    pdf.line(margin, y - 3, right, y - 3);
  });

  y += 3;
  const totalsX = 124;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(record.subtotal)],
    ["Delivery", record.deliveryFee == null ? "To be arranged" : money(record.deliveryFee)],
    ["Discount", record.discount ? `-${money(record.discount)}` : money(0)],
  ];
  pdf.setFontSize(9);
  totalRows.forEach(([label, value]) => {
    pdf.setTextColor(muted);
    pdf.text(label, totalsX, y);
    pdf.setTextColor(ink);
    pdf.text(value, right, y, { align: "right" });
    y += 6;
  });
  pdf.setDrawColor(green);
  pdf.line(totalsX, y - 2, right, y - 2);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(green);
  pdf.text("GRAND TOTAL", totalsX, y + 5);
  pdf.text(money(record.total), right, y + 5, { align: "right" });
  y += 18;

  if (y > 235) {
    pdf.addPage();
    y = 20;
  }
  pdf.setFillColor("#f7f8f5");
  pdf.roundedRect(margin, y, right - margin, 38, 2, 2, "F");
  pdf.addImage(qr, "PNG", margin + 4, y + 4, 30, 30);
  pdf.setTextColor(green);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("SCAN TO VERIFY", margin + 40, y + 11);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(muted);
  const verifyText = pdf.splitTextToSize(
    `Verification code: ${record.verificationCode}\nCompare this document with the official Branch Farm database record.`,
    92,
  );
  pdf.text(verifyText, margin + 40, y + 18);
  if (record.signature) {
    pdf.setTextColor(muted);
    pdf.setFontSize(7.5);
    pdf.text("AUTHORIZED SIGNATURE", 164, y + 9, { align: "center" });
    try {
      pdf.addImage(record.signature, "PNG", 145, y + 12, 38, 15);
      pdf.line(144, y + 29, 184, y + 29);
    } catch {
      pdf.text("Digitally signed", 164, y + 21, { align: "center" });
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setTextColor("#8a938d");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(`${BUSINESS.name} · ${BUSINESS.slogan} · Official document version ${record.version}`, margin, 290);
    pdf.text(`Page ${page} of ${pages}`, right, 290, { align: "right" });
  }

  pdf.save(`${record.documentNumber}.pdf`);
}
