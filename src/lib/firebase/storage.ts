import { deleteObject, getStorage, ref } from "firebase/storage";
import { app, firebaseConfigured } from "./config";

// Storage is optional in demo/preview builds. Do not ask the SDK to create a
// storage service from the intentionally empty Firebase app handle.
const storage = firebaseConfigured ? getStorage(app) : null;

/**
 * Remove a legacy Firebase Storage object.
 *
 * New assets are uploaded through the authenticated /api/uploads proxy
 * (signed server-side). Cloudinary assets cannot be deleted securely from browser code, so
 * their lifecycle is managed in Cloudinary while the associated app record is
 * removed normally.
 */
export async function deleteStorageObject(storagePath?: string) {
  if (!storagePath || storagePath.startsWith("cloudinary:") || !storage) return;
  await deleteObject(ref(storage, storagePath));
}
