"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, X, ZoomIn, Images, Video, Play } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { watchFarmMedia } from "@/lib/firebase/data";
import type { FarmMedia } from "@/types";
import { BUSINESS } from "@/lib/constants";

const STATIC_IMAGES = [
  { src: "/media/farm-hero.jpg", caption: "The farm at golden hour", tag: "Farm", wide: true },
  { src: "/media/cattle.jpg", caption: "Our dairy herd", tag: "Livestock" },
  { src: "/media/poultry.jpg", caption: "Free-range chickens", tag: "Livestock" },
  { src: "/media/eggs.jpg", caption: "Collected this morning", tag: "Produce" },
  { src: "/media/raw-milk.jpg", caption: "Chilled and bottled", tag: "Produce", tall: true },
  { src: "/media/farm-sunset.jpg", caption: "End of the day", tag: "Farm" },
  { src: "/media/farm-operations.jpg", caption: "Daily operations", tag: "Farm", wide: true },
  { src: "/media/milking-parlour.jpg", caption: "Morning milking", tag: "Dairy", wide: true },
  { src: "/media/milk-bottles.jpg", caption: "Bottled at the farm", tag: "Dairy" },
  { src: "/media/emasi-jars.jpg", caption: "Emasi setting", tag: "Dairy" },
  { src: "/media/goats-herd.jpg", caption: "Boer goats", tag: "Livestock" },
  { src: "/media/vegetable-garden.jpg", caption: "Vegetable garden", tag: "Produce", wide: true },
];

const TAGS = ["All", "Photos", "Videos", "Farm", "Livestock", "Produce", "Dairy"];

export default function GalleryPage() {
  const [tag, setTag] = useState("All");
  const [active, setActive] = useState<any>(null);
  const [media, setMedia] = useState<FarmMedia[]>([]);

  useEffect(() => {
    const stop = watchFarmMedia((list) => {
      setMedia(list.filter((m) => m.published !== false));
    });
    return () => stop();
  }, []);

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");

  const showPhotos = tag === "All" || tag === "Photos" || ["Farm", "Livestock", "Produce", "Dairy"].includes(tag);
  const showVideos = tag === "All" || tag === "Videos";

  return (
    <>
      <section className="page-hero gallery-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">Gallery · {BUSINESS.name}</span>
          <h1>Farm photos & videos</h1>
          <p>Only published media appears publicly. Admin controls publication from Farm Media manager.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="filter-scroll gallery-filters" role="tablist" aria-label="Filter gallery">
            {TAGS.map((option) => (
              <button key={option} type="button" className={tag === option ? "active" : ""} onClick={() => setTag(option)}>
                {option}
              </button>
            ))}
          </div>

          {showVideos && videos.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.3rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Video size={20} /> Videos</h2>
              <div className="farm-video-grid">
                {videos.map((v) => (
                  <div key={v.id} className="farm-video-card">
                    <div className="farm-video-frame">
                      <video src={v.fileUrl} controls poster={v.thumbnailUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div className="farm-video-body">
                      <h3>{v.title || v.caption || "Farm video"}</h3>
                      {v.caption && <p>{v.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPhotos && (
            <>
              {photos.length > 0 && (
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.3rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Images size={20} /> Photos</h2>
                  <div className="gallery-grid">
                    {photos.map((p) => (
                      <button key={p.id} className="gallery-item" onClick={() => setActive({ src: p.fileUrl, caption: p.caption || p.title || "Farm photo", tag: "Farm" })} aria-label={p.caption || "Farm photo"}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.fileUrl} alt={p.caption || "Farm photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <span className="gallery-shade" />
                        <span className="gallery-caption"><strong>{p.caption || p.title || "Farm photo"}</strong></span>
                        <span className="gallery-zoom"><ZoomIn size={18} /></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Reveal>
                <div className="gallery-grid">
                  {STATIC_IMAGES.filter((img) => tag === "All" || tag === "Photos" || img.tag === tag).map((image) => (
                    <button key={image.src} className={`gallery-item ${image.wide ? "gallery-wide" : ""} ${image.tall ? "gallery-tall" : ""}`} onClick={() => setActive(image)} aria-label={`View ${image.caption}`}>
                      <Image src={image.src} alt={image.caption} fill sizes="(max-width: 780px) 100vw, 40vw" />
                      <span className="gallery-shade" />
                      <span className="gallery-caption"><small>{image.tag}</small><strong>{image.caption}</strong></span>
                      <span className="gallery-zoom"><ZoomIn size={18} /></span>
                    </button>
                  ))}
                </div>
              </Reveal>
            </>
          )}

          <div className="gallery-disclosure" style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8, color: "var(--muted)", fontSize: ".75rem" }}>
            <Camera size={15} /> Photos from {BUSINESS.name}, Mahlabane, Eswatini.
          </div>
        </div>
      </section>

      {active && (
        <div className="lightbox" onClick={() => setActive(null)} role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setActive(null)} aria-label="Close"><X size={20} /></button>
          <div className="lightbox-image">
            <Image src={active.src} alt={active.caption} fill sizes="90vw" style={{ objectFit: "contain" }} />
            <div><strong>{active.caption}</strong><small>{active.tag}</small></div>
          </div>
        </div>
      )}
    </>
  );
}
