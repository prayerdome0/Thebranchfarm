import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_PRODUCTS, DEMO_VIDEOS } from "../src/lib/store";
import { documentSchema, productSchema } from "../src/lib/validation";
import { DOCUMENT_TYPE_LABELS } from "../src/lib/constants";

test("the live catalogue prices milk, Latsambile and Lashubile", () => {
  const milk = DEMO_PRODUCTS.find((product) => product.name === "Fresh milk");
  assert.ok(milk, "Fresh milk is in the catalogue");
  assert.equal(milk?.price, 16);
  assert.equal(milk?.unit, "litre");
  assert.ok(!milk?.comingSoon, "milk is buyable now");

  const latsambile = DEMO_PRODUCTS.find((product) => product.name.includes("Latsambile"));
  assert.ok(latsambile);
  assert.equal(latsambile?.price, 20);
  assert.ok(!latsambile?.comingSoon);

  const lashubile = DEMO_PRODUCTS.find((product) => product.name.includes("Lashubile"));
  assert.ok(lashubile);
  assert.equal(lashubile?.price, 35);
  assert.ok(!lashubile?.comingSoon);
});

test("every other sample product is declared coming soon", () => {
  const comingSoon = DEMO_PRODUCTS.filter((product) => product.comingSoon);
  // milk + the two sour-milk lines are live; everything else is coming soon
  assert.equal(DEMO_PRODUCTS.length - comingSoon.length, 3);
  for (const product of comingSoon) {
    assert.equal(product.comingSoon, true, `${product.name} is marked coming soon`);
    assert.ok(!product.featured, "coming-soon products are not featured");
  }
});

test("sample farm videos are playable mp4 photo-films with posters", () => {
  assert.ok(DEMO_VIDEOS.length >= 4);
  for (const video of DEMO_VIDEOS) {
    assert.match(video.videoUrl, /\.mp4$/);
    assert.match(video.posterUrl || "", /\.(jpg|jpeg|webp)$/);
    assert.ok(video.title.length > 3);
  }
});

test("a product may be flagged coming soon", () => {
  const result = productSchema.parse({
    name: "Pastured pigs",
    kind: "livestock",
    category: "pigs",
    description: "Healthy pigs raised on pasture.",
    price: 1500,
    unit: "each",
    stock: 8,
    comingSoon: true,
  });
  assert.equal(result.comingSoon, true);
});

test("documents accept a business type and order reference", () => {
  const result = documentSchema.parse({
    name: "Quotation Q-0042 — Green Grocers",
    docType: "quotation",
    relatedOrderId: "TB-7K2M9Q",
  });
  assert.equal(result.docType, "quotation");
  assert.equal(DOCUMENT_TYPE_LABELS[result.docType], "Quotation");
});
