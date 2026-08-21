import test from "node:test";
import assert from "node:assert/strict";
import { BUSINESS, INITIAL_PRODUCTS, ORDER_TRANSITIONS } from "../src/lib/constants";
import { checkoutSchema, registerSchema } from "../src/lib/validation";
import { deliveryDetails, friendlyError, money } from "../src/lib/utils";

test("official launch catalogue has exactly the declared active products and prices", () => {
  const active = INITIAL_PRODUCTS.filter((product) => product.availability === "available");
  assert.deepEqual(
    active.map(({ id, price }) => ({ id, price })),
    [
      { id: "raw-fresh-full-fat-milk", price: 16 },
      { id: "sour-milk-latsambile", price: 20 },
      { id: "sour-milk-lashubile", price: 35 },
    ],
  );
  for (const id of ["farm-beef", "farm-eggs", "farm-pork", "farm-chicken"]) {
    assert.equal(INITIAL_PRODUCTS.find((product) => product.id === id)?.availability, "coming-soon");
  }
});

test("coming-soon products keep a clear visual placeholder", () => {
  const future = INITIAL_PRODUCTS.filter((product) => product.availability === "coming-soon");
  assert.equal(future.length, 4);
  for (const product of future) {
    assert.equal(product.images.length > 0, true);
    assert.equal(product.images[0].startsWith("/media/"), true);
  }
});

test("delivery is free only in configured areas and never invents another fee", () => {
  assert.deepEqual(deliveryDetails("Manzini"), { fee: 0, label: "FREE delivery" });
  assert.deepEqual(deliveryDetails("Matsapha industrial area"), { fee: 0, label: "FREE delivery" });
  assert.deepEqual(deliveryDetails("Mbabane"), { fee: null, label: "To be arranged" });
  assert.deepEqual([...BUSINESS.freeDeliveryAreas], ["Manzini", "Matsapha"]);
});

test("currency formatting uses Eswatini E", () => {
  assert.equal(money(16), "E16");
  assert.equal(money(35.5), "E35.50");
  assert.equal(money(null), "To be arranged");
});

test("checkout requires agreement and a touchscreen signature", () => {
  const base = {
    fullName: "Nomsa Dlamini",
    phone: "+268 7612 3456",
    email: "",
    location: "Manzini",
    address: "Near the central market",
    instructions: "Please call on arrival",
    whatsappAvailable: false,
    agreementAccepted: true as const,
    signature: `data:image/png;base64,${"a".repeat(100)}`,
  };
  assert.equal(checkoutSchema.safeParse(base).success, true);
  assert.equal(checkoutSchema.safeParse({ ...base, agreementAccepted: false }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...base, signature: "" }).success, false);
});

test("order status workflow prevents skipping controlled stages", () => {
  assert.deepEqual(ORDER_TRANSITIONS.pending, ["confirmed", "cancelled"]);
  assert.equal(ORDER_TRANSITIONS.pending.includes("delivered"), false);
  assert.deepEqual(ORDER_TRANSITIONS.delivered, ["completed"]);
  assert.deepEqual(ORDER_TRANSITIONS.completed, []);
});

test("registration trims profile fields and canonicalizes email", () => {
  const result = registerSchema.parse({
    fullName: "  Customer User  ",
    email: "  CUSTOMER@example.com ",
    phone: "  +268 7900 0000  ",
    password: "strong-password",
    confirmPassword: "strong-password",
  });
  assert.equal(result.fullName, "Customer User");
  assert.equal(result.email, "customer@example.com");
  assert.equal(result.phone, "+268 7900 0000");
});

test("auth errors show a real sign-in message instead of a generic form warning", () => {
  const asFirebase = (code: string) => Object.assign(new Error(`Firebase: Error (${code})`), { code });
  assert.equal(friendlyError(asFirebase("auth/invalid-credential")), "The email or password is incorrect.");
  assert.equal(friendlyError(asFirebase("auth/email-already-in-use")), "An account already exists for this email address. Try signing in instead.");
  assert.equal(friendlyError(asFirebase("auth/weak-password")), "Use a stronger password with at least 8 characters.");
  assert.equal(friendlyError(asFirebase("auth/user-disabled")), "This account has been disabled. Please contact the farm team.");
  assert.notEqual(friendlyError(asFirebase("auth/invalid-credential")), "Please review the information and try again.");
});

test("public registration cannot select a privileged role", () => {
  const input = {
    fullName: "Customer User",
    email: "customer@example.com",
    phone: "+268 7900 0000",
    password: "strong-password",
    confirmPassword: "strong-password",
    role: "admin",
  };
  const result = registerSchema.parse(input);
  assert.equal("role" in result, false);
});
