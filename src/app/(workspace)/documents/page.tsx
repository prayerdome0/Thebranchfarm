"use client";

import { CircleAlert, Download, FileText, Image as ImageIcon, Plus, Trash2, Upload, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/constants";
import { createFarmDocument, deleteFarmDocument, getAnimals, getFarmDocuments } from "@/lib/firebase/data";
import { uploadFarmDocument } from "@/lib/firebase/storage";
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
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", description: "", relatedAnimalId: "" });

  const load = () => {
    getFarmDocuments().then((list) => {
      setDocuments(list);
      setLoading(false);
    });
    getAnimals().then(setAnimals);
  };
  useEffect(load, []);

  const visible = useMemo(() => documents, [documents]);

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
      relatedAnimalId: form.relatedAnimalId || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information.");
      return;
    }
    setSaving(true);
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadFarmDocument(file, setProgress);
      await createFarmDocument({
        name: parsed.data.name,
        description: parsed.data.description,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        category: documentCategory(file.name, file.type),
        downloadUrl: uploaded.downloadUrl,
        storagePath: uploaded.storagePath,
        relatedAnimalId: parsed.data.relatedAnimalId,
      });
      showToast("Document uploaded.", "success");
      setFile(null);
      setForm({ name: "", description: "", relatedAnimalId: "" });
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
    if (!window.confirm(`Delete "${doc.name}"? The file will be removed from Firebase Storage.`)) return;
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
          <p>PDFs, images, Word and Excel files, videos and other farm files — stored in Firebase Storage.</p>
        </div>
        <button className="button button-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Upload document
        </button>
      </section>

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
                <span className={`status-badge status-${doc.category}`}>
                  {DOCUMENT_CATEGORY_LABELS[doc.category] || doc.category}
                </span>
              </div>
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
                <span>Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Cattle vaccination certificate"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <input value={form.description} onChange={(e) => update("description", e.target.value)} />
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
