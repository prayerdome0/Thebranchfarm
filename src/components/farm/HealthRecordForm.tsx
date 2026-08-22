"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { asStoredCloudinaryAsset, resolveCloudinaryConfig, uploadHealthPhotoToCloudinary } from "@/lib/cloudinary";
import { HEALTH_RECORD_TYPES } from "@/lib/constants";
import { animalLabel } from "@/lib/firebase/data";
import { healthRecordSchema } from "@/lib/validation";
import { friendlyError, todayIso } from "@/lib/utils";
import type { Animal, HealthRecord } from "@/types";
import { PhotoField } from "./PhotoField";

export interface HealthRecordValues {
  animalId: string;
  animalLabel?: string;
  type: string;
  problem: string;
  description?: string;
  observation?: string;
  actionTaken?: string;
  treatment?: string;
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
    type: defaults?.type || "observation",
    problem: defaults?.problem || "",
    description: (defaults as any)?.description || defaults?.observation || "",
    treatment: (defaults as any)?.treatment || defaults?.actionTaken || "",
    date: defaults?.date || todayIso(),
    notes: defaults?.notes || "",
  });
  const [photo, setPhoto] = useState<{ url?: string; path?: string }>({
    url: defaults?.photo || (defaults as any)?.attachmentUrl,
    path: defaults?.photoPath || (defaults as any)?.attachmentPublicId,
  });
  const [error, setError] = useState("");
  const { settings } = useStoreConfig();

  const update = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  const selectedAnimal = animals.find((animal) => animal.id === form.animalId || animal.animalId === form.animalId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = healthRecordSchema.safeParse({
      animalId: form.animalId,
      type: form.type,
      problem: form.problem || form.description || "Health record",
      observation: form.description,
      actionTaken: form.treatment,
      date: form.date,
      notes: form.notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Review info");
      return;
    }
    const values: HealthRecordValues = {
      animalId: form.animalId,
      animalLabel: animalLabel(selectedAnimal, form.animalId),
      type: form.type,
      problem: form.problem || form.description || "Health record",
      description: form.description,
      observation: form.description,
      actionTaken: form.treatment,
      treatment: form.treatment,
      date: form.date,
      notes: form.notes,
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
    <form onSubmit={submit} className="dashboard-stack" style={{ padding: 20 }}>
      <div className="form-grid">
        <label className="field">
          <span>Animal *</span>
          {lockedAnimalId ? <input value={animalLabel(selectedAnimal, lockedAnimalId)} disabled /> : (
            <select value={form.animalId} onChange={(e) => update("animalId", e.target.value)} required>
              <option value="">Select animal…</option>
              {animals.map((a) => (<option key={a.id} value={a.id}>{animalLabel(a, a.animalId)}</option>))}
            </select>
          )}
        </label>
        <label className="field"><span>Date *</span><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required /></label>
        <label className="field"><span>Type *</span>
          <select value={form.type} onChange={(e) => update("type", e.target.value)}>
            {HEALTH_RECORD_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </label>
        <label className="field field-full"><span>Description *</span><input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe observation or problem" required /></label>
        <label className="field field-full"><span>Treatment</span><input value={form.treatment} onChange={(e) => update("treatment", e.target.value)} placeholder="Treatment given" /></label>
      </div>

      <PhotoField
        label="Attachment (photo) — Cloudinary no folders"
        value={photo.url}
        path={photo.path}
        upload={async (file, onProgress) => asStoredCloudinaryAsset(await uploadHealthPhotoToCloudinary(file, resolveCloudinaryConfig(settings), onProgress))}
        onChange={(result) => setPhoto({ url: result.url, path: result.path })}
        hint="Stored in Cloudinary dhad95cch with branch_farm_unsigned preset, no folders. recordType animal, recordId animal ID."
      />

      <label className="field field-full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Additional notes" /></label>

      {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}

      <div className="modal-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>Cancel</button>
        <button className="button button-primary" disabled={saving}>{saving ? <><i className="button-spinner" /> Saving…</> : "Save health record"}</button>
      </div>
    </form>
  );
}
