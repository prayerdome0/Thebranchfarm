import { deleteObject, getStorage, ref } from "firebase/storage";
import { app } from "./config";

const storage = getStorage(app);

/**
 * Remove a legacy Firebase Storage object.
 *
 * New assets are uploaded to Cloudinary with the unsigned `branch_farm`
 * preset. Cloudinary assets cannot be deleted securely from browser code, so
 * their lifecycle is managed in Cloudinary while the associated app record is
 * removed normally.
 */
export async function deleteStorageObject(storagePath?: string) {
  if (!storagePath || storagePath.startsWith("cloudinary:")) return;
  await deleteObject(ref(storage, storagePath));
}
