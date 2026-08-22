import test from "node:test";
import assert from "node:assert/strict";
import {
  FARM_MODULES,
  defaultOperationValues,
  makeOperationReference,
  normalizeOperationValues,
  operationAttention,
  operationCoreFields,
  validateOperationValues,
} from "../src/lib/farmModules";
import type { FarmOperationRecord } from "../src/types";

test("the operational center exposes every required farm module", () => {
  assert.deepEqual(Object.keys(FARM_MODULES).sort(), [
    "acquisition", "birth", "breeding", "daily-log", "eggs", "equipment", "expense",
    "feed", "incident", "inventory", "maintenance", "milk", "movement", "task", "weight",
  ]);
  for (const definition of Object.values(FARM_MODULES)) {
    assert.ok(definition.fields.length >= 5, `${definition.module} should have a complete form`);
    assert.equal(definition.permission, "Farm Operations");
  }
});

test("feed and inventory remaining stock is calculated safely", () => {
  const feed = normalizeOperationValues(FARM_MODULES.feed, {
    ...defaultOperationValues(FARM_MODULES.feed),
    feedType: "Dairy meal",
    date: "2026-08-22",
    unit: "kg",
    openingQuantity: "100",
    quantityReceived: "40",
    quantityUsed: "105",
    wastage: "5",
    reorderLevel: "35",
  });
  assert.equal(feed.remaining, 30);
  assert.equal(feed.stockStatus, "low");

  const inventory = normalizeOperationValues(FARM_MODULES.inventory, {
    ...defaultOperationValues(FARM_MODULES.inventory),
    itemName: "Gloves",
    category: "Other supplies",
    transactionType: "Stock count",
    date: "2026-08-22",
    unit: "boxes",
    openingQuantity: "5",
    quantityReceived: "2",
    quantityUsed: "20",
    reorderLevel: "1",
  });
  assert.equal(inventory.remaining, 0, "remaining stock must never be negative");
  assert.equal(inventory.stockStatus, "low");
});

test("milk and egg production totals are derived from the recorded split", () => {
  const milk = normalizeOperationValues(FARM_MODULES.milk, {
    ...defaultOperationValues(FARM_MODULES.milk),
    date: "2026-08-22",
    animalGroup: "Milking herd",
    morningProduction: "36.5",
    eveningProduction: "28.5",
    spoiledQuantity: "2",
    quantitySold: "45",
    farmUse: "5",
  });
  assert.equal(milk.totalProduction, 65);
  assert.equal(milk.remaining, 13);

  const eggs = normalizeOperationValues(FARM_MODULES.eggs, {
    ...defaultOperationValues(FARM_MODULES.eggs),
    date: "2026-08-22",
    flock: "Layer house A",
    eggsCollected: "120",
    goodEggs: "115",
    damagedEggs: "5",
    sold: "80",
    used: "10",
  });
  assert.equal(eggs.remaining, 25);
});

test("required operational fields are validated and references are professional", () => {
  const values = normalizeOperationValues(FARM_MODULES.incident, { ...defaultOperationValues(FARM_MODULES.incident), category: "" });
  assert.match(validateOperationValues(FARM_MODULES.incident, values) || "", /Problem type is required/);
  assert.match(makeOperationReference(FARM_MODULES.incident, new Date("2026-08-22T12:00:00Z")), /^INC-20260822-[A-Z0-9]{4}$/);
});

test("operation core fields resolve animal and assigned staff names", () => {
  const values = normalizeOperationValues(FARM_MODULES.task, {
    ...defaultOperationValues(FARM_MODULES.task),
    task: "Vaccinate cattle",
    description: "Give scheduled vaccine",
    assignedTo: "staff-1",
    assignedDate: "2026-08-22",
    dueDate: "2026-08-24",
    priority: "high",
    status: "pending",
  });
  const core = operationCoreFields(FARM_MODULES.task, values, (id) => id, () => "Mary Farmworker");
  assert.equal(core.title, "Vaccinate cattle");
  assert.equal(core.assignedToName, "Mary Farmworker");
  assert.equal(core.dueDate, "2026-08-24");
  assert.equal(core.priority, "high");
});

test("critical incidents and overdue tasks are immediately highlighted", () => {
  const base = {
    id: "1",
    reference: "INC-1",
    title: "Water failure",
    date: "2026-08-20",
    summary: "",
    values: {},
    attachments: [],
    reviewStatus: "not-required" as const,
    createdBy: "staff",
    createdByName: "John",
    createdAt: "2026-08-20",
    updatedBy: "staff",
    updatedByName: "John",
    updatedAt: "2026-08-20",
  };
  const incident: FarmOperationRecord = { ...base, module: "incident", status: "open", priority: "critical" };
  assert.deepEqual(operationAttention(incident).tone, "critical");

  const task: FarmOperationRecord = { ...base, module: "task", status: "pending", dueDate: "2026-08-21" };
  assert.deepEqual(operationAttention(task, new Date("2026-08-22T12:00:00Z")), { tone: "critical", label: "Overdue" });
});
