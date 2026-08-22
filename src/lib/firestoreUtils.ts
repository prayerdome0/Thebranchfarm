/**
 * Helpers for building Firestore writes from form/API payloads.
 *
 * Firestore rejects `undefined` values with `invalid-argument`
 * ("Unsupported field value: undefined"), which the UI surfaces as
 * "Please review the information and try again." Optional fields such as
 * photos, paths or sale prices are often undefined when empty, so every
 * write goes through `cleanFirestoreData` before it hits the SDK.
 */

export function cleanFirestoreData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    // Only plain objects are recursed into — Dates, Timestamps, FieldValue
    // sentinels, Firestore references etc. pass through untouched.
    if (prototype === Object.prototype || prototype === null) {
      const output: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (item !== undefined) output[key] = cleanFirestoreData(item);
      }
      return output as T;
    }
  }
  return value;
}
