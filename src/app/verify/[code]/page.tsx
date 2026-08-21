"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, Calendar, CircleAlert, FileText, Search, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Loading } from "@/components/ui/Loading";
import { getVerification } from "@/lib/firebase/data";
import { formatDate, money } from "@/lib/utils";
import type { VerificationRecord } from "@/types";

export default function VerificationResultPage() {
  const params = useParams<{ code?: string }>();
  const raw = (params?.code as string) || "";
  let code = "";
  try {
    code = raw ? decodeURIComponent(raw).toUpperCase() : "";
  } catch {
    code = raw.toUpperCase();
  }
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    getVerification(code).then(setRecord).catch(() => setRecord(null)).finally(() => setLoading(false));
  }, [code]);
  if (loading) return <div className="page-shell"><Loading label="Checking official record…" /></div>;
  if (!record || !record.active) return <section className="verification-result invalid page-shell"><span className="result-seal"><CircleAlert size={31} /></span><span className="eyebrow">Verification unsuccessful</span><h1>Record not verified</h1><p>We could not find an active official document for <strong>{code}</strong>. Recheck the code or contact The Branch Farm.</p><Link href="/verify" className="button button-secondary"><Search size={17} /> Try another code</Link></section>;
  return <section className="verification-result page-shell"><div className="verified-banner"><span><BadgeCheck size={36} /></span><div><small>Verified by the official database</small><h1>Verified — The Branch Farm</h1></div></div><div className="verification-sheet"><div className="verification-code"><span>Verification code</span><strong>{record.code}</strong></div><dl><div><dt><FileText size={17} /> Document</dt><dd>{record.documentType}<strong>{record.documentNumber}</strong></dd></div><div><dt><Calendar size={17} /> Issued</dt><dd>{formatDate(record.issuedAt)}</dd></div><div><dt><UserRound size={17} /> Customer</dt><dd>{record.customerName}</dd></div>{record.orderNumber && <div><dt><FileText size={17} /> Order reference</dt><dd>{record.orderNumber}</dd></div>}<div><dt>Total</dt><dd className="verification-total">{money(record.total)}</dd></div><div><dt>Status</dt><dd><span className="status-badge">{record.status}</span></dd></div></dl><div className="verification-foot"><ShieldCheck size={20} /><p>This page reflects the original database record. Compare these details with the document you received.</p></div></div></section>;
}
