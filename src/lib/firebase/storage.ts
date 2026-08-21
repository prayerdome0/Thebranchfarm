import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type StorageReference,
} from "firebase/storage";
import { auth, app } from "./config";

const storage = getStorage(app);

function safeName(fileName: string) {
  const clean = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
  return clean || "file";
}

function uniquePrefix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function storageRefAt(path: string): StorageReference {
  return ref(storage, path);
}

/**
 * Uploads a file to Firebase Storage and returns its public download URL.
 * `path` is relative to the bucket root (e.g. "animal-photos/C-001/photo.jpg").
 */
export async function uploadToStorage(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ downloadUrl: string; storagePath: string }> {
  const target = ref(storage, path);
  const uploadTask = uploadBytesResumable(target, file, {
    contentType: file.type || "application/octet-stream",
  });
  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(percent);
      },
      (error) => reject(error),
      () => resolve(),
    );
  });
  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
  return { downloadUrl, storagePath: path };
}

/** Simple upload without progress reporting. */
export async function uploadToStorageQuiet(path: string, file: File) {
  const target = ref(storage, path);
  await uploadBytes(target, file, { contentType: file.type || "application/octet-stream" });
  const downloadUrl = await getDownloadURL(target);
  return { downloadUrl, storagePath: path };
}

/**
 * Animal photograph upload. Kept separate so callers never worry about the
 * folder layout — every photo lands under `animal-photos/{animalId}/`.
 */
export async function uploadAnimalPhoto(
  animalId: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const slug = slugSafe(animalId);
  const path = `animal-photos/${slug}/${uniquePrefix()}-${safeName(file.name)}`;
  return uploadToStorage(path, file, onProgress);
}

/** Health record supporting photo shares the animal folder. */
export async function uploadHealthPhoto(
  animalId: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const slug = slugSafe(animalId);
  const path = `animal-photos/${slug}/health/${uniquePrefix()}-${safeName(file.name)}`;
  return uploadToStorage(path, file, onProgress);
}

/** Farm document upload — any supported file type. */
export async function uploadFarmDocument(
  file: File,
  onProgress?: (percent: number) => void,
) {
  const uid = auth.currentUser?.uid || "team";
  const path = `documents/${uid}/${uniquePrefix()}-${safeName(file.name)}`;
  return uploadToStorage(path, file, onProgress);
}

export async function deleteStorageObject(storagePath?: string) {
  if (!storagePath) return;
  await deleteObject(ref(storage, storagePath));
}

function slugSafe(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "animal";
}
