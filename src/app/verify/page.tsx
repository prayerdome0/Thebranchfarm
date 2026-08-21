"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, QrCode, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function VerifyDocumentPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/verify/${encodeURIComponent(normalized)}`);
  };
  return (
    <section className="verify-landing page-shell"><div className="verify-card"><span className="verify-icon"><QrCode size={30} /></span><span className="eyebrow">Official document verification</span><h1>Check a Branch Farm document.</h1><p>Enter the verification code printed beside the QR code on a quotation, invoice, receipt or agreement.</p><form onSubmit={submit}><label className="field"><span>Verification code</span><div className="input-with-icon"><Search size={18} /><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VER-8F4K2A9P" /></div></label><button className="button button-primary button-large button-full">Verify document</button></form><div className="verify-trust"><span><ShieldCheck size={18} /> Compared with the official database record</span><span><BadgeCheck size={18} /> No unnecessary personal information shown</span></div></div></section>
  );
}
