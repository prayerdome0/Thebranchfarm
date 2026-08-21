import test from "node:test";
import assert from "node:assert/strict";
import { BUSINESS, ANIMAL_STATUS_LABELS, HEALTH_STATUS_LABELS } from "../src/lib/constants";
import { animalSchema, healthRecordSchema, registerSchema } from "../src/lib/validation";
import { documentCategory, friendlyError, money } from "../src/lib/utils";

test("farm identity and currency stay on the official configuration", () => {
  assert.equal(BUSINESS.name, "The Branch Farm");
  assert.equal(BUSINESS.slogan, "Nayi Plug");
  assert.equal(BUSINESS.currency, "E");
});

test("currency formatting uses Eswatini E", () => {
  assert.equal(money(6500), "E6,500");
  assert.equal(money(35.5), "E35.50");
  assert.equal(money(null), "—");
  assert.equal(money(undefined), "—");
});

test("an animal record accepts a full purchase profile", () => {
  const result = animalSchema.parse({
    animalId: "C-001",
    tagNumber: "TAG-001",
    name: "Bella",
    animalType: "cattle",
    breed: "Jersey",
    sex: "female",
    dateOfBirth: "2023-05-01",
    datePurchased: "2026-08-01",
    purchasePrice: "6500",
    supplier: "Mahlabane auction",
    location: "Main cattle pen",
    weight: "420",
    status: "active",
    healthStatus: "healthy",
    notes: "Calm temperament.",
  });
  assert.equal(result.animalId, "C-001");
  assert.equal(result.breed, "Jersey");
});

test("an animal record requires ID, breed and location", () => {
  const base = {
    animalType: "cattle",
    breed: "Jersey",
    sex: "female",
    status: "active",
    healthStatus: "healthy",
  };
  assert.equal(animalSchema.safeParse({ ...base, animalId: "", location: "Pen" }).success, false);
  assert.equal(animalSchema.safeParse({ ...base, animalId: "C-002", location: "" }).success, false);
  assert.equal(
    animalSchema.safeParse({ ...base, animalId: "C-002", breed: "", location: "Pen" }).success,
    false,
  );
});

test("a health record captures problem, observation, action and date", () => {
  const result = healthRecordSchema.parse({
    animalId: "abc123",
    type: "problem",
    problem: "Animal not eating normally",
    observation: "Reduced appetite",
    actionTaken: "Monitoring",
    date: "2026-08-21",
  });
  assert.equal(result.problem, "Animal not eating normally");
  assert.equal(result.actionTaken, "Monitoring");
});

test("health record requires an animal and a problem", () => {
  assert.equal(
    healthRecordSchema.safeParse({ animalId: "", type: "problem", problem: "x", date: "2026-08-21" })
      .success,
    false,
  );
  assert.equal(
    healthRecordSchema.safeParse({ animalId: "a", type: "problem", problem: "", date: "2026-08-21" })
      .success,
    false,
  );
});

test("document category is derived from file type without extra storage systems", () => {
  assert.equal(documentCategory("cert.pdf", "application/pdf"), "pdf");
  assert.equal(documentCategory("photo.jpg", "image/jpeg"), "image");
  assert.equal(documentCategory("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "word");
  assert.equal(documentCategory("herd.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), "excel");
  assert.equal(documentCategory("clip.mp4", "video/mp4"), "video");
  assert.equal(documentCategory("notes.txt", "text/plain"), "other");
});

test("status labels exist for every animal and health status", () => {
  assert.equal(ANIMAL_STATUS_LABELS.active, "Active");
  assert.equal(ANIMAL_STATUS_LABELS.sold, "Sold");
  assert.equal(HEALTH_STATUS_LABELS.healthy, "Healthy");
  assert.equal(HEALTH_STATUS_LABELS.sick, "Sick");
});

test("registration trims profile fields and canonicalizes email", () => {
  const result = registerSchema.parse({
    fullName: "  Staff Member  ",
    email: "  STAFF@example.com ",
    phone: "  +268 7900 0000  ",
    password: "strong-password",
    confirmPassword: "strong-password",
  });
  assert.equal(result.fullName, "Staff Member");
  assert.equal(result.email, "staff@example.com");
  assert.equal(result.phone, "+268 7900 0000");
});

test("public registration cannot select a privileged role", () => {
  const input = {
    fullName: "Staff Member",
    email: "staff@example.com",
    phone: "+268 7900 0000",
    password: "strong-password",
    confirmPassword: "strong-password",
    role: "admin",
  };
  const result = registerSchema.parse(input);
  assert.equal("role" in result, false);
});

test("auth errors show a real sign-in message instead of a generic form warning", () => {
  const asFirebase = (code: string) => Object.assign(new Error(`Firebase: Error (${code})`), { code });
  assert.equal(friendlyError(asFirebase("auth/invalid-credential")), "The email or password is incorrect.");
  assert.equal(friendlyError(asFirebase("auth/email-already-in-use")), "An account already exists for this email address. Try signing in instead.");
  assert.equal(friendlyError(asFirebase("auth/weak-password")), "Use a stronger password with at least 8 characters.");
  assert.equal(friendlyError(asFirebase("auth/user-disabled")), "This account has been disabled. Please contact the farm administrator.");
  assert.notEqual(friendlyError(asFirebase("auth/invalid-credential")), "Please review the information and try again.");
});
