"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clapperboard, Play } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { Reveal } from "@/components/ui/Reveal";
import { VideoCard } from "@/components/store/VideoCard";
import { VIDEO_CATEGORIES } from "@/lib/constants";
import { watchVideos } from "@/lib/firebase/data";
import { cn } from "@/lib/utils";
import type { FarmVideo } from "@/types";

export default function VideosPage() {
  const [videos, setVideos] = useState<FarmVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const stop = watchVideos((list) => {
      setVideos(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(
    () => videos.filter((video) => category === "all" || video.category === category),
    [videos, category],
  );

  return (
    <>
      <section className="page-hero videos-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">Videos</span>
          <h1>Watch the farm at work.</h1>
          <p>
            Tours, livestock and daily life at Mahlabane — see the farm in motion.
          </p>
        </div>
      </section>

      <section className="section videos-section">
        <div className="container">
          <Reveal>
            <div className="filter-scroll" role="tablist" aria-label="Filter videos by category">
              <button
                type="button"
                className={cn(category === "all" && "active")}
                onClick={() => setCategory("all")}
              >
                All
              </button>
              {VIDEO_CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(category === option && "active")}
                  onClick={() => setCategory(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </Reveal>

          {loading ? (
            <Loading label="Loading videos…" />
          ) : visible.length ? (
            <div className="farm-video-grid">
              {visible.map((video, index) => (
                <Reveal key={video.id} delay={(index % 2) * 90}>
                  <VideoCard video={video} priority={index < 2} />
                </Reveal>
              ))}
            </div>
          ) : videos.length ? (
            <EmptyState
              icon={Clapperboard}
              title="No videos in this category"
              description="Try a different filter."
            />
          ) : (
            <Reveal>
              <EmptyState
                icon={Clapperboard}
                title="Videos coming soon"
                description="The farm team is filming. Check back soon for tours and daily-life videos."
                action={
                  <Link className="button button-primary" href="/shop">
                    Browse the shop <ArrowRight size={17} />
                  </Link>
                }
              />
            </Reveal>
          )}

          <Reveal>
            <div className="video-disclosure">
              <Play size={18} />
              <p>
                <strong>Farm-direct footage</strong>
                <span>
                  Videos are recorded on the farm and shared as-is — no filters, no staging.
                </span>
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
