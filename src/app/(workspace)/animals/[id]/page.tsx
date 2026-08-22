"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Plus, Stethoscope, Trash2, X, HeartPulse, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { HealthRecordCard } from "@/components/farm/HealthRecordCard";
import { HealthRecordForm, type HealthRecordValues } from "@/components/farm/HealthRecordForm";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ANIMAL_STATUS_LABELS, ANIMAL_TYPE_LABELS, HEALTH_STATUS_LABELS } from "@/lib/constants";
import { addHealthRecord, deleteAnimal, deleteHealthRecord, watchAnimal, watchHealthRecords } from "@/lib/firebase/data";
import { ageFromDateOfBirth, formatDate, formatDisplayDate, friendlyError, money } from "@/lib/utils";
import type { Animal, HealthRecord } from "@/types";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="detail-item"><small>{label}</small><strong>{value || "—"}</strong></div>;
}

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stopAnimal = watchAnimal(id, (value) => { setAnimal(value); setLoading(false); });
    const stopHealth = watchHealthRecords(id, setHealth);
    return () => { stopAnimal(); stopHealth(); };
  }, [id]);

  const saveHealth = async (values: HealthRecordValues) => {
    setSavingHealth(true);
    try {
      await addHealthRecord({
        animalId: values.animalId,
        animalLabel: values.animalLabel,
        type: values.type as HealthRecord["type"],
        problem: values.problem,
        observation: values.observation,
        actionTaken: values.actionTaken,
        medication: values.medication,
        date: values.date,
        nextDate: values.nextDate,
        notes: values.notes,
        photo: values.photo,
        photoPath: values.photoPath,
      });
      showToast("Health record saved", "success");
      setShowHealthForm(false);
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    } finally {
      setSavingHealth(false);
    }
  };

  const removeHealth = async (record: HealthRecord) => {
    if (!confirm("Delete this health record?")) return;
    await deleteHealthRecord(record.id);
    showToast("Health record deleted", "success");
  };

  const removeAnimal = async () => {
    if (!confirm("Delete this animal and its health history?")) return;
    setDeleting(true);
    try {
      await deleteAnimal(id);
      showToast("Animal deleted", "success");
      router.replace("/animals");
    } catch (cause) {
      showToast(friendlyError(cause), "error");
      setDeleting(false);
    }
  };

  if (loading) return <Loading label="Loading animal…" />;
  if (!animal) return (
    <div className="access-state page-shell">
      <span><X size={28} /></span>
      <h1>Animal not found</h1>
      <Link className="button button-primary" href="/animals">Back to animals</Link>
    </div>
  );

  const typeLabel = ANIMAL_TYPE_LABELS[animal.animalType] || animal.animalType;
  const statusLabel = ANIMAL_STATUS_LABELS[animal.status] || animal.status;
  const conditionLabel = HEALTH_STATUS_LABELS[animal.healthStatus] || animal.healthStatus;
  const age = ageFromDateOfBirth(animal.dateOfBirth);

  return (
    <div className="dashboard-stack">
      <nav className="breadcrumb"><span><Link href="/animals">Animals</Link></span><span aria-current="page">{typeLabel} #{animal.animalId}</span></nav>

      <section className="animal-detail-hero">
        <div className="animal-detail-photo">
          {animal.photo ? <img src={animal.photo} alt={animal.name || animal.animalId} /> : <span className="placeholder">No photo — upload in edit</span>}
        </div>
        <div className="animal-detail-head">
          <div>
            <span className="kicker">{typeLabel} · #{animal.animalId} {animal.tagNumber ? `· Tag ${animal.tagNumber}` : ""}</span>
            <h1>{animal.name || `${typeLabel} ${animal.animalId}`}</h1>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={`status-badge status-${animal.status}`}>{statusLabel}</span>
              <span className={`status-badge status-${animal.healthStatus}`}>{conditionLabel}</span>
            </div>
          </div>
          <div className="animal-detail-actions">
            <Link className="button button-secondary button-small" href={`/animals/${animal.id}/edit`}><Pencil size={16} /> Edit</Link>
            <button className="button button-primary button-small" onClick={() => setShowHealthForm(true)}><Stethoscope size={16} /> Add Health Record</button>
            {isAdmin && <button className="button button-ghost button-small" onClick={removeAnimal} disabled={deleting}><Trash2 size={16} /> {deleting ? "Deleting…" : "Delete"}</button>}
          </div>
        </div>
      </section>

      {/* Basic Details */}
      <section className="dashboard-panel">
        <div className="section-row" style={{ marginBottom: 18 }}><div><h2>Basic Details</h2><p>Animal ID, Type, Name/Tag, Breed, Sex, Date Born, Photo</p></div></div>
        <div className="detail-grid">
          <DetailItem label="Animal ID" value={animal.animalId} />
          <DetailItem label="Type" value={typeLabel} />
          <DetailItem label="Name / Tag" value={animal.name || animal.tagNumber || "—"} />
          <DetailItem label="Breed" value={animal.breed} />
          <DetailItem label="Sex" value={animal.sex} />
          <DetailItem label="Date Born" value={animal.dateOfBirth ? `${formatDisplayDate(animal.dateOfBirth)}${age ? ` (${age})` : ""}` : "—"} />
          <DetailItem label="Current Status" value={statusLabel} />
          <DetailItem label="Health Status" value={conditionLabel} />
        </div>
      </section>

      {/* Photos */}
      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem" }}>Photos</h2>
        {animal.photo ? <img src={animal.photo} alt={animal.animalId} style={{ maxWidth: 300, borderRadius: 12, marginTop: 12 }} /> : <p style={{ marginTop: 8, fontSize: ".8rem" }}>No photo uploaded. Upload via Cloudinary (no folders) — fileUrl + publicId stored.</p>}
      </section>

      {/* Acquisition */}
      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem", marginBottom: 12 }}>Acquisition</h2>
        <div className="detail-grid">
          <DetailItem label="Date Acquired" value={formatDisplayDate(animal.datePurchased)} />
          <DetailItem label="Purchase Price" value={money(animal.purchasePrice)} />
          <DetailItem label="Supplier" value={animal.supplier} />
          <DetailItem label="Location" value={animal.location} />
          <DetailItem label="Weight" value={animal.weight != null ? `${animal.weight} kg` : "—"} />
          <DetailItem label="Recorded by" value={`${animal.createdByName} · ${formatDate(animal.createdAt, true)}`} />
        </div>
      </section>

      {/* Status & Notes */}
      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem", marginBottom: 12 }}>Status & Notes</h2>
        <p style={{ fontSize: ".85rem" }}><strong>Status:</strong> {statusLabel} · <strong>Health:</strong> {conditionLabel}</p>
        {animal.notes && <p style={{ marginTop: 12, fontSize: ".85rem", background: "#f8faf7", padding: 12, borderRadius: 8 }}>{animal.notes}</p>}
      </section>

      {/* Health Records inside animal */}
      <section className="dashboard-panel">
        <div className="section-row">
          <div><h2>Health Records</h2><p>Animal → Health Records. Date, Type, Description, Treatment, Notes, Attachment. Simple.</p></div>
          <button className="button button-secondary button-small" onClick={() => setShowHealthForm(true)}><Plus size={16} /> Add</button>
        </div>
        <div className="health-record-list" style={{ marginTop: 18 }}>
          {health.length ? health.map((record) => (
            <HealthRecordCard key={record.id} record={record} canDelete={isAdmin} onDelete={removeHealth} />
          )) : (
            <div className="empty-state compact"><span className="empty-icon"><HeartPulse size={25} /></span><h3>No health records</h3><p>Health records belong inside animal record. Add first.</p></div>
          )}
        </div>
      </section>

      {showHealthForm && animal && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowHealthForm(false)} />
          <div className="record-modal">
            <header><div><span className="eyebrow">Animal Health</span><h2>Add Health Record</h2></div><button className="icon-button" onClick={() => setShowHealthForm(false)}><X size={20} /></button></header>
            <HealthRecordForm animals={[animal]} lockedAnimalId={animal.id} onSubmit={saveHealth} saving={savingHealth} onCancel={() => setShowHealthForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
