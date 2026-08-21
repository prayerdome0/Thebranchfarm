"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { HEALTH_RECORD_TYPES } from "@/lib/constants";
import { animalLabel } from "@/lib/firebase/data";
import { uploadHealthPhoto } from "@/lib/firebase/storage";
import { healthRecordSchema } from "@/lib/validation";
import { friendlyError, todayIso } from "@/lib/utils";
import type { Animal, HealthRecord } from "@/types";
import { PhotoField } from "./PhotoField";

export interface HealthRecordValues {
  animalId: string;
  animalLabel?: string;
  type: string;
  problem: string;
  observation?: string;
  actionTaken?: string;
  medication?: string;
  date: string;
  nextDate?: string;
  notes?: string;
  photo?: string;
  photoPath?: string;
}

export function HealthRecordForm({
  animals,
  lockedAnimalId,
  defaults,
  onSubmit,
  saving,
  onCancel,
}: {
  animals: Animal[];
  lockedAnimalId?: string;
  defaults?: Partial<HealthRecord>;
  onSubmit: (values: HealthRecordValues) => Promise<void>;
  saving: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    animalId: defaults?.animalId || lockedAnimalId || "",
    type: defaults?.type || "problem",
    problem: defaults?.problem || "",
    observation: defaults?.observation || "",
    actionTaken: defaults?.actionTaken || "",
    medication: defaults?.medication || "",
    date: defaults?.date || todayIso(),
    nextDate: defaults?.nextDate || "",
    notes: defaults?.notes || "",
  });
  const [photo, setPhoto] = useState<{ url?: string; path?: string }>({
    url: defaults?.photo,
    path: defaults?.photoPath,
  });
  const [error, setError] = useState("");

  const update = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  const selectedAnimal = animals.find(
    (animal) => animal.id === form.animalId || animal.animalId === form.animalId,
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = healthRecordSchema.safeParse({
      ...form,
      nextDate: form.nextDate || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information and try again.");
      return;
    }
    const values: HealthRecordValues = {
      animalId: form.animalId,
      animalLabel: animalLabel(selectedAnimal, form.animalId),
      type: form.type,
      problem: form.problem.trim(),
      observation: form.observation.trim() || undefined,
      actionTaken: form.actionTaken.trim() || undefined,
      medication: form.medication.trim() || undefined,
      date: form.date,
      nextDate: form.nextDate || undefined,
      notes: form.notes.trim() || undefined,
      photo: photo.url,
      photoPath: photo.path,
    };
    try {
      await onSubmit(values);
    } catch (cause) {
      setError(friendlyError(cause));
    }
  };

  return (
    <form onSubmit={submit} className="dashboard-stack">
      <div className="form-grid">
        <label className="field">
          <span>Animal *</span>
          {lockedAnimalId ? (
            <input value={animalLabel(selectedAnimal, lockedAnimalId)} disabled />
          ) : (
            <select value={form.animalId} onChange={(event) => update("animalId", event.target.value)} required>
              <option value="">Select an animal…</option>
              {animals.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animalLabel(animal, animal.animalId)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="field">
          <span>Record type</span>
          <select value={form.type} onChange={(event) => update("type", event.target.value)}>
            {HEALTH_RECORD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label className="field field-full">
          <span>Problem / issue *</span>
          <input
            value={form.problem}
            placeholder="e.g. Animal not eating normally"
            onChange={(event) => update("problem", event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Observation</span>
          <input
            value={form.observation}
            placeholder="e.g. Reduced appetite"
            onChange={(event) => update("observation", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Action taken</span>
          <input
            value={form.actionTaken}
            placeholder="e.g. Monitoring"
            onChange={(event) => update("actionTaken", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Medication / vaccine</span>
          <input
            value={form.medication}
            onChange={(event) => update("medication", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Date *</span>
          <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required />
        </label>
        <label className="field">
          <span>Next / follow-up date</span>
          <input type="date" value={form.nextDate} onChange={(event) => update("nextDate", event.target.value)} />
        </label>
      </div>

      <PhotoField
        label="Supporting photo (optional)"
        value={photo.url}
        path={photo.path}
        upload={async (file, onProgress) => {
          const result = await uploadHealthPhoto(form.animalId || "health", file, onProgress);
          return { url: result.downloadUrl, path: result.storagePath };
        }}
        onChange={(result) => setPhoto({ url: result.url, path: result.path })}
      />

      <label className="field field-full">
        <span>Medical notes</span>
        <textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </label>

      {error && (
        <div className="form-alert error">
          <CircleAlert size={17} /> {error}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button-primary" disabled={saving}>
          {saving ? (
            <>
              <i className="button-spinner" /> Saving…
            </>
          ) : (
            "Save health record"
          )}
        </button>
      </div>
    </form>
  );
}
