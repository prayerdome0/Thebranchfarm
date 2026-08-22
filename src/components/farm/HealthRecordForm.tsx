"use client";

import { CircleAlert, FileText, UploadCloud, X } from "lucide-react";
import { useState } from "react";
import {
  asStoredCloudinaryAsset,
  uploadGenericFileToCloudinary,
  uploadHealthPhotoToCloudinary,
} from "@/lib/cloudinary";
import { HEALTH_RECORD_TYPES, HEALTH_STATUSES } from "@/lib/constants";
import { animalLabel } from "@/lib/firebase/data";
import { healthRecordSchema } from "@/lib/validation";
import { friendlyError, todayIso } from "@/lib/utils";
import type { Animal, AnimalHealthStatus, HealthRecord, OperationAttachment } from "@/types";
import { PhotoField } from "./PhotoField";

export interface HealthRecordValues {
  animalId: string;
  animalLabel?: string;
  type: string;
  problem: string;
  description?: string;
  observation?: string;
  symptoms?: string;
  reason?: string;
  actionTaken?: string;
  treatment?: string;
  medication?: string;
  vaccineName?: string;
  dosage?: string;
  veterinaryVisit?: boolean;
  vetName?: string;
  vetContact?: string;
  healthStatus?: AnimalHealthStatus;
  followUp?: string;
  date: string;
  nextDate?: string;
  notes?: string;
  photo?: string;
  photoPath?: string;
  attachments?: OperationAttachment[];
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
    problem: defaults?.problem || defaults?.description || "",
    observation: defaults?.observation || defaults?.description || "",
    symptoms: defaults?.symptoms || "",
    reason: defaults?.reason || "",
    actionTaken: defaults?.actionTaken || "",
    treatment: defaults?.treatment || "",
    medication: defaults?.medication || "",
    vaccineName: defaults?.vaccineName || "",
    dosage: defaults?.dosage || "",
    veterinaryVisit: defaults?.veterinaryVisit ? "yes" : "no",
    vetName: defaults?.vetName || "",
    vetContact: defaults?.vetContact || "",
    healthStatus: defaults?.healthStatus || "healthy",
    followUp: defaults?.followUp || "",
    date: defaults?.date || todayIso(),
    nextDate: defaults?.nextDate || "",
    notes: defaults?.notes || "",
  });
  const [photo, setPhoto] = useState<{ url?: string; path?: string }>({
    url: defaults?.photo || defaults?.attachmentUrl,
    path: defaults?.photoPath || defaults?.attachmentPublicId,
  });
  const [attachments, setAttachments] = useState<OperationAttachment[]>(defaults?.attachments || []);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [error, setError] = useState("");

  const update = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const selectedAnimal = animals.find((animal) => animal.id === form.animalId || animal.animalId === form.animalId);
  const vaccination = form.type === "vaccination";

  const uploadDocument = async (file?: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setError("The supporting document is larger than 25 MB."); return; }
    setUploadingDocument(true);
    setError("");
    try {
      const result = await uploadGenericFileToCloudinary(file, "animal_health_document");
      setAttachments((current) => [...current, {
        name: file.name,
        url: result.url,
        publicId: result.publicId,
        resourceType: result.resourceType,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      }]);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setUploadingDocument(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = healthRecordSchema.safeParse({
      ...form,
      problem: form.problem,
      veterinaryVisit: form.veterinaryVisit === "yes",
      nextDate: form.nextDate || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the health information.");
      return;
    }
    const values: HealthRecordValues = {
      animalId: form.animalId,
      animalLabel: animalLabel(selectedAnimal, form.animalId),
      type: form.type,
      problem: form.problem.trim(),
      description: form.observation.trim() || undefined,
      observation: form.observation.trim() || undefined,
      symptoms: form.symptoms.trim() || undefined,
      reason: form.reason.trim() || undefined,
      actionTaken: form.actionTaken.trim() || undefined,
      treatment: form.treatment.trim() || undefined,
      medication: form.medication.trim() || undefined,
      vaccineName: form.vaccineName.trim() || undefined,
      dosage: form.dosage.trim() || undefined,
      veterinaryVisit: form.veterinaryVisit === "yes",
      vetName: form.vetName.trim() || undefined,
      vetContact: form.vetContact.trim() || undefined,
      healthStatus: form.healthStatus as AnimalHealthStatus,
      followUp: form.followUp.trim() || undefined,
      date: form.date,
      nextDate: form.nextDate || undefined,
      notes: form.notes.trim() || undefined,
      photo: photo.url,
      photoPath: photo.path,
      attachments,
    };
    try {
      await onSubmit(values);
    } catch (cause) {
      setError(friendlyError(cause));
    }
  };

  return (
    <form onSubmit={submit} className="health-record-form">
      <fieldset className="operation-form-section">
        <legend>Animal & record</legend>
        <div className="form-grid">
          <label className="field">
            <span>Animal *</span>
            {lockedAnimalId ? <input value={animalLabel(selectedAnimal, lockedAnimalId)} disabled /> : (
              <select value={form.animalId} onChange={(event) => update("animalId", event.target.value)} required>
                <option value="">Select animal…</option>
                {animals.map((animal) => <option key={animal.id} value={animal.id}>{animalLabel(animal, animal.animalId)}</option>)}
              </select>
            )}
          </label>
          <label className="field"><span>Date given / observed *</span><input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required /></label>
          <label className="field"><span>Record type *</span><select value={form.type} onChange={(event) => update("type", event.target.value)}>{HEALTH_RECORD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="field"><span>Current health status *</span><select value={form.healthStatus} onChange={(event) => update("healthStatus", event.target.value)}>{HEALTH_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <label className="field field-full"><span>{vaccination ? "Vaccination reason / purpose" : "Problem / reason / observation"} *</span><input value={form.problem} onChange={(event) => update("problem", event.target.value)} placeholder={vaccination ? "e.g. Routine clostridial vaccination" : "Describe the concern or observation"} required /></label>
        </div>
      </fieldset>

      {vaccination && (
        <fieldset className="operation-form-section">
          <legend>Vaccination</legend>
          <div className="form-grid">
            <label className="field"><span>Vaccine name *</span><input value={form.vaccineName} onChange={(event) => update("vaccineName", event.target.value)} required /></label>
            <label className="field"><span>Dose</span><input value={form.dosage} onChange={(event) => update("dosage", event.target.value)} placeholder="e.g. 2 ml" /></label>
            <label className="field"><span>Next vaccination date</span><input type="date" value={form.nextDate} min={form.date} onChange={(event) => update("nextDate", event.target.value)} /></label>
          </div>
        </fieldset>
      )}

      <fieldset className="operation-form-section">
        <legend>Assessment & treatment</legend>
        <div className="form-grid">
          <label className="field field-full"><span>Symptoms / detailed observation</span><textarea rows={3} value={form.symptoms || form.observation} onChange={(event) => { update("symptoms", event.target.value); update("observation", event.target.value); }} /></label>
          <label className="field"><span>Treatment / medicine</span><input value={form.treatment} onChange={(event) => update("treatment", event.target.value)} placeholder="Treatment provided" /></label>
          <label className="field"><span>Medication</span><input value={form.medication} onChange={(event) => update("medication", event.target.value)} placeholder="Medicine and dose" /></label>
          <label className="field field-full"><span>Action taken</span><textarea rows={2} value={form.actionTaken} onChange={(event) => update("actionTaken", event.target.value)} /></label>
          <label className="field"><span>Veterinary visit</span><select value={form.veterinaryVisit} onChange={(event) => update("veterinaryVisit", event.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></label>
          {form.veterinaryVisit === "yes" && <><label className="field"><span>Veterinarian name</span><input value={form.vetName} onChange={(event) => update("vetName", event.target.value)} /></label><label className="field"><span>Veterinarian contact</span><input value={form.vetContact} onChange={(event) => update("vetContact", event.target.value)} /></label></>}
          {!vaccination && <label className="field"><span>Follow-up date</span><input type="date" value={form.nextDate} min={form.date} onChange={(event) => update("nextDate", event.target.value)} /></label>}
          <label className="field field-full"><span>Follow-up instructions</span><textarea rows={2} value={form.followUp} onChange={(event) => update("followUp", event.target.value)} /></label>
          <label className="field field-full"><span>Medical notes</span><textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset className="operation-form-section">
        <legend>Supporting evidence</legend>
        <PhotoField
          label="Health photo"
          value={photo.url}
          path={photo.path}
          upload={async (file, onProgress) => asStoredCloudinaryAsset(await uploadHealthPhotoToCloudinary(file, onProgress))}
          onChange={(result) => setPhoto({ url: result.url, path: result.path })}
          hint="Attach a clear photo of the animal, medicine label or visible symptom."
        />
        {attachments.length > 0 && <div className="operation-attachment-list health-attachments">{attachments.map((attachment, index) => <article key={`${attachment.publicId}-${index}`}><span><FileText size={17} /></span><div><strong>{attachment.name}</strong><small>Supporting document</small></div><button type="button" className="icon-button icon-button-small" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button></article>)}</div>}
        <label className="button button-secondary file-button operation-upload-button"><UploadCloud size={17} /> {uploadingDocument ? "Uploading…" : "Attach document"}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(event) => uploadDocument(event.target.files?.[0])} disabled={uploadingDocument} /></label>
      </fieldset>

      {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={saving || uploadingDocument}>{saving ? <><i className="button-spinner" /> Saving…</> : "Save health record"}</button></div>
      <small className="operation-form-audit">Recorded by and update times are added automatically.</small>
    </form>
  );
}
