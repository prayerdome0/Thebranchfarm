"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { FarmVideo } from "@/types";

export function VideoCard({ video, priority = false }: { video: FarmVideo; priority?: boolean }) {
  const poster = video.posterUrl || video.thumbnailUrl || "/media/farm-sunset.jpg";
  const isRealVideo = video.videoUrl && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(video.videoUrl);

  return (
    <article className="farm-video-card">
      <div className="farm-video-frame">
        {isRealVideo ? (
          <video controls poster={poster} preload="metadata" playsInline>
            <source src={video.videoUrl} />
            Your browser does not support video playback.
          </video>
        ) : (
          <div className="video-still" aria-label={video.title}>
            <Image src={poster} alt={video.title} fill sizes="(max-width: 780px) 100vw, 50vw" priority={priority} />
          </div>
        )}
        <span className="farm-video-play" aria-hidden="true">
          <Play size={22} fill="currentColor" />
        </span>
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
