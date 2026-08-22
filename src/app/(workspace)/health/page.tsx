"use client";

import { AlertTriangle, CheckCircle2, Clock3, Plus, Search, Stethoscope, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HealthRecordCard } from "@/components/farm/HealthRecordCard";
import { HealthRecordForm, type HealthRecordValues } from "@/components/farm/HealthRecordForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { HEALTH_RECORD_TYPES, HEALTH_RECORD_TYPE_LABELS } from "@/lib/constants";
import {
  addHealthRecord,
  deleteHealthRecord,
  updateHealthRecord,
  watchAnimals,
  watchHealthRecords,
} from "@/lib/firebase/data";
import { cn, friendlyError } from "@/lib/utils";
import type { Animal, HealthRecord } from "@/types";

export default function HealthPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [animalFilter, setAnimalFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stopAnimals = watchAnimals((list) => setAnimals(list));
    const stopRecords = watchHealthRecords(null, (list) => {
      setRecords(list);
      setLoading(false);
    });
    return () => {
      stopAnimals();
      stopRecords();
    };
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesAnimal = animalFilter === "all" || record.animalId === animalFilter;
      const matchesType = typeFilter === "all" || record.type === typeFilter;
      const matchesSearch =
        !term ||
        [record.problem, record.observation, record.actionTaken, record.animalLabel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesAnimal && matchesType && matchesSearch;
    });
  }, [records, animalFilter, typeFilter, search]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = new Date();
  upcoming.setDate(upcoming.getDate() + 30);
  const upcomingIso = upcoming.toISOString().slice(0, 10);
  const attentionCount = records.filter((record) => ["sick", "injured"].includes(record.healthStatus || "") || Boolean(record.nextDate && record.nextDate < today)).length;
  const upcomingCount = records.filter((record) => record.nextDate && record.nextDate >= today && record.nextDate <= upcomingIso).length;
  const upToDateCount = Math.max(0, records.length - attentionCount - upcomingCount);

  const save = async (values: HealthRecordValues) => {
    setSaving(true);
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
      if (editing) {
        const { id, ...existing } = editing;
        await updateHealthRecord(id, { ...existing, ...payload });
      } else {
        await addHealthRecord(payload);
      }
      showToast(editing ? "Health record updated." : "Health record saved.", "success");
      setEditing(null);
      setShowForm(false);
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: HealthRecord) => {
    if (!window.confirm("Delete this health record? This cannot be undone.")) return;
    try {
      await deleteHealthRecord(record.id);
      showToast("Health record deleted.", "success");
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Animal health</h2>
          <p>Problems, observations, vaccinations and treatments — the complete animal health history.</p>
        </div>
        <button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={18} /> Add health record
        </button>
      </section>

      <section className="health-status-overview">
        <article className="danger"><span><AlertTriangle size={18} /></span><div><small>Attention required</small><strong>{attentionCount}</strong></div></article>
        <article className="warning"><span><Clock3 size={18} /></span><div><small>Upcoming (30 days)</small><strong>{upcomingCount}</strong></div></article>
        <article className="good"><span><CheckCircle2 size={18} /></span><div><small>Up to date</small><strong>{upToDateCount}</strong></div></article>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search problems, observations and actions…"
            aria-label="Search health records"
          />
        </div>
        <select
          className="select-field"
          style={{ minHeight: 47, padding: "0 12px", border: "1px solid #ccd6cf", borderRadius: 10 }}
          value={animalFilter}
          onChange={(event) => setAnimalFilter(event.target.value)}
          aria-label="Filter by animal"
        >
          <option value="all">All animals</option>
          {animals.map((animal) => (
            <option key={animal.id} value={animal.id}>
              {animal.name || animal.animalId} (#{animal.animalId})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Filter by record type">
        <button className={cn(typeFilter === "all" && "active")} onClick={() => setTypeFilter("all")}>
          All
        </button>
        {HEALTH_RECORD_TYPES.map((type) => (
          <button
            key={type.value}
            className={cn(typeFilter === type.value && "active")}
            onClick={() => setTypeFilter(type.value)}
          >
            {HEALTH_RECORD_TYPE_LABELS[type.value]}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading health records…" />
      ) : visible.length ? (
        <ErrorBoundary label="Some health records could not be displayed. Refresh and try again.">
          <div className="health-record-list">
            {visible.map((record) => (
              <HealthRecordCard
                key={record.id}
                record={record}
                showAnimal
                canDelete={isAdmin}
                onDelete={remove}
                onEdit={(record) => { setEditing(record); setShowForm(true); }}
              />
            ))}
          </div>
        </ErrorBoundary>
      ) : (
        <EmptyState
          icon={Stethoscope}
          title="No health records"
          description="When a staff member notices something, they record it here — problem, observation and action."
          action={
            <button className="button button-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Add health record
            </button>
          }
        />
      )}

      {showForm && (
        <div className="modal-layer">
            <button className="modal-scrim" onClick={() => { setShowForm(false); setEditing(null); }} aria-label="Close form" />
          <div className="record-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="eyebrow">Animal health</span>
                <h2>{editing ? "Edit health record" : "Add health record"}</h2>
              </div>
              <button className="icon-button" onClick={() => { setShowForm(false); setEditing(null); }}>
                <X size={20} />
              </button>
            </header>
            <ErrorBoundary label="The health record form could not be opened. Refresh and try again.">
              <HealthRecordForm
                animals={animals}
                defaults={editing || undefined}
                onSubmit={save}
                saving={saving}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}
