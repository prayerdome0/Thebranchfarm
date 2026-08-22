"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { asStoredCloudinaryAsset, uploadAnimalPhotoToCloudinary } from "@/lib/cloudinary";
import { ANIMAL_STATUSES, ANIMAL_TYPES, HEALTH_STATUSES } from "@/lib/constants";
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
  estimatedAge?: string;
  colour?: string;
  identifyingFeatures?: string;
  registrationType: "born" | "purchased" | "transferred-in" | "existing";
  datePurchased?: string;
  acquisitionDate?: string;
  purchasePrice?: number | null;
  supplier?: string;
  sellerContact?: string;
  purchasedFor?: string;
  transportInformation?: string;
  location: string;
  weight?: number | null;
  status: AnimalStatus;
  healthStatus: AnimalHealthStatus;
  statusDate?: string;
  statusReason?: string;
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
    estimatedAge: defaults?.estimatedAge || "",
    colour: defaults?.colour || "",
    identifyingFeatures: defaults?.identifyingFeatures || "",
    registrationType: defaults?.registrationType || "existing",
    datePurchased: defaults?.datePurchased || defaults?.acquisitionDate || "",
    acquisitionDate: defaults?.acquisitionDate || defaults?.datePurchased || "",
    purchasePrice: defaults?.purchasePrice != null ? String(defaults.purchasePrice) : "",
    supplier: defaults?.supplier || "",
    sellerContact: defaults?.sellerContact || "",
    purchasedFor: defaults?.purchasedFor || "",
    transportInformation: defaults?.transportInformation || "",
    location: defaults?.location || "",
    weight: defaults?.weight != null ? String(defaults.weight) : "",
    status: defaults?.status || "active",
    healthStatus: defaults?.healthStatus || "healthy",
    statusDate: defaults?.statusDate || "",
    statusReason: defaults?.statusReason || "",
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
      estimatedAge: form.estimatedAge.trim() || undefined,
      colour: form.colour.trim() || undefined,
      identifyingFeatures: form.identifyingFeatures.trim() || undefined,
      registrationType: form.registrationType as AnimalFormValues["registrationType"],
      datePurchased: form.datePurchased || undefined,
      acquisitionDate: form.acquisitionDate || form.datePurchased || undefined,
      purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
      supplier: form.supplier.trim() || undefined,
      sellerContact: form.sellerContact.trim() || undefined,
      purchasedFor: form.purchasedFor.trim() || undefined,
      transportInformation: form.transportInformation.trim() || undefined,
      location: form.location.trim(),
      weight: form.weight === "" ? null : Number(form.weight),
      status: form.status as AnimalStatus,
      healthStatus: form.healthStatus as AnimalHealthStatus,
      statusDate: form.statusDate || undefined,
      statusReason: form.statusReason.trim() || undefined,
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
        <Field label="Estimated age" name="estimatedAge" value={form.estimatedAge} onChange={update} placeholder="e.g. approximately 3 years" />
        <Field label="Colour" name="colour" value={form.colour} onChange={update} placeholder="e.g. brown and white" />
        <Field label="Identifying features" name="identifyingFeatures" value={form.identifyingFeatures} onChange={update} placeholder="Marks, horns, ear pattern…" />
        <Field label="How this animal joined the farm" name="registrationType" value={form.registrationType} onChange={update}>
          <select value={form.registrationType} onChange={(event) => update("registrationType", event.target.value)}>
            <option value="existing">Existing farm animal</option>
            <option value="purchased">Purchased</option>
            <option value="born">Born on the farm</option>
            <option value="transferred-in">Transferred in</option>
          </select>
        </Field>
        <Field label="Acquisition date" name="acquisitionDate" type="date" value={form.acquisitionDate} onChange={update} />
        <Field label="Date purchased" name="datePurchased" type="date" value={form.datePurchased} onChange={update} />
        <Field label="Purchase price" name="purchasePrice" type="number" value={form.purchasePrice} onChange={update} placeholder="e.g. 6500" />
        <Field label="Seller / source" name="supplier" value={form.supplier} onChange={update} placeholder="Where the animal came from" />
        <Field label="Seller contact" name="sellerContact" value={form.sellerContact} onChange={update} placeholder="Phone or address" />
        <Field label="Purchased by / for" name="purchasedFor" value={form.purchasedFor} onChange={update} placeholder="Buyer or farm project" />
        <Field label="Transport information" name="transportInformation" value={form.transportInformation} onChange={update} placeholder="Vehicle, carrier, arrival notes" />
        <Field label="Current location" name="location" value={form.location} onChange={update} required placeholder="e.g. Main cattle pen" />
        <Field label="Current weight (kg)" name="weight" type="number" value={form.weight} onChange={update} placeholder="e.g. 420" />
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
        <Field label="Status effective date" name="statusDate" type="date" value={form.statusDate} onChange={update} />
        <Field label="Status reason" name="statusReason" value={form.statusReason} onChange={update} placeholder="Reason for sale, transfer or other status" />
      </div>

      <PhotoField
        label="Animal photo"
        value={photo.url}
        path={photo.path}
        upload={async (file, onProgress) =>
          asStoredCloudinaryAsset(await uploadAnimalPhotoToCloudinary(file, onProgress))
        }
        onChange={(result) => setPhoto({ url: result.url, path: result.path })}
        hint="Uploaded securely through the farm server. JPG, PNG or WebP up to 8 MB."
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
