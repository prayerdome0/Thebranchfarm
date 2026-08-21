"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clapperboard, ExternalLink, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { VideoForm, type VideoFormValues } from "@/components/store/VideoForm";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createVideo, deleteVideo, seedDemoVideos, watchManagedVideos } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { FarmVideo } from "@/types";

export default function WorkspaceVideosPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [videos, setVideos] = useState<FarmVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const stop = watchManagedVideos((list) => {
      setVideos(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return videos.filter(
      (video) =>
        !term ||
        [video.title, video.category, video.description].some((value) =>
          String(value).toLowerCase().includes(term),
        ),
    );
  }, [videos, search]);

  const handleDelete = async (video: FarmVideo) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    await deleteVideo(video.id);
    showToast("Video deleted", "success");
  };

  const handleSubmit = async (values: VideoFormValues) => {
    await createVideo(values);
    showToast("Video added", "success");
    setAdding(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedDemoVideos();
      showToast(`${count} sample videos added`, "success");
    } catch {
      showToast("Could not add sample videos", "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Videos</h2>
          <p>Upload farm videos to share on the public videos page.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isAdmin && !videos.length && (
            <button className="button button-secondary" onClick={handleSeed} disabled={seeding}>
              <Sparkles size={17} /> {seeding ? "Adding…" : "Add sample videos"}
            </button>
          )}
          <button className="button button-primary" onClick={() => setAdding((value) => !value)}>
            <Plus size={18} /> {adding ? "Close" : "Add video"}
          </button>
        </div>
      </section>

      {adding && (
        <div className="dashboard-panel">
          <VideoForm
            submitLabel="Publish video"
            onCancel={() => setAdding(false)}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos…"
            aria-label="Search videos"
          />
        </div>
        <Link className="text-link" href="/videos" target="_blank">
          <ExternalLink size={15} /> View public page
        </Link>
      </div>

      {loading ? (
        <Loading label="Loading videos…" />
      ) : visible.length ? (
        <div className="dashboard-panel" style={{ display: "grid", gap: 0 }}>
          {visible.map((video) => (
            <article
              key={video.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 14,
                alignItems: "center",
                padding: "13px 0",
                borderTop: "1px solid #edf0ed",
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--green-600)",
                  background: "var(--green-50)",
                  borderRadius: "50%",
                }}
              >
                <Clapperboard size={19} />
              </span>
              <div style={{ minWidth: 0, display: "grid" }}>
                <strong style={{ fontSize: ".8rem" }}>{video.title}</strong>
                <small style={{ color: "var(--muted)", fontSize: ".62rem" }}>
                  {video.category} · {formatDate(video.createdAt)}
                </small>
              </div>
              <button
                className="icon-button icon-button-small"
                onClick={() => handleDelete(video)}
                aria-label={`Delete ${video.title}`}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Clapperboard}
          title={videos.length ? "No matching videos" : "No videos yet"}
          description={
            videos.length
              ? "Try a different search."
              : "Upload the first farm video to share it with your customers — or load the sample farm films."
          }
          action={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="button button-primary" onClick={() => setAdding(true)}>
                <Plus size={18} /> Add video
              </button>
              {isAdmin && (
                <button className="button button-secondary" onClick={handleSeed} disabled={seeding}>
                  <Sparkles size={17} /> {seeding ? "Adding…" : "Load sample videos"}
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
