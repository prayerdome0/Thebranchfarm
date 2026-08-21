import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("status-badge", `status-${status}`)}>{STATUS_LABELS[status] || status.replaceAll("-", " ")}</span>;
}
