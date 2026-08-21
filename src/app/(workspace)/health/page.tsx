"use client";

import { Plus, Search, Stethoscope, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HealthRecordCard } from "@/components/farm/HealthRecordCard";
import { HealthRecordForm, type HealthRecordValues } from "@/components/farm/HealthRecordForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { HEALTH_RECORD_TYPES, HEALTH_RECORD_TYPE_LABELS } from "@/lib/constants";
import {
  addHealthRecord,
  deleteHealthRecord,
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

  const save = async (values: HealthRecordValues) => {
    setSaving(true);
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
        <button className="button button-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Add health record
        </button>
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
        <div className="health-record-list">
          {visible.map((record) => (
            <HealthRecordCard
              key={record.id}
              record={record}
              showAnimal
              canDelete={isAdmin}
              onDelete={remove}
            />
          ))}
        </div>
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
          <button className="modal-scrim" onClick={() => setShowForm(false)} aria-label="Close form" />
          <div className="record-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="eyebrow">Animal health</span>
                <h2>Add health record</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </header>
            <HealthRecordForm
              animals={animals}
              onSubmit={save}
              saving={saving}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
