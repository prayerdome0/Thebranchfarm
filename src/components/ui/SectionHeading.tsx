import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, align = "left", action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div className={cn("section-heading", align === "center" && "section-heading-center")}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-heading-action">{action}</div>}
    </div>
  );
}
