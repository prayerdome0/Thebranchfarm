"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { FarmVideo } from "@/types";

/**
 * Uploaded farm clips. When `autoplay` is on (the default for preview grids)
 * the clip plays muted and looping as soon as it scrolls into view and pauses
 * when it leaves, so a full gallery never overloads the connection. Visitors
 * still get native controls to unmute or scrub.
 */
export function VideoCard({ video, priority = false, autoplay = true }: { video: FarmVideo; priority?: boolean; autoplay?: boolean }) {
  const poster = video.posterUrl || video.thumbnailUrl || "/media/farm-sunset.jpg";
  const isRealVideo = video.videoUrl && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(video.videoUrl);
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!autoplay || !isRealVideo) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) node.play().catch(() => {});
          else node.pause();
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoplay, isRealVideo]);

  return (
    <article className="farm-video-card">
      <div className="farm-video-frame">
        {isRealVideo ? (
          <video
            ref={ref}
            poster={poster}
            preload="metadata"
            playsInline
            muted={autoplay}
            loop={autoplay}
            controls
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={video.videoUrl} />
            Your browser does not support video playback.
          </video>
        ) : (
          <div className="video-still" aria-label={video.title}>
            <Image src={poster} alt={video.title} fill sizes="(max-width: 780px) 100vw, 50vw" priority={priority} />
          </div>
        )}
        {(!playing || !autoplay) && (
          <span className="farm-video-play" aria-hidden="true">
            <Play size={22} fill="currentColor" />
          </span>
        )}
      </div>
      <div className="farm-video-body">
        <div className="farm-video-meta">
          <span>{video.category}</span>
          {video.featured && <span>Featured</span>}
        </div>
        <h3>{video.title}</h3>
        {video.description && <p>{video.description}</p>}
      </div>
    </article>
  );
}
