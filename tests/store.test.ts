import test from "node:test";
import assert from "node:assert/strict";
import { productSchema, checkoutSchema } from "../src/lib/validation";
import { generateOrderReference } from "../src/lib/store";
import { ORDER_STATUS_LABELS, PRODUCT_KIND_LABELS } from "../src/lib/constants";

test("a product accepts a full shop profile with sale price and backorder", () => {
  const result = productSchema.parse({
    name: "Free-range eggs",
    kind: "produce",
    category: "eggs",
    description: "Fresh eggs collected daily.",
    price: "75",
    salePrice: "65",
    unit: "dozen",
    stock: "40",
    trackInventory: true,
    allowBackorder: false,
    active: true,
    featured: true,
  });
  assert.equal(result.price, 75);
  assert.equal(result.salePrice, 65);
  assert.equal(result.unit, "dozen");
});

test("a product rejects a non-positive price", () => {
  const base = {
    name: "Eggs",
    kind: "produce",
    category: "eggs",
    description: "Fresh eggs.",
    price: 0,
    unit: "dozen",
    stock: 1,
  };
  assert.equal(productSchema.safeParse(base).success, false);
});

test("checkout requires a name, phone and confirmation", () => {
  const valid = {
    name: "Nomsa Dlamini",
    phone: "+268 79777668",
    fulfillment: "pickup",
    agree: true,
  };
  assert.equal(checkoutSchema.safeParse(valid).success, true);
  assert.equal(checkoutSchema.safeParse({ ...valid, name: "" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...valid, phone: "123" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...valid, agree: false }).success, false);
});

test("order references are unique and well-formed", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i += 1) {
    const ref = generateOrderReference();
    assert.match(ref, /^TB-[A-Z0-9]{6}$/);
    seen.add(ref);
  }
  assert.equal(seen.size, 500);
});

test("store constants expose product kinds and order statuses", () => {
  assert.equal(PRODUCT_KIND_LABELS.produce, "Farm produce");
  assert.equal(PRODUCT_KIND_LABELS.livestock, "Live animals");
  assert.equal(ORDER_STATUS_LABELS.pending, "Placed");
  assert.equal(ORDER_STATUS_LABELS.completed, "Completed");
});
