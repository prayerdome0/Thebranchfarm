"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Download, FileText, GitBranch, Pencil, Plus, Scale, ShieldCheck, Stethoscope, Trash2, X, HeartPulse, Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import { HealthRecordCard } from "@/components/farm/HealthRecordCard";
import { HealthRecordForm, type HealthRecordValues } from "@/components/farm/HealthRecordForm";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ANIMAL_STATUS_LABELS, ANIMAL_TYPE_LABELS, HEALTH_STATUS_LABELS } from "@/lib/constants";
import { addHealthRecord, deleteAnimal, deleteHealthRecord, updateHealthRecord, watchAnimal, watchFarmOperations, watchHealthRecords } from "@/lib/firebase/data";
import { printAnimalRecord } from "@/lib/farmReports";
import { ageFromDateOfBirth, formatDate, formatDisplayDate, friendlyError, money } from "@/lib/utils";
import type { Animal, FarmOperationRecord, HealthRecord } from "@/types";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="detail-item"><small>{label}</small><strong>{value || "—"}</strong></div>;
}

function ShieldAudit({ label, name, date }: { label: string; name?: string; date: string }) {
  return <div><ShieldCheck size={18} /><span><small>{label}</small><strong>{name || "Team member"}</strong><em>{date}</em></span></div>;
}

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const { showToast } = useToast();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [operations, setOperations] = useState<FarmOperationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [editingHealth, setEditingHealth] = useState<HealthRecord | null>(null);
  const [savingHealth, setSavingHealth] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stopAnimal = watchAnimal(id, (value) => { setAnimal(value); setLoading(false); });
    const stopHealth = watchHealthRecords(id, setHealth);
    const stopOperations = watchFarmOperations(null, (records) => {
      setOperations(records.filter((record) => record.animalId === id || record.relatedAnimalIds?.includes(id) || record.values.createdAnimalId === id));
    });
    return () => { stopAnimal(); stopHealth(); stopOperations(); };
  }, [id]);

  const saveHealth = async (values: HealthRecordValues) => {
    setSavingHealth(true);
    try {
      const payload = {
        animalId: values.animalId,
        animalLabel: values.animalLabel,
        type: values.type as HealthRecord["type"],
        problem: values.problem,
        description: values.description,
        observation: values.observation,
        symptoms: values.symptoms,
        reason: values.reason,
        actionTaken: values.actionTaken,
        treatment: values.treatment,
        medication: values.medication,
        vaccineName: values.vaccineName,
        dosage: values.dosage,
        veterinaryVisit: values.veterinaryVisit,
        vetName: values.vetName,
        vetContact: values.vetContact,
        healthStatus: values.healthStatus,
        followUp: values.followUp,
        date: values.date,
        nextDate: values.nextDate,
        notes: values.notes,
        photo: values.photo,
        photoPath: values.photoPath,
        attachments: values.attachments,
      };
      if (editingHealth) {
        const { id: healthId, ...existing } = editingHealth;
        await updateHealthRecord(healthId, { ...existing, ...payload });
      } else {
        await addHealthRecord(payload);
      }
      showToast(editingHealth ? "Health record updated" : "Health record saved", "success");
      setEditingHealth(null);
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
  const weights = operations.filter((record) => record.module === "weight");
  const familyHistory = operations.filter((record) => ["breeding", "birth"].includes(record.module));
  const movements = operations.filter((record) => record.module === "movement");

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
            <button className="button button-primary button-small" onClick={() => printAnimalRecord({ animal, health, operations, generatedBy: user?.fullName })}><Download size={16} /> Export PDF</button>
            <Link className="button button-secondary button-small" href={`/animals/${animal.id}/edit`}><Pencil size={16} /> Edit</Link>
            <button className="button button-secondary button-small" onClick={() => { setEditingHealth(null); setShowHealthForm(true); }}><Stethoscope size={16} /> Add health</button>
            <Link className="button button-secondary button-small" href={`/weights?animal=${animal.id}`}><Scale size={16} /> Record weight</Link>
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
          <DetailItem label="Date born" value={animal.dateOfBirth ? `${formatDisplayDate(animal.dateOfBirth)}${age ? ` (${age})` : ""}` : "—"} />
          <DetailItem label="Estimated age" value={animal.estimatedAge} />
          <DetailItem label="Colour" value={animal.colour} />
          <DetailItem label="Identifying features" value={animal.identifyingFeatures} />
          <DetailItem label="Current weight" value={animal.weight != null ? `${animal.weight} kg` : "—"} />
          <DetailItem label="Current status" value={statusLabel} />
          <DetailItem label="Health status" value={conditionLabel} />
        </div>
      </section>

      {/* Photos and supporting documents */}
      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem" }}>Photos & Documents</h2>
        {animal.photo ? <img src={animal.photo} alt={animal.animalId} style={{ maxWidth: 300, borderRadius: 12, marginTop: 12 }} /> : <p style={{ marginTop: 8, fontSize: ".8rem" }}>No animal photo uploaded yet.</p>}
        {animal.documents?.length ? <div className="health-supporting-files" style={{ marginTop: 12 }}>{animal.documents.map((document, index) => <a href={document.url} target="_blank" rel="noreferrer" key={`${document.publicId}-${index}`}><FileText size={13} /> {document.name}</a>)}</div> : <p style={{ marginTop: 8, fontSize: ".65rem" }}>No supporting documents attached to this animal profile.</p>}
      </section>

      {/* Acquisition */}
      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem", marginBottom: 12 }}>Acquisition</h2>
        <div className="detail-grid">
          <DetailItem label="Registration type" value={animal.registrationType?.replace(/-/g, " ")} />
          <DetailItem label="Date acquired" value={formatDisplayDate(animal.acquisitionDate || animal.datePurchased)} />
          <DetailItem label="Purchase price" value={money(animal.purchasePrice)} />
          <DetailItem label="Seller / source" value={animal.supplier} />
          <DetailItem label="Seller contact" value={animal.sellerContact} />
          <DetailItem label="Purchased by / for" value={animal.purchasedFor} />
          <DetailItem label="Transport information" value={animal.transportInformation} />
          <DetailItem label="Current location" value={animal.location} />
        </div>
      </section>

      {/* Status & Notes */}
      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem", marginBottom: 12 }}>Status & Notes</h2>
        <p style={{ fontSize: ".85rem" }}><strong>Status:</strong> {statusLabel} · <strong>Health:</strong> {conditionLabel}{animal.statusDate ? ` · Effective ${formatDisplayDate(animal.statusDate)}` : ""}</p>
        {animal.statusReason && <p style={{ marginTop: 10, fontSize: ".78rem" }}><strong>Status reason:</strong> {animal.statusReason}</p>}
        {animal.notes && <p style={{ marginTop: 12, fontSize: ".85rem", background: "#f8faf7", padding: 12, borderRadius: 8 }}>{animal.notes}</p>}
      </section>

      {/* Weight history */}
      <section className="dashboard-panel animal-history-panel">
        <div className="section-row"><div><h2>Weight History</h2><p>Every recorded weigh-in and growth observation.</p></div><Link className="button button-secondary button-small" href={`/weights?animal=${animal.id}`}><Scale size={15} /> Record weight</Link></div>
        {weights.length ? <div className="animal-history-timeline">{weights.map((record) => <article key={record.id}><span><Scale size={16} /></span><div><small>{formatDisplayDate(record.date)} · {record.reference}</small><strong>{record.values.currentWeight != null ? `${record.values.currentWeight} kg` : "Weight recorded"}</strong><p>{record.values.previousWeight != null ? `Previous: ${record.values.previousWeight} kg · ` : ""}{String(record.values.growthNotes || record.values.bodyCondition || "No growth note")}</p></div><em>{record.createdByName}</em></article>)}</div> : <div className="animal-history-empty"><Scale size={22} /><p>No weight history yet. The current profile weight is {animal.weight != null ? `${animal.weight} kg` : "not set"}.</p></div>}
      </section>

      {/* Breeding, parent and offspring links */}
      <section className="dashboard-panel animal-history-panel">
        <div className="section-row"><div><h2>Breeding & Family</h2><p>Parent links, pregnancy records, births and offspring.</p></div><Link className="button button-secondary button-small" href={`/breeding?animal=${animal.id}`}><GitBranch size={15} /> Add breeding record</Link></div>
        <div className="detail-grid animal-family-links" style={{ marginTop: 16 }}>
          <DetailItem label="Mother record" value={animal.motherId ? <Link href={`/animals/${animal.motherId}`}>Open mother profile</Link> : "—"} />
          <DetailItem label="Father record" value={animal.fatherId ? <Link href={`/animals/${animal.fatherId}`}>Open father profile</Link> : "—"} />
          <DetailItem label="Linked offspring" value={animal.offspringIds?.length ? <span className="offspring-links">{animal.offspringIds.map((offspringId, index) => <Link key={offspringId} href={`/animals/${offspringId}`}>Offspring {index + 1}</Link>)}</span> : "—"} />
        </div>
        {familyHistory.length ? <div className="animal-history-timeline">{familyHistory.map((record) => <article key={record.id}><span><GitBranch size={16} /></span><div><small>{formatDisplayDate(record.date)} · {record.reference}</small><strong>{record.title}</strong><p>{record.summary || record.status}</p></div><em>{record.createdByName}</em></article>)}</div> : null}
      </section>

      {/* Sales and transfer history */}
      <section className="dashboard-panel animal-history-panel">
        <div className="section-row"><div><h2>Sales & Transfer History</h2><p>The animal remains in the register when its status changes.</p></div><Link className="button button-secondary button-small" href={`/movements?animal=${animal.id}`}><Repeat2 size={15} /> Record movement</Link></div>
        {movements.length ? <div className="animal-history-timeline">{movements.map((record) => <article key={record.id}><span><Repeat2 size={16} /></span><div><small>{formatDisplayDate(record.date)} · {record.reference}</small><strong>{record.status.replace(/-/g, " ")}</strong><p>{record.summary || String(record.values.reason || "")}</p></div><em>{record.createdByName}</em></article>)}</div> : <div className="animal-history-empty"><Repeat2 size={22} /><p>No sales or transfers recorded.</p></div>}
      </section>

      {/* Health Records inside animal */}
      <section className="dashboard-panel">
        <div className="section-row">
          <div><h2>Health Records</h2><p>Animal → Health Records. Date, Type, Description, Treatment, Notes, Attachment. Simple.</p></div>
          <button className="button button-secondary button-small" onClick={() => { setEditingHealth(null); setShowHealthForm(true); }}><Plus size={16} /> Add</button>
        </div>
        <div className="health-record-list" style={{ marginTop: 18 }}>
          {health.length ? health.map((record) => (
            <ErrorBoundary key={record.id} label="This health record could not be displayed.">
              <HealthRecordCard record={record} canDelete={isAdmin} onDelete={removeHealth} onEdit={(entry) => { setEditingHealth(entry); setShowHealthForm(true); }} />
            </ErrorBoundary>
          )) : (
            <div className="empty-state compact"><span className="empty-icon"><HeartPulse size={25} /></span><h3>No health records</h3><p>Health records belong inside animal record. Add first.</p></div>
          )}
        </div>
      </section>

      <section className="animal-record-audit">
        <ShieldAudit label="Recorded by" name={animal.createdByName} date={formatDate(animal.createdAt, true)} />
        <ShieldAudit label="Last updated by" name={animal.updatedByName || animal.createdByName} date={formatDate(animal.updatedAt, true)} />
      </section>

      {showHealthForm && animal && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => { setShowHealthForm(false); setEditingHealth(null); }} />
          <div className="record-modal">
            <header><div><span className="eyebrow">Animal Health</span><h2>{editingHealth ? "Edit Health Record" : "Add Health Record"}</h2></div><button className="icon-button" onClick={() => { setShowHealthForm(false); setEditingHealth(null); }}><X size={20} /></button></header>
            <ErrorBoundary label="The health record form could not be opened. Refresh and try again.">
              <HealthRecordForm animals={[animal]} lockedAnimalId={animal.id} defaults={editingHealth || undefined} onSubmit={saveHealth} saving={savingHealth} onCancel={() => { setShowHealthForm(false); setEditingHealth(null); }} />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}
