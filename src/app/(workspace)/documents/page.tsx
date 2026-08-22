"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Trash2, Plus, Upload, Search, X, CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { uploadGenericFileToCloudinary } from "@/lib/cloudinary";
import { createFarmDocument, deleteFarmDocument, getFarmDocuments } from "@/lib/firebase/data";
import { documentSchema } from "@/lib/validation";
import { cn, formatBytes, formatDate, friendlyError, documentCategory } from "@/lib/utils";
import type { FarmDocument } from "@/types";

export default function DocumentsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    docType: "quotation" as string,
    relatedOrderId: "",
    relatedCustomer: "",
    amount: "",
    documentNumber: "",
  });

  const load = () => {
    getFarmDocuments().then((list) => {
      setDocuments(list);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const visible = useMemo(() => {
    const term = search.toLowerCase();
    return documents.filter((d) => {
      const matchesType = typeFilter === "all" || (d.docType || d.type || "general") === typeFilter;
      const matchesSearch = !term || [d.name, d.fileName, d.documentNumber, d.relatedCustomer, d.relatedOrderId, d.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
      return matchesType && matchesSearch;
    });
  }, [documents, typeFilter, search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) { setError("Choose a file"); return; }
    const parsed = documentSchema.safeParse({
      name: form.name || file.name,
      description: form.description,
      docType: form.docType,
      relatedOrderId: form.relatedOrderId || undefined,
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Review info"); return; }
    setSaving(true);
    try {
      const uploaded = await uploadGenericFileToCloudinary(file, form.docType, setProgress);
      await createFarmDocument({
        documentNumber: form.documentNumber || `${form.docType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        name: parsed.data.name,
        description: parsed.data.description,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        category: documentCategory(file.name, file.type),
        docType: form.docType,
        type: form.docType,
        downloadUrl: uploaded.url,
        storagePath: `cloudinary:${uploaded.publicId}`,
        cloudinaryPublicId: uploaded.publicId,
        fileUrl: uploaded.url,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        displayName: uploaded.displayName || file.name,
        recordType: form.docType,
        recordId: form.documentNumber || uploaded.publicId,
        relatedOrderId: form.relatedOrderId || undefined,
        relatedCustomer: form.relatedCustomer || undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        date: new Date().toISOString(),
      });
      showToast("Document uploaded", "success");
      setFile(null);
      setForm({ name: "", description: "", docType: "quotation", relatedOrderId: "", relatedCustomer: "", amount: "", documentNumber: "" });
      setShowForm(false);
      load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  const remove = async (doc: FarmDocument) => {
    if (!confirm(`Delete ${doc.name}?`)) return;
    await deleteFarmDocument(doc.id);
    showToast("Document deleted", "success");
    load();
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Documents</h2>
          <p>Quotations, Invoices, Receipts, Purchase Orders, Delivery Notes, Contracts, Supplier, Customer, Staff, Animal, Other — stored securely by the farm server, no folders.</p>
        </div>
        <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Upload</button>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by document number, customer, order…" />
        </div>
      </div>

      <div className="filter-scroll">
        {[{ value: "all", label: "All" }, ...DOCUMENT_TYPES].map((opt) => (
          <button key={opt.value} type="button" className={cn(typeFilter === opt.value && "active")} onClick={() => setTypeFilter(opt.value)}>{opt.label}</button>
        ))}
      </div>

      {loading ? <Loading label="Loading documents…" /> : visible.length ? (
        <div className="document-grid">
          {visible.map((doc) => (
            <article key={doc.id} className="document-card">
              <div className="document-card-top">
                <span className="document-icon"><FileText size={20} /></span>
                <span className="status-badge">{doc.docType || doc.type || "Document"}</span>
              </div>
              <h4>{doc.documentNumber || doc.name}</h4>
              <p style={{ fontSize: ".7rem" }}>{doc.name}</p>
              {doc.relatedCustomer && <p>Customer: {doc.relatedCustomer}</p>}
              {doc.relatedOrderId && <p>Order: {doc.relatedOrderId}</p>}
              {doc.amount != null && <p>Amount: E{doc.amount}</p>}
              <div className="document-card-meta">
                <span>{formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}</span>
                <span>{doc.createdByName}</span>
              </div>
              <div className="document-card-actions">
                <a className="button button-secondary button-small" href={doc.downloadUrl || doc.fileUrl} target="_blank" rel="noreferrer"><Download size={14} /> View/Download</a>
                {isAdmin && <button className="icon-button icon-button-small" onClick={() => remove(doc)}><Trash2 size={14} /></button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title="No documents" description="Upload quotations, invoices, receipts, etc. Stored securely by the farm server, metadata in Firestore." action={<button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Upload</button>} />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} aria-label="Close" />
          <div className="record-modal small-modal">
            <header><div><span className="eyebrow">Documents</span><h2>Upload Document</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></header>
            <form onSubmit={submit} className="dashboard-stack" style={{ padding: 20 }}>
              <label className="field"><span>File * (stored securely, no folders)</span>
                <span className="button button-secondary file-button button-full"><Upload size={16} /> {file ? file.name : `Choose file ${progress ? progress + "%" : ""}`}<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></span>
              </label>
              <div className="form-grid">
                <label className="field"><span>Document Type *</span>
                  <select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                    {DOCUMENT_TYPES.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </label>
                <label className="field"><span>Document Number</span><input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="e.g. INV-00021" /></label>
              </div>
              <label className="field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Document name" /></label>
              <label className="field"><span>Description</span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <div className="form-grid">
                <label className="field"><span>Related Customer/Supplier</span><input value={form.relatedCustomer} onChange={(e) => setForm({ ...form, relatedCustomer: e.target.value })} placeholder="Customer name" /></label>
                <label className="field"><span>Related Order</span><input value={form.relatedOrderId} onChange={(e) => setForm({ ...form, relatedOrderId: e.target.value })} placeholder="TB-XXXXXX" /></label>
              </div>
              <label className="field"><span>Amount</span><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
              {error && <div className="form-alert error"><CircleAlert size={16} /> {error}</div>}
              <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Uploading…" : "Upload"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
