import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Film } from "lucide-react";
import { FarmVideoCard } from "@/components/media/FarmVideoCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FARM_VIDEOS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Farm Films",
  description: "Films about dairy, livestock and The Branch Farm's growing product range.",
};

export default function VideosPage() {
  return (
    <>
      <section className="page-hero videos-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light"><Film size={15} /> Farm films</span>
          <h1>See the care behind the range.</h1>
          <p>Explore short films about dairy, livestock and the products we are preparing for tomorrow.</p>
        </div>
      </section>
      <section className="section videos-section">
        <div className="container">
          <SectionHeading
            eyebrow="Watch and explore"
            title="A visual journal in motion."
            description="Choose a film, press play and learn more about the work and future products that shape our farm story."
            action={<Link href="/gallery" className="button button-secondary">View image gallery <ArrowRight size={17} /></Link>}
          />
          <div className="farm-video-grid">
            {FARM_VIDEOS.map((video) => <FarmVideoCard key={video.id} video={video} />)}
          </div>
        </div>
      </section>
    </>
  );
}
