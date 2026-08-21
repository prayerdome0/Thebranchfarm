import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="auth-page">
      <div className="auth-visual">
        <Image src="/media/farm-hero.jpg" alt="The Branch Farm at Mahlabane" fill priority sizes="(max-width: 900px) 0vw, 48vw" />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content"><BrandMark inverse /><div className="auth-quote"><Leaf size={23} /><blockquote>“Fresh food, honest service and a farm built to grow responsibly.”</blockquote><span>The Branch Farm · Nayi Plug</span></div></div>
      </div>
      <div className="auth-form-side"><div className="auth-form-wrap"><Link className="auth-back" href="/"><ArrowLeft size={17} /> Back to website</Link><div className="auth-mobile-brand"><BrandMark compact /></div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p className="auth-description">{description}</p>{children}</div></div>
    </section>
  );
}
