"use client";

import Image from "next/image";
import { Camera, X, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getCollection } from "@/lib/firebase/data";

interface GalleryItem {
  id?: string;
  src: string;
  title: string;
  category: string;
  wide?: boolean;
  tall?: boolean;
  archived?: boolean;
}

const launchGallery: GalleryItem[] = [
  { src: "/media/farm-hero.jpg", title: "A growing farm", category: "Farm", wide: true },
  { src: "/media/raw-milk.jpg", title: "Fresh full-fat milk", category: "Dairy" },
  { src: "/media/cattle.jpg", title: "Livestock care", category: "Animals" },
  { src: "/media/latsambile.jpg", title: "Traditional sour milk", category: "Products" },
  { src: "/media/poultry.jpg", title: "Future poultry", category: "Animals", tall: true },
  { src: "/media/eggs.jpg", title: "Future farm eggs", category: "Products" },
  { src: "/media/farm-operations.jpg", title: "Thoughtful operations", category: "Production", wide: true },
  { src: "/media/lashubile.jpg", title: "Made for sharing", category: "Products" },
  { src: "/media/farm-sunset.jpg", title: "Rooted in Eswatini", category: "Farm" },
];

export default function GalleryPage() {
  const [filter, setFilter] = useState("All");
  const [gallery, setGallery] = useState<GalleryItem[]>(launchGallery);
  const [active, setActive] = useState<GalleryItem | null>(null);

  useEffect(() => {
    getCollection<GalleryItem>("gallery", 100)
      .then((uploaded) => {
        const activeItems = uploaded.filter((item) => !item.archived);
        if (activeItems.length) setGallery(activeItems);
      })
      .catch(() => {});
  }, []);

  const categories = ["All", "Farm", "Animals", "Dairy", "Products", "Production", "Facilities", "Workers"];
  const visible = gallery.filter((item) => filter === "All" || item.category === filter);

  return (
    <>
      <section className="page-hero gallery-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light"><Camera size={15} /> Visual journal</span>
          <h1>A picture of where we are going.</h1>
          <p>Launch illustrations are clearly labelled. Authentic farm media uploaded by an administrator can replace them as the journal grows.</p>
        </div>
      </section>
      <section className="section gallery-section">
        <div className="container">
          <div className="filter-scroll gallery-filters">
            {categories.map((category) => <button className={cn(filter === category && "active")} onClick={() => setFilter(category)} key={category}>{category}</button>)}
          </div>
          <div className="gallery-grid">
            {visible.map((item, index) => (
              <button key={`${item.id || item.title}-${index}`} className={cn("gallery-item", item.wide && "gallery-wide", item.tall && "gallery-tall")} onClick={() => setActive(item)}>
                <Image src={item.src} alt={item.title} fill sizes="(max-width: 600px) 100vw, 33vw" />
                <span className="gallery-shade" />
                <span className="gallery-caption"><small>{item.category}</small><strong>{item.title}</strong></span>
                <span className="gallery-zoom"><ZoomIn size={19} /></span>
              </button>
            ))}
          </div>

        </div>
      </section>
      {active && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <button className="lightbox-close" onClick={() => setActive(null)} aria-label="Close image"><X size={24} /></button>
          <div className="lightbox-image" onClick={(event) => event.stopPropagation()}>
            <Image src={active.src} alt={active.title} fill sizes="90vw" />
            <div><small>{active.category}</small><strong>{active.title}</strong></div>
          </div>
        </div>
      )}
    </>
  );
}
