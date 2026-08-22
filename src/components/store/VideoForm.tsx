"use client";

import { useState } from "react";
import { CircleAlert, CloudUpload, Film } from "lucide-react";
import { PhotoField } from "@/components/farm/PhotoField";
import {
  asStoredCloudinaryAsset,
  uploadFarmVideoToCloudinary,
  uploadVideoPosterToCloudinary,
} from "@/lib/cloudinary";
import { VIDEO_CATEGORIES } from "@/lib/constants";
import { friendlyError } from "@/lib/utils";

export type VideoFormValues = {
  title: string;
  description?: string;
  category: string;
  videoUrl: string;
  storagePath: string;
  posterUrl?: string;
  posterPath?: string;
};

export function VideoForm({
  submitLabel,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  onSubmit: (values: VideoFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(VIDEO_CATEGORIES[0]);
  const [video, setVideo] = useState<{ url: string; path: string } | null>(null);
  const [poster, setPoster] = useState<{ url?: string; path?: string }>({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleVideo = async (file?: File) => {
    if (!file || uploadingVideo) return;
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file (MP4, WebM, MOV…).");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError("The video is larger than 200 MB. Choose a smaller file.");
      return;
    }
    setError("");
    setUploadingVideo(true);
    setVideoProgress(0);
    try {
      const result = await uploadFarmVideoToCloudinary(file, setVideoProgress);
      setVideo(asStoredCloudinaryAsset(result));
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setUploadingVideo(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Enter a title for the video.");
      return;
    }
    if (!video) {
      setError("Upload a video file first.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        videoUrl: video.url,
        storagePath: video.path,
        posterUrl: poster.url,
        posterPath: poster.path,
      });
    } catch (cause) {
      setError(friendlyError(cause));
      setSaving(false);
    }
  };

  return (
    <form className="dashboard-stack" onSubmit={submit} noValidate>
      {error && (
        <div className="form-alert error">
          <CircleAlert size={18} /> {error}
        </div>
      )}

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Video details</h2>
        <div className="auth-field-grid">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {VIDEO_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>
            Description <em>(optional)</em>
          </span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </section>

      <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>Video file</h2>

        {video ? (
          <div className="product-editor-media">
            <span className="product-editor-preview" style={{ width: 150 }}>
              <Film size={30} />
            </span>
            <div>
              <h3>Video ready</h3>
              <p>Your video has been uploaded and will play on the public videos page.</p>
              <label className="button button-secondary button-small file-button">
                <CloudUpload size={15} /> Replace video
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideo(e.target.files?.[0])}
                  disabled={uploadingVideo}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="gallery-drop" style={{ minHeight: 150 }}>
            {uploadingVideo ? (
              <>
                <i className="loader" />
                <strong>Uploading {videoProgress}%…</strong>
                <span>Keep this tab open while the video uploads.</span>
              </>
            ) : (
              <>
                <Film size={28} />
                <strong>Upload a video</strong>
                <span>MP4, WebM or MOV up to 200 MB.</span>
              </>
            )}
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleVideo(e.target.files?.[0])}
              disabled={uploadingVideo}
            />
          </div>
        )}

        <PhotoField
          label="Thumbnail (poster)"
          value={poster.url}
          path={poster.path}
          upload={async (file, onProgress) =>
            asStoredCloudinaryAsset(await uploadVideoPosterToCloudinary(file, onProgress))
          }
          onChange={(result) => setPoster({ url: result.url, path: result.path })}
          hint="Optional cover image. Uploaded securely through the farm server. JPG, PNG or WebP up to 8 MB."
        />
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {onCancel && (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="button button-primary" disabled={saving || uploadingVideo}>
          {saving ? (
            <>
              <i className="button-spinner" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
