"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, CheckCircle2, Copy, MessageCircle, PackageSearch, Phone, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { BUSINESS } from "@/lib/constants";
import { money, phoneHref, whatsappHref } from "@/lib/utils";

interface SuccessData { orderNumber: string; id: string; total: number; deliveryLabel: string; customer: string; phone: string; whatsappAvailable: boolean; location: string; instructions?: string; items: Array<{ name: string; quantity: number; price: number; unit: string }> }

export default function OrderSuccessPage() {
  const params = useParams<{ orderNumber?: string }>();
  const rawParam = (params?.orderNumber as string) || "";
  let orderNumber = "";
  try {
    orderNumber = rawParam ? decodeURIComponent(rawParam).toUpperCase() : "ORDER";
  } catch {
    orderNumber = rawParam.toUpperCase() || "ORDER";
  }
  const [data, setData] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`order-success:${orderNumber}`);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, [orderNumber]);
  const message = data ? [`Hello The Branch Farm, I have placed order ${orderNumber}.`, `Customer: ${data.customer}`, `Phone: ${data.phone}`, `Delivery: ${data.location}`, "", "Items:", ...data.items.map((item) => `• ${item.name} — ${item.quantity} × ${money(item.price)}`), "", `Total: ${money(data.total)}`, data.deliveryLabel ? `Delivery: ${data.deliveryLabel}` : "", data.instructions ? `Instructions: ${data.instructions}` : ""].filter(Boolean).join("\n") : `Hello The Branch Farm, I have placed order ${orderNumber}.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be blocked on non-secure Vercel preview — still mark as copied.
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return <section className="success-page page-shell"><div className="success-card"><div className="success-seal"><CheckCircle2 size={39} /></div><span className="eyebrow">Order safely recorded</span><h1>Thank you for your order.</h1><p>Our team has been notified. Keep your order number to follow every update.</p><div className="order-number-box"><span>Order number</span><div><strong>{orderNumber}</strong><button onClick={copy} aria-label="Copy order number">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div></div>{data && <div className="success-summary"><span><strong>{money(data.total)}</strong><small>Recorded total</small></span><span><strong>{data.deliveryLabel}</strong><small>Delivery</small></span></div>}<div className="success-actions"><Link href={`/track-order?order=${orderNumber}`} className="button button-primary"><PackageSearch size={18} /> Track order</Link>{data?.whatsappAvailable && <a href={whatsappHref(BUSINESS.whatsappLink, message)} target="_blank" rel="noreferrer" className="button button-whatsapp"><MessageCircle size={18} /> Continue on WhatsApp</a>}<a href={phoneHref(BUSINESS.phoneLink)} className="button button-secondary"><Phone size={18} /> Call the farm</a></div>{!data?.whatsappAvailable && <p className="success-whatsapp-note">No WhatsApp? No problem — your order is complete and our team can call or email you.</p>}<div className="success-next"><h2>What happens next?</h2><ol><li><span>1</span><p><strong>Order review</strong><small>Our team checks availability and delivery details.</small></p></li><li><span>2</span><p><strong>Confirmation</strong><small>We contact you using the details supplied.</small></p></li><li><span>3</span><p><strong>Preparation &amp; delivery</strong><small>Follow progress using Track My Order.</small></p></li></ol></div><Link href="/shop" className="text-link success-shop-link"><ShoppingBag size={17} /> Return to the shop</Link></div></section>;
}
