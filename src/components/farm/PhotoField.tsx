"use client";

import { CloudUpload, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteStorageObject } from "@/lib/firebase/storage";
import { friendlyError } from "@/lib/utils";

export interface UploadResult {
  url: string;
  path: string;
}

export function PhotoField({
  label = "Photo",
  value,
  path,
  upload,
  onChange,
  hint = "Uploaded securely through the farm server. JPG, PNG or WebP up to 8 MB.",
}: {
  label?: string;
  value?: string;
  path?: string;
  upload: (file: File, onProgress: (percent: number) => void) => Promise<UploadResult>;
  onChange: (result: { url?: string; path?: string }) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFile = async (file?: File) => {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("The image is larger than 8 MB. Choose a smaller file.");
      return;
    }
    setError("");
    setUploading(true);
    setProgress(0);
    try {
      const result = await upload(file, setProgress);
      onChange({ url: result.url, path: result.path });
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (path) {
      await deleteStorageObject(path).catch(() => {});
    }
    onChange({ url: undefined, path: undefined });
  };

  return (
    <div className="photo-field field-full">
      <span className="label">{label}</span>
      <div className={value ? "photo-preview" : "photo-preview empty"}>
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} />
            <button type="button" className="icon-button icon-button-small remove" onClick={remove} title="Remove photo">
              <Trash2 size={15} />
            </button>
          </>
        ) : (
          <span>{uploading ? `Uploading ${progress}%` : "No photo yet"}</span>
        )}
      </div>
      <label className="button button-secondary file-button" style={{ width: "max-content" }}>
        <CloudUpload size={17} />
        {uploading ? `Uploading ${progress}%` : value ? "Replace photo" : "Upload photo"}
        <input
          type="file"
          accept="image/*"
          onChange={(event) => handleFile(event.target.files?.[0])}
          disabled={uploading}
        />
      </label>
      <small className="field-error" role="alert" style={{ display: error ? "block" : "none" }}>
        {error}
      </small>
      <small>{hint}</small>
    </div>
  );
}
