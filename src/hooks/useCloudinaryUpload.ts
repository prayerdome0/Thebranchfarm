"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/config";

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const upload = async (file: File, folder: "products" | "gallery" | "animals" | "documents" | "profiles" = "products") => {
    if (!auth.currentUser) throw new Error("unauthenticated");
    if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be smaller than 8 MB.");
    setUploading(true); setProgress(10);
    try {
      const token = await auth.currentUser.getIdToken();
      const signatureResponse = await fetch("/api/cloudinary/sign", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ folder }) });
      const signed = await signatureResponse.json();
      if (!signatureResponse.ok) throw new Error(signed.error || "Could not authorize the upload.");
      setProgress(30);
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signed.apiKey);
      form.append("timestamp", String(signed.timestamp));
      form.append("signature", signed.signature);
      form.append("folder", signed.folder);
      form.append("transformation", signed.transformation);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: form });
      setProgress(90);
      const result = await response.json();
      if (!response.ok) throw new Error("The media service rejected the upload.");
      setProgress(100);
      return { url: result.secure_url as string, publicId: result.public_id as string };
    } finally { setUploading(false); window.setTimeout(() => setProgress(0), 500); }
  };
  return { upload, uploading, progress };
}
