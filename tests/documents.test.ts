import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDocumentTotals,
  generateQuotationNumber,
  generateReceiptNumber,
  nextDocumentNumber,
  normalizeQuotationStatus,
  quotationStatusLabel,
} from "../src/lib/documents";
import { QUOTATION_NUMBER_PREFIX, QUOTATION_STATUSES } from "../src/lib/constants";

test("totals calculate subtotal, discount, tax and balance", () => {
  const totals = computeDocumentTotals({
    items: [
      { name: "Milk", quantity: 2, price: 16 },
      { name: "Eggs", quantity: 1, price: 45 },
    ],
    discount: 10,
    taxRate: 15,
  });
  assert.equal(totals.subtotal, 77); // 32 + 45
  assert.equal(totals.discount, 10);
  assert.equal(totals.taxAmount, 10.05); // 15% of 67
  assert.equal(totals.total, 77.05); // 67 + 10.05
  assert.equal(totals.amountPaid, 0);
  assert.equal(totals.balance, 77.05);
});

test("amount paid reduces the balance and cannot exceed the total", () => {
  const totals = computeDocumentTotals({
    items: [{ name: "Goat", quantity: 1, price: 1200 }],
    taxRate: 0,
    discount: 0,
    amountPaid: 500,
  });
  assert.equal(totals.total, 1200);
  assert.equal(totals.balance, 700);

  const overpaid = computeDocumentTotals({
    items: [{ name: "Goat", quantity: 1, price: 1200 }],
    amountPaid: 9999,
  });
  assert.equal(overpaid.amountPaid, 1200);
  assert.equal(overpaid.balance, 0);
});

test("negative or huge inputs are clamped sensibly", () => {
  const totals = computeDocumentTotals({
    items: [{ name: "Milk", quantity: 1, price: 20 }],
    discount: -50,
    taxRate: 250,
    amountPaid: -10,
  });
  assert.equal(totals.discount, 0);
  assert.equal(totals.taxRate, 100);
  assert.equal(totals.taxAmount, 20);
  assert.equal(totals.total, 40);
  assert.equal(totals.amountPaid, 0);
});

test("professional quotation numbers sequence per year", () => {
  const year = new Date().getFullYear();
  assert.equal(
    nextDocumentNumber(QUOTATION_NUMBER_PREFIX, [], year),
    `QF-${year}-0001`,
  );
  assert.equal(
    nextDocumentNumber(QUOTATION_NUMBER_PREFIX, [`QF-${year}-0007`, `QF-${year}-0002`], year),
    `QF-${year}-0008`,
  );
  // Numbers from other years or other prefixes do not affect the sequence.
  assert.equal(
    nextDocumentNumber(QUOTATION_NUMBER_PREFIX, [`QF-${year - 1}-0099`, `RCP-${year}-0100`], year),
    `QF-${year}-0001`,
  );
  assert.equal(generateQuotationNumber(["RCP-2026-0042"]), `QF-${year}-0001`);
  assert.equal(
    generateReceiptNumber([`RCP-${year}-0041`]),
    `RCP-${year}-0042`,
  );
});

test("unknown prefixes produce the standard PREFIX-YYYY-NNNN shape", () => {
  assert.match(nextDocumentNumber("INV", [], 2026), /^INV-2026-0001$/);
});

test("legacy quotations without a status are treated as drafts", () => {
  assert.equal(normalizeQuotationStatus(undefined), "draft");
  assert.equal(normalizeQuotationStatus("nonsense"), "draft");
  assert.equal(normalizeQuotationStatus("accepted"), "accepted");
  assert.equal(quotationStatusLabel("sent"), "Sent");
});

test("the quotation lifecycle covers the required flow", () => {
  assert.deepEqual(QUOTATION_STATUSES, ["draft", "sent", "accepted", "rejected", "converted"]);
});
