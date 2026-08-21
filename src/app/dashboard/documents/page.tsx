"use client";

import Link from "next/link";
import { Download, FileCheck2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { getMyDocuments } from "@/lib/firebase/data";
import { generateBusinessPdf } from "@/lib/pdf/generate";
import { formatDate, money } from "@/lib/utils";
import type { BusinessDocument } from "@/types";

export default function CustomerDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  useEffect(() => { if (user) getMyDocuments(user.uid).then(setDocuments).catch(() => setDocuments([])).finally(() => setLoading(false)); }, [user]);
  const download = async (document: BusinessDocument) => { setDownloading(document.id); try { await generateBusinessPdf(document); } finally { setDownloading(""); } };
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Documents</h2><p>Your official quotations, invoices, receipts and agreements.</p></div></section><section className="dashboard-panel">{loading ? <Loading label="Loading secure documents…" /> : !documents.length ? <EmptyState icon={FileCheck2} title="No documents yet" description="Official documents linked to your account will appear here." /> : <div className="document-list">{documents.map((document) => <article key={document.id}><span className="document-type-icon"><FileCheck2 size={22} /></span><div><small>{document.type}</small><strong>{document.documentNumber}</strong><p>{formatDate(document.createdAt)} · {money(document.total)}</p></div><span className="document-status">{document.status}</span><Link href={`/verify/${document.verificationCode}`} title="Verify document"><QrCode size={19} /></Link><button className="icon-button" onClick={() => download(document)} disabled={downloading === document.id} title="Download PDF">{downloading === document.id ? <i className="mini-loader" /> : <Download size={19} />}</button></article>)}</div>}</section><p className="dashboard-footnote"><QrCode size={16} /> Every official document can be compared with its public verification record.</p></div>;
}
