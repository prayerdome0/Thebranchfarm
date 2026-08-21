import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <Link href="/" className={cn("brand-mark", inverse && "brand-mark-inverse")} aria-label="The Branch Farm home">
      <span className={cn("brand-logo-wrap", compact && "brand-logo-compact")}>
        <Image src="/logo.png" alt="" fill sizes={compact ? "44px" : "56px"} className="brand-logo" priority />
      </span>
      <span className="brand-copy">
        <strong>The Branch Farm</strong>
        <small>Nayi Plug</small>
      </span>
    </Link>
  );
}
