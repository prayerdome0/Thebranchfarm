"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, X, ZoomIn } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

interface GalleryImage {
  src: string;
  caption: string;
  tag: string;
  wide?: boolean;
  tall?: boolean;
}

const IMAGES: GalleryImage[] = [
  { src: "/media/farm-hero.jpg", caption: "The farm at golden hour", tag: "Farm", wide: true },
  { src: "/media/cattle.jpg", caption: "Our dairy herd", tag: "Livestock" },
  { src: "/media/poultry.jpg", caption: "Free-range chickens", tag: "Livestock" },
  { src: "/media/eggs.jpg", caption: "Collected this morning", tag: "Produce" },
  { src: "/media/raw-milk.jpg", caption: "Chilled and bottled", tag: "Produce", tall: true },
  { src: "/media/farm-sunset.jpg", caption: "End of the day", tag: "Farm" },
  { src: "/media/farm-operations.jpg", caption: "Daily operations", tag: "Farm", wide: true },
  { src: "/media/lashubile.jpg", caption: "In the paddock", tag: "Livestock" },
  { src: "/media/latsambile.jpg", caption: "Grazing time", tag: "Livestock" },
  { src: "/media/milking-parlour.jpg", caption: "Morning milking", tag: "Dairy", wide: true },
  { src: "/media/milk-bottles.jpg", caption: "Bottled at the farm", tag: "Dairy" },
  { src: "/media/emasi-jars.jpg", caption: "Emasi setting in jars", tag: "Dairy", tall: true },
  { src: "/media/calf-pasture.jpg", caption: "The newest calf", tag: "Livestock" },
  { src: "/media/goats-herd.jpg", caption: "The Boer goat flock", tag: "Livestock" },
  { src: "/media/pigs-pen.jpg", caption: "Pigs on pasture", tag: "Livestock", tall: true },
  { src: "/media/vegetable-garden.jpg", caption: "The vegetable garden", tag: "Produce", wide: true },
  { src: "/media/farm-dam-sunrise.jpg", caption: "The dam at sunrise", tag: "Farm", wide: true },
];

const TAGS = ["All", "Farm", "Livestock", "Produce", "Dairy"];

export default function GalleryPage() {
  const [tag, setTag] = useState("All");
  const [active, setActive] = useState<GalleryImage | null>(null);

  const visible = IMAGES.filter((image) => tag === "All" || image.tag === tag);

  return (
    <>
      <section className="page-hero gallery-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">Gallery</span>
          <h1>Life at the farm.</h1>
          <p>A glimpse of the land, the animals and the daily work behind your food.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="filter-scroll gallery-filters" role="tablist" aria-label="Filter gallery">
            {TAGS.map((option) => (
              <button
                key={option}
                type="button"
                className={tag === option ? "active" : ""}
                onClick={() => setTag(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <Reveal>
            <div className="gallery-grid">
              {visible.map((image) => (
                <button
                  key={image.src + image.caption}
                  className={`gallery-item ${image.wide ? "gallery-wide" : ""} ${image.tall ? "gallery-tall" : ""}`}
                  onClick={() => setActive(image)}
                  aria-label={`View ${image.caption}`}
                >
                  <Image src={image.src} alt={image.caption} fill sizes="(max-width: 780px) 100vw, 40vw" />
                  <span className="gallery-shade" />
                  <span className="gallery-caption">
                    <small>{image.tag}</small>
                    <strong>{image.caption}</strong>
                  </span>
                  <span className="gallery-zoom">
                    <ZoomIn size={18} />
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="gallery-disclosure">
              <Camera size={15} /> Photographs taken at The Branch Farm, Mahlabane.
            </div>
          </Reveal>
        </div>
      </section>

      {active && (
        <div className="lightbox" onClick={() => setActive(null)} role="dialog" aria-modal="true">
          <button className="lightbox-close" onClick={() => setActive(null)} aria-label="Close">
            <X size={20} />
          </button>
          <div className="lightbox-image">
            <Image src={active.src} alt={active.caption} fill sizes="90vw" />
            <div>
              <strong>{active.caption}</strong>
              <small>{active.tag}</small>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
