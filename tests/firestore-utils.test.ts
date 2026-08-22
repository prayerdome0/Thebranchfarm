import test from "node:test";
import assert from "node:assert/strict";
import { cleanFirestoreData } from "../src/lib/firestoreUtils";

test("cleanFirestoreData removes undefined fields from plain objects", () => {
  const input = {
    name: "Fresh milk",
    price: 16,
    image: undefined,
    imagePath: undefined,
    fileUrl: undefined,
    publicId: undefined,
    salePrice: null,
    images: [],
  };
  const output = cleanFirestoreData(input);
  assert.deepEqual(output, { name: "Fresh milk", price: 16, salePrice: null, images: [] });
  assert.equal("image" in output, false);
});

test("cleanFirestoreData cleans nested objects and arrays", () => {
  const input = {
    animalId: "abc123",
    type: "observation",
    problem: "Not eating",
    photo: undefined,
    photoPath: undefined,
    items: [{ name: "Milk", quantity: 2, image: undefined }, { name: "Eggs", quantity: 1 }],
  };
  const output = cleanFirestoreData(input);
  assert.deepEqual(output.items, [
    { name: "Milk", quantity: 2 },
    { name: "Eggs", quantity: 1 },
  ]);
  assert.equal("photo" in output, false);
});

test("cleanFirestoreData keeps dates and class instances (sentinels) untouched", () => {
  const date = new Date("2026-08-22T00:00:00.000Z");
  class Sentinel {
    marker = true;
  }
  const sentinel = new Sentinel();
  const output = cleanFirestoreData({ createdAt: date, marker: sentinel, count: 0 });
  assert.equal(output.createdAt, date);
  assert.equal(output.marker, sentinel);
});

test("cleanFirestoreData keeps falsy but valid Firestore values", () => {
  const output = cleanFirestoreData({
    active: false,
    stock: 0,
    trackInventory: false,
    notes: "",
  });
  assert.deepEqual(output, { active: false, stock: 0, trackInventory: false, notes: "" });
});

test("a health record with no attachment writes cleanly", () => {
  const values = {
    animalId: "abc123",
    animalLabel: "Cattle · C-001 · Bella",
    type: "observation",
    problem: "Not eating normally",
    observation: "Reduced appetite",
    actionTaken: "",
    medication: undefined,
    date: "2026-08-22",
    nextDate: undefined,
    notes: "",
    photo: undefined,
    photoPath: undefined,
  } as Record<string, unknown>;
  const output = cleanFirestoreData(values);
  assert.equal("photo" in output, false);
  assert.equal("photoPath" in output, false);
  assert.equal("nextDate" in output, false);
  assert.equal(output.problem, "Not eating normally");
});

test("a product with no uploaded image writes cleanly", () => {
  const values = {
    name: "Fresh eggs",
    kind: "produce",
    category: "eggs",
    description: "Fresh eggs collected daily.",
    price: 75,
    salePrice: null,
    unit: "dozen",
    stock: 40,
    trackInventory: true,
    allowBackorder: false,
    comingSoon: false,
    active: true,
    published: true,
    featured: false,
    image: undefined,
    imagePath: undefined,
    images: [],
    imagePaths: [],
    fileUrl: undefined,
    publicId: undefined,
  } as Record<string, unknown>;
  const output = cleanFirestoreData(values);
  assert.equal("image" in output, false);
  assert.equal("imagePath" in output, false);
  assert.equal("fileUrl" in output, false);
  assert.equal("publicId" in output, false);
  assert.deepEqual(output.images, []);
  assert.deepEqual(output.imagePaths, []);
});
