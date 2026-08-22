"use client";

import { useEffect, useState } from "react";
import { Images, Video, Trash2, Star, Eye, EyeOff, Upload } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { watchFarmMedia, createFarmMedia, deleteFarmMedia, updateFarmMedia } from "@/lib/firebase/data";
import { resolveCloudinaryConfig, uploadFarmPhotoToCloudinary, uploadFarmVideoToCloudinary } from "@/lib/cloudinary";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import type { FarmMedia } from "@/types";

export default function FarmMediaPage() {
  const { showToast } = useToast();
  const { settings } = useStoreConfig();
  const [media, setMedia] = useState<FarmMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const stop = watchFarmMedia((list) => {
      setMedia(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = media.filter((m) => filter === "all" || m.type === filter);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const file = files[0];
    const isVideo = file.type.startsWith("video/");
    const config = resolveCloudinaryConfig(settings);
    setUploading(true);
    try {
      const result = isVideo ? await uploadFarmVideoToCloudinary(file, config) : await uploadFarmPhotoToCloudinary(file, config);
      await createFarmMedia({
        title: file.name,
        caption: "",
        fileUrl: result.url,
        publicId: result.publicId,
        resourceType: isVideo ? "video" : "image",
        type: isVideo ? "video" : "photo",
        featured: false,
        published: true,
      });
      showToast(`${isVideo ? "Video" : "Photo"} uploaded`, "success");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const togglePublish = async (item: FarmMedia) => {
    await updateFarmMedia(item.id, { published: !item.published });
  };
  const toggleFeatured = async (item: FarmMedia) => {
    await updateFarmMedia(item.id, { featured: !item.featured });
  };
  const handleDelete = async (item: FarmMedia) => {
    if (!confirm(`Delete ${item.type}?`)) return;
    await deleteFarmMedia(item.id);
    showToast("Deleted", "success");
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Farm Media</h2>
          <p>Photos and videos — upload, delete, set featured, add caption, publish/unpublish. Public gallery shows only published media.</p>
        </div>
        <label className="button button-primary" style={{ position: "relative", overflow: "hidden" }}>
          <Upload size={18} /> {uploading ? "Uploading…" : "Upload Photo/Video"}
          <input type="file" accept="image/*,video/*" onChange={handleUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} disabled={uploading} />
        </label>
      </section>

      <div className="filter-scroll">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
        <button className={filter === "photo" ? "active" : ""} onClick={() => setFilter("photo")}><Images size={14} /> Photos</button>
        <button className={filter === "video" ? "active" : ""} onClick={() => setFilter("video")}><Video size={14} /> Videos</button>
      </div>

      {loading ? <Loading label="Loading media…" /> : visible.length ? (
        <div className="admin-gallery-grid">
          {visible.map((item) => (
            <article key={item.id}>
              <div style={{ position: "relative", height: 180 }}>
                {item.type === "video" ? (
                  <video src={item.fileUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.fileUrl} alt={item.caption || item.title || "Farm media"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <span>{item.type} · {item.published ? "Published" : "Unpublished"} {item.featured ? "· Featured" : ""}</span>
              <strong>{item.title || item.caption || item.publicId}</strong>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="icon-button icon-button-small" onClick={() => togglePublish(item)} title={item.published ? "Unpublish" : "Publish"}>
                  {item.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button className="icon-button icon-button-small" onClick={() => toggleFeatured(item)} title="Toggle featured">
                  <Star size={14} fill={item.featured ? "currentColor" : "none"} />
                </button>
                <button className="icon-button icon-button-small" onClick={() => handleDelete(item)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={Images} title="No media yet" description="Upload farm photos and videos. Only published media appears publicly in gallery." />
      )}
    </div>
  );
}
