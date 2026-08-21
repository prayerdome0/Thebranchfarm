"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CircleAlert, CloudUpload, Download, MessageCircle, Plus, Save, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createQuotation, getUserSignature, saveDocumentPdf } from "@/lib/firebase/data";
import { buildBusinessPdfBlob, generateBusinessPdf } from "@/lib/pdf/generate";
import { BUSINESS } from "@/lib/constants";
import { friendlyError, money } from "@/lib/utils";
import { auth } from "@/lib/firebase/config";
import type { BusinessDocument } from "@/types";

interface LineItem { productName: string; description: string; quantity: string; unit: string; price: string; discount: string }

const blankItem = (): LineItem => ({ productName: "", description: "", quantity: "1", unit: "unit", price: "", discount: "0" });

export function CreateQuotationForm() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", address: "", quoteDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<BusinessDocument | null>(null);

  useEffect(() => { if (user?.uid) getUserSignature(user.uid).then((value) => setSignature(value || "")).catch(() => {}); }, [user?.uid]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const discount = items.reduce((sum, item) => sum + (Number(item.discount) || 0) * (Number(item.quantity) || 0), 0);
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  }, [items]);

  const updateItem = (index: number, key: keyof LineItem, value: string) => setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const addItem = () => setItems((current) => [...current, blankItem()]);
  const removeItem = (index: number) => setItems((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));

  const uploadPdf = async (blob: Blob, filename: string) => {
    if (!auth.currentUser) throw new Error("unauthenticated");
    const token = await auth.currentUser.getIdToken();
    const signatureResponse = await fetch("/api/cloudinary/sign", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ folder: "documents", resourceType: "raw" }) });
    const signed = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signed.error || "Could not authorize the upload.");
    const form = new FormData();
    form.append("file", new File([blob], filename, { type: "application/pdf" }));
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);
    form.append("resource_type", "raw");
    const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error("The media service rejected the upload.");
    return result.secure_url as string;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName || !form.phone) { setError("Enter the customer name and phone / WhatsApp number."); return; }
    if (!items.some((item) => item.productName.trim())) { setError("Add at least one product or service to the quotation."); return; }
    if (items.some((item) => item.productName.trim() && (!item.quantity || Number(item.quantity) <= 0 || !item.price))) { setError("Every listed line needs a quantity and a unit price."); return; }
    setSaving(true); setError("");
    try {
      const document = await createQuotation({
        customer: { fullName: form.fullName, phone: form.phone, email: form.email || undefined, address: form.address || undefined },
        quoteDate: form.quoteDate,
        items: items.filter((item) => item.productName.trim()).map((item) => ({ productName: item.productName.trim(), description: item.description.trim() || undefined, quantity: Number(item.quantity), unit: item.unit.trim() || "unit", price: Number(item.price), discount: Number(item.discount || 0) })),
        notes: form.notes.trim() || undefined,
        signature: signature || undefined,
      });
      setCreated(document);
      showToast(`Quotation ${document.documentNumber} created.`, "success");
      // Best-effort: store a PDF copy in Cloudinary for sharing and record keeping.
      setUploadingPdf(true);
      try {
        const blob = await buildBusinessPdfBlob(document);
        const url = await uploadPdf(blob, `${document.documentNumber}.pdf`);
        await saveDocumentPdf(document.id, url);
        setCreated((current) => (current ? { ...current, pdfUrl: url } : current));
      } catch {
        // Cloudinary may not be configured on some previews — the record is still valid.
      } finally {
        setUploadingPdf(false);
      }
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setSaving(false); }
  };

  const download = async () => { if (!created) return; try { await generateBusinessPdf(created); } catch { showToast("PDF generation failed.", "error"); } };
  const share = () => {
    if (!created) return;
    const lines = [`Hello ${BUSINESS.name},`, `Please find quotation ${created.documentNumber}.`, `Customer: ${created.customer.fullName}`, `Total: ${money(created.total)}`, `Verification: ${created.verificationCode}`].join("\n");
    window.open(`https://wa.me/${BUSINESS.whatsappLink}?text=${encodeURIComponent(lines)}`, "_blank");
  };
  const reset = () => { setCreated(null); setForm({ fullName: "", phone: "", email: "", address: "", quoteDate: new Date().toISOString().slice(0, 10), notes: "" }); setItems([blankItem()]); setError(""); };

  if (created) {
    return <div className="dashboard-stack"><section className="dashboard-panel quotation-success"><span className="eyebrow">Quotation ready</span><h2>{created.documentNumber}</h2><p>Created for {created.customer.fullName} · Total {money(created.total)} · Verification {created.verificationCode}</p>{created.pdfUrl && <p className="quotation-stored"><CloudUpload size={15} /> A PDF copy has been stored securely for sharing and record keeping.</p>}{uploadingPdf && <p className="quotation-stored"><i className="mini-loader" /> Preparing the PDF copy…</p>}<div className="quotation-actions"><button className="button button-primary" onClick={download}><Download size={18} /> Download PDF</button><button className="button button-whatsapp" onClick={share}><MessageCircle size={18} /> Share on WhatsApp</button><Link className="button button-secondary" href="/admin/documents"><Share2 size={18} /> Document center</Link></div><button className="button button-ghost" onClick={reset}><Plus size={17} /> Create another quotation</button></section></div>;
  }

  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Create quotation</h2><p>For any customer — including someone buying at the farm gate. No order is required.</p></div></section>
    {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}
    <form onSubmit={submit} className="quotation-form">
      <section className="dashboard-panel"><div className="panel-head"><div><h3>Customer</h3><p>Who is this quotation for?</p></div></div><div className="form-grid"><label className="field"><span>Customer name *</span><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="off" /></label><label className="field"><span>Phone / WhatsApp *</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="+268 …" /></label><label className="field"><span>Email <em>optional</em></span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></label><label className="field"><span>Address / location</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Area, village or meeting point" /></label><label className="field"><span>Quotation date</span><input type="date" value={form.quoteDate} onChange={(e) => setForm({ ...form, quoteDate: e.target.value })} /></label></div></section>
      <section className="dashboard-panel"><div className="panel-head"><div><h3>Products / services</h3><p>Add the lines to quote. Quantity × (unit price − discount) is calculated automatically.</p></div><button type="button" className="button button-secondary" onClick={addItem}><Plus size={16} /> Add line</button></div>
        {items.map((item, index) => <div className="quotation-line" key={index}><div className="form-grid"><label className="field"><span>Product / service *</span><input value={item.productName} onChange={(e) => updateItem(index, "productName", e.target.value)} /></label><label className="field"><span>Description</span><input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} /></label><label className="field"><span>Quantity</span><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} /></label><label className="field"><span>Unit</span><input value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} /></label><label className="field"><span>Unit price (E)</span><input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(index, "price", e.target.value)} /></label><label className="field"><span>Discount (E/unit)</span><input type="number" min="0" step="0.01" value={item.discount} onChange={(e) => updateItem(index, "discount", e.target.value)} /></label></div><div className="quotation-line-foot"><strong>Line total: {money(Math.max(0, (Number(item.price || 0) - Number(item.discount || 0)) * (Number(item.quantity) || 0)))}</strong><button type="button" className="icon-button" onClick={() => removeItem(index)} title="Remove line" disabled={items.length === 1}><Trash2 size={17} /></button></div></div>)}
        <div className="quotation-totals"><p><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></p><p><span>Discount</span><strong>-{money(totals.discount)}</strong></p><div><span>Grand total</span><strong>{money(totals.total)}</strong></div></div>
      </section>
      <section className="dashboard-panel"><div className="panel-head"><div><h3>Notes / terms</h3><p>Validity, delivery or payment notes to appear on the quotation.</p></div></div><label className="field"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Valid for 7 days. Collection at the farm or delivery around Manzini." /></label></section>
      <section className="dashboard-panel quotation-prepared"><div className="prepared-copy"><span className="eyebrow">Prepared by</span><h3>{user?.fullName}</h3>{signature ? <div className="prepared-signature"><Image src={signature} alt="Prepared-by signature" width={200} height={70} /></div> : <p className="prepared-note">No signature uploaded yet. Add one in your profile so it appears on this document.</p>}<p className="prepared-legal">Your name and signature appear on the quotation as the person who prepared it. The customer does not sign.</p></div><Image src="/logo.png" alt="" width={120} height={120} className="quotation-logo" /></section>
      <div className="modal-actions quotation-submit"><button type="button" className="button button-ghost" onClick={() => window.history.back()}><ArrowLeft size={17} /> Back</button><button className="button button-primary" disabled={saving}>{saving ? <><i className="button-spinner" /> Creating…</> : <><Save size={17} /> Save quotation</>}</button></div>
    </form>
  </div>;
}
