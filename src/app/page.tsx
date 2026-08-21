"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Leaf } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { BUSINESS } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && (user.role === "staff" || user.role === "admin")) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const canEnter = Boolean(user && (user.role === "staff" || user.role === "admin"));

  return (
    <div className="landing">
      <div className="landing-visual">
        <Image src="/media/farm-hero.jpg" alt="The Branch Farm at Mahlabane" fill priority sizes="100vw" />
        <div className="landing-shade" />
      </div>
      <div className="landing-card">
        <BrandMark />
        <span className="eyebrow">Farm management</span>
        <h1>Every animal, every record, in one place.</h1>
        <p>
          Livestock records, animal health, staff, farm documents and daily activity — kept
          together and traced back to the person who recorded them.
        </p>
        <div className="landing-actions">
          {canEnter ? (
            <Link className="button button-primary button-large" href="/dashboard">
              Open dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link className="button button-primary button-large" href="/login">
                Sign in
              </Link>
              <Link className="button button-secondary button-large" href="/register">
                Request staff access
              </Link>
            </>
          )}
        </div>
        <span className="landing-note">
          <Leaf size={15} /> {BUSINESS.name} · {BUSINESS.slogan}
        </span>
      </div>
    </div>
  );
}
