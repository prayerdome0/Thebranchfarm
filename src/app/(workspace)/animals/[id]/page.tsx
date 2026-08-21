"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowLeft,
  FileText,
  HeartPulse,
  Pencil,
  Plus,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { HealthRecordCard } from "@/components/farm/HealthRecordCard";
import { HealthRecordForm, type HealthRecordValues } from "@/components/farm/HealthRecordForm";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ANIMAL_STATUS_LABELS, ANIMAL_TYPE_LABELS, HEALTH_STATUS_LABELS } from "@/lib/constants";
import {
  addHealthRecord,
  deleteAnimal,
  deleteHealthRecord,
  getActivities,
  getFarmDocuments,
  watchAnimal,
  watchHealthRecords,
} from "@/lib/firebase/data";
import {
  ageFromDateOfBirth,
  formatDate,
  formatDisplayDate,
  friendlyError,
  money,
} from "@/lib/utils";
import type { ActivityRecord, Animal, FarmDocument, HealthRecord } from "@/types";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-item">
      <small>{label}</small>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const stopAnimal = watchAnimal(id, (value) => {
      setAnimal(value);
      setLoading(false);
    });
    const stopHealth = watchHealthRecords(id, setHealth);
    getActivities().then((list) =>
      setActivities(list.filter((record) => record.animalId === id)),
    );
    getFarmDocuments().then((list) =>
      setDocuments(list.filter((doc) => doc.relatedAnimalId === id)),
    );
    return () => {
      stopAnimal();
      stopHealth();
    };
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
      showToast("Health record saved.", "success");
      setShowHealthForm(false);
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    } finally {
      setSavingHealth(false);
    }
  };

  const removeHealth = async (record: HealthRecord) => {
    if (!window.confirm("Delete this health record? This cannot be undone.")) return;
    try {
      await deleteHealthRecord(record.id);
      showToast("Health record deleted.", "success");
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  const removeAnimal = async () => {
    if (!window.confirm("Delete this animal and its health history? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteAnimal(id);
      showToast("Animal deleted.", "success");
      router.replace("/animals");
    } catch (cause) {
      showToast(friendlyError(cause), "error");
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loading label="Loading animal…" />;
  }

  if (!animal) {
    return (
      <div className="access-state page-shell">
        <span><X size={28} /></span>
        <h1>Animal not found</h1>
        <p>This record may have been removed.</p>
        <Link className="button button-primary" href="/animals">
          Back to animals
        </Link>
      </div>
    );
  }

  const typeLabel = ANIMAL_TYPE_LABELS[animal.animalType] || animal.animalType;
  const statusLabel = ANIMAL_STATUS_LABELS[animal.status] || animal.status;
  const conditionLabel = HEALTH_STATUS_LABELS[animal.healthStatus] || animal.healthStatus;
  const age = ageFromDateOfBirth(animal.dateOfBirth);

  return (
    <div className="dashboard-stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span>
          <Link href="/animals">Animals</Link>
        </span>
        <span aria-current="page">
          {typeLabel} #{animal.animalId}
        </span>
      </nav>

      <section className="animal-detail-hero">
        <div className="animal-detail-photo">
          {animal.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={animal.photo} alt={`${animal.name || animal.animalId} photo`} />
          ) : (
            <span className="placeholder">No photo uploaded</span>
          )}
        </div>
        <div className="animal-detail-head">
          <div>
            <span className="kicker">
              {typeLabel} · #{animal.animalId}
              {animal.tagNumber ? ` · Tag ${animal.tagNumber}` : ""}
            </span>
            <h1>{animal.name || `${typeLabel} ${animal.animalId}`}</h1>
            {animal.name && <span className="name">{typeLabel} #{animal.animalId}</span>}
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={`status-badge status-${animal.status}`}>{statusLabel}</span>
              <span className={`status-badge status-${animal.healthStatus}`}>{conditionLabel}</span>
            </div>
          </div>
          <div className="animal-detail-actions">
            <Link className="button button-secondary button-small" href={`/animals/${animal.id}/edit`}>
              <Pencil size={16} /> Edit
            </Link>
            <button className="button button-primary button-small" onClick={() => setShowHealthForm(true)}>
              <Stethoscope size={16} /> Add health record
            </button>
            {isAdmin && (
              <button className="button button-ghost button-small" onClick={removeAnimal} disabled={deleting}>
                <Trash2 size={16} /> {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="section-row" style={{ marginBottom: 18 }}>
          <div>
            <h2>Basic information</h2>
            <p>Recorded by {animal.createdByName || "Team member"} · {formatDate(animal.createdAt, true)}</p>
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label="Animal ID / tag" value={`#${animal.animalId}${animal.tagNumber ? ` · ${animal.tagNumber}` : ""}`} />
          <DetailItem label="Name" value={animal.name} />
          <DetailItem label="Type" value={typeLabel} />
          <DetailItem label="Breed" value={animal.breed} />
          <DetailItem label="Sex" value={animal.sex} />
          <DetailItem label="Date of birth" value={animal.dateOfBirth ? `${formatDisplayDate(animal.dateOfBirth)}${age ? ` (${age})` : ""}` : undefined} />
          <DetailItem label="Date purchased" value={formatDisplayDate(animal.datePurchased)} />
          <DetailItem label="Purchase price" value={money(animal.purchasePrice)} />
          <DetailItem label="Supplier / source" value={animal.supplier} />
          <DetailItem label="Current location" value={animal.location} />
          <DetailItem label="Weight" value={animal.weight != null ? `${animal.weight} kg` : undefined} />
          <DetailItem label="Status" value={statusLabel} />
          <DetailItem label="Current condition" value={conditionLabel} />
        </div>
        {animal.notes && (
          <p style={{ marginTop: 16, fontSize: ".78rem" }}>
            <strong style={{ color: "var(--ink)" }}>Notes:</strong> {animal.notes}
          </p>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="section-row">
          <div>
            <h2>Health</h2>
            <p>Problems, observations, vaccinations and treatments — a complete history.</p>
          </div>
          <button className="button button-secondary button-small" onClick={() => setShowHealthForm(true)}>
            <Plus size={16} /> Add health record
          </button>
        </div>

        <div className="health-record-list" style={{ marginTop: 18 }}>
          {health.length ? (
            health.map((record) => (
              <HealthRecordCard
                key={record.id}
                record={record}
                canDelete={isAdmin}
                onDelete={removeHealth}
              />
            ))
          ) : (
            <div className="empty-state compact">
              <span className="empty-icon"><HeartPulse size={25} /></span>
              <h3>No health records yet</h3>
              <p>
                If this animal shows a problem, add a health record with the observation, action
                taken and date.
              </p>
            </div>
          )}
        </div>
      </section>

      {documents.length > 0 && (
        <section className="dashboard-panel">
          <div className="section-row" style={{ marginBottom: 14 }}>
            <div>
              <h2>Documents</h2>
              <p>Files attached to this animal.</p>
            </div>
            <Link className="text-link" href="/documents">
              <FileText size={15} /> All documents
            </Link>
          </div>
          <div className="activity-feed">
            {documents.slice(0, 5).map((doc) => (
              <article key={doc.id}>
                <span><FileText size={16} /></span>
                <div>
                  <a href={doc.downloadUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: ".68rem" }}>
                    {doc.name}
                  </a>
                  <p>{doc.fileName}</p>
                  <small>Uploaded by {doc.createdByName || "Team member"}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-panel">
        <div className="section-row" style={{ marginBottom: 14 }}>
          <div>
            <h2>Activity</h2>
            <p>Work recorded against this animal.</p>
          </div>
          <Link className="text-link" href="/activity">
            <ActivityIcon size={15} /> All activity
          </Link>
        </div>
        {activities.length ? (
          <div className="activity-feed">
            {activities.slice(0, 8).map((record) => (
              <article key={record.id}>
                <span><ActivityIcon size={16} /></span>
                <div>
                  <strong>{record.activity}</strong>
                  <p>{record.notes}</p>
                  <small>
                    {formatDisplayDate(record.date)} · {record.createdByName || "Team member"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: ".75rem" }}>No activity recorded against this animal yet.</p>
        )}
      </section>

      <p className="dashboard-footnote">
        <UserRound size={14} /> Every record shows who recorded it and when — the animal stays a
        complete, traceable history.
      </p>

      {showHealthForm && animal && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowHealthForm(false)} aria-label="Close form" />
          <div className="record-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="eyebrow">Animal health</span>
                <h2>Add health record</h2>
              </div>
              <button className="icon-button" onClick={() => setShowHealthForm(false)}>
                <X size={20} />
              </button>
            </header>
            <HealthRecordForm
              animals={[animal]}
              lockedAnimalId={animal.id}
              onSubmit={saveHealth}
              saving={savingHealth}
              onCancel={() => setShowHealthForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
