import { Play } from "lucide-react";
import type { FarmVideo } from "@/types";

export function FarmVideoCard({ video }: { video: FarmVideo }) {
  return (
    <article className="farm-video-card">
      <div className="farm-video-frame">
        <video
          controls
          preload="none"
          playsInline
          poster={video.poster}
          aria-label={`${video.title} — ${video.description}`}
        >
          <source src={video.src} type="video/mp4" />
          Your browser does not support embedded video. Please use the poster image instead.
        </video>
        <span className="farm-video-play" aria-hidden="true"><Play size={18} fill="currentColor" /></span>
      </div>
      <div className="farm-video-body">
        <div className="farm-video-meta"><span>{video.category}</span><span>Video</span></div>
        <h3>{video.title}</h3>
        <p>{video.description}</p>
      </div>
    </article>
  );
}
