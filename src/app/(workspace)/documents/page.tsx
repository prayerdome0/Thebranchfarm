"use client";

import { CircleAlert, Download, FileText, Image as ImageIcon, Plus, Trash2, Upload, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { useToast } from "@/contexts/ToastContext";
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/constants";
import {
  resolveCloudinaryConfig,
  uploadFarmDocumentToCloudinary,
} from "@/lib/cloudinary";
import { createFarmDocument, deleteFarmDocument, getAnimals, getFarmDocuments } from "@/lib/firebase/data";
import { documentSchema } from "@/lib/validation";
import { cn, documentCategory, formatBytes, formatDate, friendlyError } from "@/lib/utils";
import type { Animal, FarmDocument } from "@/types";

function CategoryIcon({ category, size = 22 }: { category: string; size?: number }) {
  if (category === "image") return <ImageIcon size={size} />;
  if (category === "video") return <Video size={size} />;
  return <FileText size={size} />;
}

export default function DocumentsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const { settings } = useStoreConfig();
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    docType: "general" as "general" | "quotation" | "receipt" | "invoice",
    relatedAnimalId: "",
    relatedOrderId: "",
  });

  const load = () => {
    getFarmDocuments().then((list) => {
      setDocuments(list);
      setLoading(false);
    });
    getAnimals().then(setAnimals);
  };
  useEffect(load, []);

  const visible = useMemo(
    () =>
      typeFilter === "all"
        ? documents
        : documents.filter((doc) => (doc.docType || "general") === typeFilter),
    [documents, typeFilter],
  );

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("The file is larger than 50 MB.");
      return;
    }
    const parsed = documentSchema.safeParse({
      name: form.name || file.name,
      description: form.description,
      docType: form.docType,
      relatedAnimalId: form.relatedAnimalId || undefined,
      relatedOrderId: form.relatedOrderId || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information.");
      return;
    }
    setSaving(true);
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadFarmDocumentToCloudinary(
        file,
        form.docType,
        resolveCloudinaryConfig(settings),
        setProgress,
      );
      await createFarmDocument({
        name: parsed.data.name,
        description: parsed.data.description,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        category: documentCategory(file.name, file.type),
        docType: form.docType,
        downloadUrl: uploaded.url,
        storagePath: `cloudinary:${uploaded.publicId}`,
        cloudinaryPublicId: uploaded.publicId,
        relatedAnimalId: parsed.data.relatedAnimalId,
        relatedOrderId: parsed.data.relatedOrderId,
      });
      showToast("Document uploaded.", "success");
      setFile(null);
      setForm({
        name: "",
        description: "",
        docType: "general",
        relatedAnimalId: "",
        relatedOrderId: "",
      });
      setShowForm(false);
      load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
      setUploading(false);
      setProgress(0);
    }
  };

  const remove = async (doc: FarmDocument) => {
    if (!window.confirm(`Delete "${doc.name}"? The record will be removed.`)) return;
    try {
      await deleteFarmDocument(doc.id);
      showToast("Document deleted.", "success");
      load();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Farm documents</h2>
          <p>
            All farm files, quotations, receipts and invoices upload to Cloudinary with the same
            unsigned <strong>branch_farm</strong> preset.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Upload document
        </button>
      </section>

      <div className="filter-scroll" role="tablist" aria-label="Filter documents by type">
        {[{ value: "all", label: "All" }, ...DOCUMENT_TYPES].map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(typeFilter === option.value && "active")}
            onClick={() => setTypeFilter(option.value)}
          >
            {option.label.replace(" document", "").replace("General farm", "General")}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading documents…" />
      ) : visible.length ? (
        <div className="document-grid">
          {visible.map((doc) => (
            <article className="document-card" key={doc.id}>
              <div className="document-card-top">
                <span className="document-icon">
                  <CategoryIcon category={doc.category} />
                </span>
                <span
                  className={`status-badge status-${doc.category}`}
                  style={
                    doc.docType && doc.docType !== "general"
                      ? { background: "#fdf6e7", color: "#8a6416" }
                      : undefined
                  }
                >
                  {DOCUMENT_TYPE_LABELS[doc.docType || "general"] ||
                    DOCUMENT_CATEGORY_LABELS[doc.category] ||
                    doc.category}
                </span>
              </div>
              {doc.relatedOrderId && (
                <p style={{ fontSize: ".68rem", color: "var(--muted)" }}>Order {doc.relatedOrderId}</p>
              )}
              <h4>{doc.name}</h4>
              <p>{doc.fileName}</p>
              {doc.description && <p style={{ marginTop: 4 }}>{doc.description}</p>}
              <div className="document-card-meta">
                <span>
                  {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
                </span>
                <span>{doc.createdByName || "Team member"}</span>
              </div>
              <div className="document-card-actions">
                <a className="button button-secondary button-small" href={doc.downloadUrl} target="_blank" rel="noreferrer">
                  <Download size={15} /> Open / download
                </a>
                {isAdmin && (
                  <button className="icon-button icon-button-small" onClick={() => remove(doc)} title="Delete document">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload the first farm document — a PDF, image, spreadsheet or video."
          action={
            <button className="button button-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Upload document
            </button>
          }
        />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} aria-label="Close form" />
          <div className="record-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="eyebrow">Farm documents</span>
                <h2>Upload document</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </header>
            <form onSubmit={submit} className="dashboard-stack">
              <label className="field">
                <span>File *</span>
                <span className={cn("button button-secondary file-button", "button-full")}>
                  <Upload size={17} /> {file ? file.name : uploading ? `Uploading ${progress}%` : "Choose file"}
                  <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} disabled={uploading} />
                </span>
                <small>PDF, images, Word, Excel, videos and other farm files up to 50 MB.</small>
              </label>
              <label className="field">
                <span>Document type *</span>
                <select
                  value={form.docType}
                  onChange={(e) => update("docType", e.target.value)}
                  disabled={uploading}
                >
                  {DOCUMENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  Uploaded to Cloudinary with the unsigned <strong>branch_farm</strong> preset.
                </small>
              </label>
              <label className="field">
                <span>Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder={
                    form.docType === "quotation"
                      ? "e.g. Quotation Q-0042 — Green Grocers"
                      : form.docType === "receipt"
                        ? "e.g. Receipt for order TB-7K2M9Q"
                        : form.docType === "invoice"
                          ? "e.g. Invoice INV-2026-011"
                          : "e.g. Cattle vaccination certificate"
                  }
                />
              </label>
              <label className="field">
                <span>Description</span>
                <input value={form.description} onChange={(e) => update("description", e.target.value)} />
              </label>
              <label className="field">
                <span>Related order reference (optional)</span>
                <input
                  value={form.relatedOrderId}
                  onChange={(e) => update("relatedOrderId", e.target.value)}
                  placeholder="e.g. TB-7K2M9Q"
                />
              </label>
              <label className="field">
                <span>Related animal (optional)</span>
                <select value={form.relatedAnimalId} onChange={(e) => update("relatedAnimalId", e.target.value)}>
                  <option value="">None — general farm document</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name || animal.animalId} (#{animal.animalId})
                    </option>
                  ))}
                </select>
              </label>
              {error && (
                <div className="form-alert error">
                  <CircleAlert size={17} /> {error}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="button-spinner" /> {uploading ? `Uploading ${progress}%` : "Saving…"}
                    </>
                  ) : (
                    "Upload document"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
