"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

/**
 * Muted, looping clip that starts playing when it scrolls into view and pauses
 * when it leaves. Used across the homepage so every section has motion without
 * hammering the connection (nothing preloads until it is near the viewport).
 */
export function InlineVideo({
  src,
  poster,
  className,
  label,
  rounded = true,
  showSound = true,
  playOnHoverOnly = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
  rounded?: boolean;
  showSound?: boolean;
  playOnHoverOnly?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || playOnHoverOnly) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true);
            node.play().catch(() => {});
          } else {
            node.pause();
          }
        });
      },
      { threshold: 0.28 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [playOnHoverOnly]);

  const hoverPlay = () => {
    if (!playOnHoverOnly) return;
    setStarted(true);
    ref.current?.play().catch(() => {});
  };

  const hoverStop = () => {
    if (!playOnHoverOnly) return;
    const node = ref.current;
    if (!node) return;
    node.pause();
    node.currentTime = 0;
  };

  return (
    <span
      className={`inline-video ${rounded ? "inline-video-rounded" : ""} ${className || ""}`}
      onMouseEnter={hoverPlay}
      onMouseLeave={hoverStop}
      onFocus={hoverPlay}
      onBlur={hoverStop}
    >
      <video
        ref={ref}
        muted={muted}
        loop
        playsInline
        preload="none"
        poster={poster}
        aria-label={label}
        onClick={() => {
          const node = ref.current;
          if (!node) return;
          if (node.paused) node.play().catch(() => {});
          else node.pause();
        }}
      >
        <source src={src} />
      </video>
      {!started && (
        <span className="inline-video-play" aria-hidden="true">
          <Play size={20} fill="currentColor" />
        </span>
      )}
      {showSound && (
        <button
          type="button"
          className="inline-video-sound"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const node = ref.current;
            const next = !muted;
            setMuted(next);
            if (node) {
              node.muted = next;
              node.play().catch(() => {});
            }
          }}
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}
      {label && <span className="inline-video-label">{label}</span>}
    </span>
  );
}
