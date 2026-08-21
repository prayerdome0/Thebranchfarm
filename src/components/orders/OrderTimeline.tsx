import { Check, PackageCheck } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const visible: OrderStatus[] = ["pending", "confirmed", "preparing", "out-for-delivery", "delivered"];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") return <div className="cancelled-order">This order was cancelled. Contact the farm if you need help.</div>;
  const normalized = status === "ready" ? "preparing" : status === "completed" ? "delivered" : status;
  const current = visible.indexOf(normalized);
  return (
    <ol className="order-timeline">
      {visible.map((item, index) => {
        const complete = index <= current;
        return (
          <li key={item} className={cn(complete && "complete", index === current && "current")}>
            <span>{complete ? <Check size={16} /> : <PackageCheck size={16} />}</span>
            <div><strong>{STATUS_LABELS[item]}</strong>{index === current && <small>Current status</small>}</div>
          </li>
        );
      })}
    </ol>
  );
}
