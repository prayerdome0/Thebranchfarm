"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { ANIMAL_STATUSES, ANIMAL_TYPES, HEALTH_STATUSES } from "@/lib/constants";
import { uploadAnimalPhoto } from "@/lib/firebase/storage";
import { animalSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import type {
  Animal,
  AnimalHealthStatus,
  AnimalSex,
  AnimalStatus,
  AnimalType,
} from "@/types";
import { PhotoField } from "./PhotoField";

export interface AnimalFormValues {
  animalId: string;
  tagNumber?: string;
  name?: string;
  animalType: AnimalType;
  breed: string;
  sex: AnimalSex;
  dateOfBirth?: string;
  datePurchased?: string;
  purchasePrice?: number | null;
  supplier?: string;
  location: string;
  weight?: number | null;
  status: AnimalStatus;
  healthStatus: AnimalHealthStatus;
  notes?: string;
  photo?: string;
  photoPath?: string;
}

function initialValues(defaults?: Partial<Animal>): Record<string, string> {
  return {
    animalId: defaults?.animalId || "",
    tagNumber: defaults?.tagNumber || "",
    name: defaults?.name || "",
    animalType: defaults?.animalType || "cattle",
    breed: defaults?.breed || "",
    sex: defaults?.sex || "female",
    dateOfBirth: defaults?.dateOfBirth || "",
    datePurchased: defaults?.datePurchased || "",
    purchasePrice: defaults?.purchasePrice != null ? String(defaults.purchasePrice) : "",
    supplier: defaults?.supplier || "",
    location: defaults?.location || "",
    weight: defaults?.weight != null ? String(defaults.weight) : "",
    status: defaults?.status || "active",
    healthStatus: defaults?.healthStatus || "healthy",
    notes: defaults?.notes || "",
  };
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      {children || (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(name, event.target.value)}
          required={required}
        />
      )}
    </label>
  );
}

export function AnimalForm({
  defaults,
  onSubmit,
  saving,
  onCancel,
}: {
  defaults?: Partial<Animal>;
  onSubmit: (values: AnimalFormValues) => Promise<void>;
  saving: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(initialValues(defaults));
  const [photo, setPhoto] = useState<{ url?: string; path?: string }>({
    url: defaults?.photo,
    path: defaults?.photoPath,
  });
  const [error, setError] = useState("");

  const update = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = animalSchema.safeParse({
      ...form,
      purchasePrice: form.purchasePrice || "",
      weight: form.weight || "",
      dateOfBirth: form.dateOfBirth || "",
      datePurchased: form.datePurchased || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information and try again.");
      return;
    }
    const values: AnimalFormValues = {
      animalId: form.animalId.trim(),
      tagNumber: form.tagNumber.trim() || undefined,
      name: form.name.trim() || undefined,
      animalType: form.animalType as AnimalType,
      breed: form.breed.trim(),
      sex: form.sex as AnimalSex,
      dateOfBirth: form.dateOfBirth || undefined,
      datePurchased: form.datePurchased || undefined,
      purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
      supplier: form.supplier.trim() || undefined,
      location: form.location.trim(),
      weight: form.weight === "" ? null : Number(form.weight),
      status: form.status as AnimalStatus,
      healthStatus: form.healthStatus as AnimalHealthStatus,
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
        <Field label="Animal ID / tag number" name="animalId" value={form.animalId} onChange={update} required placeholder="e.g. C-001" />
        <Field label="Name" name="name" value={form.name} onChange={update} placeholder="e.g. Bella" />
        <Field label="Animal type" name="animalType" value={form.animalType} onChange={update}>
          <select value={form.animalType} onChange={(event) => update("animalType", event.target.value)}>
            {ANIMAL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Breed" name="breed" value={form.breed} onChange={update} required placeholder="e.g. Jersey" />
        <Field label="Sex" name="sex" value={form.sex} onChange={update}>
          <select value={form.sex} onChange={(event) => update("sex", event.target.value)}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update} />
        <Field label="Date purchased" name="datePurchased" type="date" value={form.datePurchased} onChange={update} />
        <Field label="Purchase price" name="purchasePrice" type="number" value={form.purchasePrice} onChange={update} placeholder="e.g. 6500" />
        <Field label="Supplier / source" name="supplier" value={form.supplier} onChange={update} placeholder="Where the animal came from" />
        <Field label="Current location" name="location" value={form.location} onChange={update} required placeholder="e.g. Main cattle pen" />
        <Field label="Weight (kg)" name="weight" type="number" value={form.weight} onChange={update} placeholder="e.g. 420" />
        <Field label="Status" name="status" value={form.status} onChange={update}>
          <select value={form.status} onChange={(event) => update("status", event.target.value)}>
            {ANIMAL_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Current condition" name="healthStatus" value={form.healthStatus} onChange={update}>
          <select value={form.healthStatus} onChange={(event) => update("healthStatus", event.target.value)}>
            {HEALTH_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <PhotoField
        label="Animal photo"
        value={photo.url}
        path={photo.path}
        upload={async (file, onProgress) => {
          const result = await uploadAnimalPhoto(form.animalId || "new", file, onProgress);
          return { url: result.downloadUrl, path: result.storagePath };
        }}
        onChange={(result) => setPhoto({ url: result.url, path: result.path })}
      />

      <label className="field field-full">
        <span>Notes</span>
        <textarea rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
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
            "Save animal"
          )}
        </button>
      </div>
    </form>
  );
}
