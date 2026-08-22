"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clapperboard, ExternalLink, Plus, Search, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { VideoForm, type VideoFormValues } from "@/components/store/VideoForm";
import { useToast } from "@/contexts/ToastContext";
import { createVideo, deleteVideo, watchManagedVideos } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { FarmVideo } from "@/types";
import { BUSINESS } from "@/lib/constants";

export default function WorkspaceVideosPage() {
  const { showToast } = useToast();
  const [videos, setVideos] = useState<FarmVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const stop = watchManagedVideos((list) => { setVideos(list); setLoading(false); });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return videos.filter((video) => !term || [video.title, video.category, video.description].some((v) => String(v).toLowerCase().includes(term)));
  }, [videos, search]);

  const handleDelete = async (video: FarmVideo) => {
    if (!confirm(`Delete \"${video.title}\"?`)) return;
    await deleteVideo(video.id);
    showToast("Video deleted", "success");
  };

  const handleSubmit = async (values: VideoFormValues) => {
    await createVideo({
      title: values.title,
      description: values.description,
      category: values.category,
      videoUrl: values.videoUrl,
      storagePath: values.storagePath,
      posterUrl: values.posterUrl,
      posterPath: values.posterPath,
      fileUrl: values.videoUrl,
      publicId: values.storagePath.replace("cloudinary:", ""),
      published: true,
      featured: false,
    } as any);
    showToast(`Video uploaded — Cloudinary no folders, ${BUSINESS.name}`, "success");
    setAdding(false);
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Farm Videos</h2>
          <p>Admin can upload, delete, add title, description, thumbnail, publish/unpublish. Public gallery shows only published media. Stored Cloudinary dhad95cch / branch_farm_unsigned, no folders.</p>
        </div>
        <button className="button button-primary" onClick={() => setAdding((v) => !v)}><Plus size={18} /> {adding ? "Close" : "Add video"}</button>
      </section>

      {adding && <div className="dashboard-panel"><VideoForm submitLabel="Upload / Publish" onCancel={() => setAdding(false)} onSubmit={handleSubmit} /></div>}

      <div className="farm-toolbar">
        <div className="search-field"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search videos…" /></div>
        <Link className="text-link" href="/gallery" target="_blank"><ExternalLink size={15} /> Public gallery</Link>
      </div>

      {loading ? <Loading label="Loading videos…" /> : visible.length ? (
        <div className="dashboard-panel" style={{ display: "grid", gap: 0 }}>
          {visible.map((video) => (
            <article key={video.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", padding: "13px 0", borderTop: "1px solid #edf0ed" }}>
              <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", color: "var(--green-600)", background: "var(--green-50)", borderRadius: "50%" }}><Clapperboard size={19} /></span>
              <div style={{ minWidth: 0, display: "grid" }}>
                <strong style={{ fontSize: ".8rem" }}>{video.title}</strong>
                <small style={{ color: "var(--muted)", fontSize: ".62rem" }}>{video.category} · {formatDate(video.createdAt)} {video.published === false ? "· Unpublished" : "· Published"} {video.featured ? "· Featured" : ""}</small>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="icon-button icon-button-small" onClick={() => handleDelete(video)}><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={Clapperboard} title="No videos yet" description="Upload farm videos. Only published appears publicly." action={<button className="button button-primary" onClick={() => setAdding(true)}><Plus size={18} /> Add video</button>} />
      )}
    </div>
  );
}
