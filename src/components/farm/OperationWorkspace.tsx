"use client";

import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { useToast } from "@/contexts/ToastContext";
import {
  defaultOperationValues,
  FARM_MODULES,
  formatOperationValue,
  makeOperationReference,
  normalizeOperationValues,
  operationAttention,
  operationCoreFields,
  validateOperationValues,
  type FarmModuleDefinition,
  type OperationFieldDefinition,
} from "@/lib/farmModules";
import {
  archiveFarmOperation,
  createFarmOperation,
  getUsers,
  reviewFarmOperation,
  updateFarmOperation,
  watchAnimals,
  watchAuditTrail,
  watchFarmOperations,
} from "@/lib/firebase/data";
import { printOperationRecord } from "@/lib/farmReports";
import { resolveCloudinaryConfig, uploadGenericFileToCloudinary } from "@/lib/cloudinary";
import { cn, formatDate, formatDisplayDate, friendlyError, money } from "@/lib/utils";
import type {
  Animal,
  AuditEvent,
  FarmModule,
  FarmOperationRecord,
  OperationAttachment,
  OperationValue,
  UserProfile,
} from "@/types";

type FormState = Record<string, string | boolean | number | null>;

const CALCULATED_FIELDS = new Set(["remaining", "totalProduction", "stockStatus"]);

function inputValue(value: OperationValue | undefined) {
  return value == null ? "" : String(value);
}

function displayRecordField(record: FarmOperationRecord, field: OperationFieldDefinition) {
  const value = ["animal", "staff"].includes(field.type)
    ? record.values[`${field.key}Label`] || record.values[field.key]
    : record.values[field.key];
  return formatOperationValue(field, value);
}

function firstName(name?: string) {
  return (name || "Team member").split(" ")[0];
}

function RecordForm({
  definition,
  record,
  animals,
  staff,
  isAdmin,
  initialAnimalId,
  onClose,
  onSaved,
}: {
  definition: FarmModuleDefinition;
  record: FarmOperationRecord | null;
  animals: Animal[];
  staff: UserProfile[];
  isAdmin: boolean;
  initialAnimalId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { settings } = useStoreConfig();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(() => {
    if (record) return { ...record.values };
    const defaults: FormState = defaultOperationValues(definition);
    if (initialAnimalId && definition.animalField) defaults[definition.animalField] = initialAnimalId;
    return defaults;
  });
  const [attachments, setAttachments] = useState<OperationAttachment[]>(record?.attachments || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const normalized = useMemo(() => normalizeOperationValues(definition, form), [definition, form]);
  const staffProgressOnly = Boolean(record && definition.adminCreatesOnly && !isAdmin);

  const setValue = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    const selected = Array.from(files).slice(0, Math.max(0, 8 - attachments.length));
    if (!selected.length) {
      setError("A record can have up to 8 attachments.");
      return;
    }
    const oversized = selected.find((file) => file.size > 25 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} is larger than 25 MB.`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded: OperationAttachment[] = [];
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const result = await uploadGenericFileToCloudinary(
          file,
          resolveCloudinaryConfig(settings),
          `farm_${definition.module}`,
          (progress) => setUploadProgress(Math.round(((index + progress / 100) / selected.length) * 100)),
        );
        uploaded.push({
          name: file.name,
          url: result.url,
          publicId: result.publicId,
          resourceType: result.resourceType,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
      setAttachments((current) => [...current, ...uploaded]);
      showToast(`${uploaded.length} attachment${uploaded.length === 1 ? "" : "s"} uploaded.`, "success");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = normalizeOperationValues(definition, form);
    const validation = validateOperationValues(definition, values);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError("");
    const animalName = (id: string) => {
      const animal = animals.find((item) => item.id === id);
      return animal ? `${animal.name || animal.animalId} (#${animal.animalId})` : id;
    };
    const staffName = (id: string) => staff.find((item) => item.uid === id)?.fullName || (record?.assignedTo === id ? record.assignedToName : undefined) || id;
    definition.fields.forEach((field) => {
      const id = String(values[field.key] || "");
      if (id && field.type === "animal") values[`${field.key}Label`] = animalName(id);
      if (id && field.type === "staff") values[`${field.key}Label`] = staffName(id);
    });
    const core = operationCoreFields(definition, values, animalName, staffName);
    try {
      if (record) {
        await updateFarmOperation(record.id, {
          ...core,
          values,
          attachments,
          reviewStatus: definition.approvalRequired ? "pending" : record.reviewStatus,
        });
        showToast(`${definition.singular} updated.`, "success");
      } else {
        await createFarmOperation({
          module: definition.module,
          reference: makeOperationReference(definition),
          ...core,
          values,
          attachments,
          reviewStatus: definition.approvalRequired ? "pending" : "not-required",
        });
        showToast(`${definition.singular} recorded.`, "success");
      }
      onSaved();
    } catch (cause) {
      setError(friendlyError(cause));
      setSaving(false);
    }
  };

  const groups = useMemo(() => {
    const result: Array<{ name: string; fields: OperationFieldDefinition[] }> = [];
    for (const field of definition.fields) {
      const name = field.section || "Record details";
      const group = result.find((item) => item.name === name);
      if (group) group.fields.push(field);
      else result.push({ name, fields: [field] });
    }
    return result;
  }, [definition]);

  const renderField = (field: OperationFieldDefinition) => {
    const readOnly = CALCULATED_FIELDS.has(field.key);
    const disabled = staffProgressOnly && !field.staffEditable;
    const current = readOnly ? normalized[field.key] : form[field.key];
    if (field.type === "checkbox") {
      return (
        <label className={cn("operation-check-field", disabled && "disabled")} key={field.key}>
          <input type="checkbox" checked={Boolean(current)} onChange={(event) => setValue(field.key, event.target.checked)} disabled={disabled} />
          <span><i>{current ? <Check size={14} /> : null}</i><strong>{field.label}</strong><small>{field.hint || "Mark when completed"}</small></span>
        </label>
      );
    }
    return (
      <label className={cn("field", field.type === "textarea" && "field-full")} key={field.key}>
        <span>{field.label}{field.required ? " *" : ""}{field.unit ? ` (${field.unit})` : ""}</span>
        {field.type === "select" ? (
          <select value={inputValue(current)} onChange={(event) => setValue(field.key, event.target.value)} required={field.required} disabled={disabled || readOnly}>
            {!field.required && <option value="">Select…</option>}
            {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : field.type === "animal" ? (
          <select value={inputValue(current)} onChange={(event) => setValue(field.key, event.target.value)} required={field.required} disabled={disabled}>
            <option value="">{field.required ? "Select animal…" : "None / not applicable"}</option>
            {animals.filter((animal) => animal.status === "active" || animal.id === current).map((animal) => (
              <option key={animal.id} value={animal.id}>{animal.name || animal.animalId} · #{animal.animalId} · {animal.animalType}</option>
            ))}
          </select>
        ) : field.type === "staff" ? (
          <select value={inputValue(current)} onChange={(event) => setValue(field.key, event.target.value)} required={field.required} disabled={disabled}>
            <option value="">Select staff member…</option>
            {staff.filter((member) => member.status === "active" && ["staff", "admin"].includes(member.role)).map((member) => (
              <option key={member.uid} value={member.uid}>{member.fullName}{member.title ? ` · ${member.title}` : ""}</option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <textarea rows={3} value={inputValue(current)} onChange={(event) => setValue(field.key, event.target.value)} required={field.required} placeholder={field.placeholder} disabled={disabled} />
        ) : (
          <input
            type={field.type}
            value={inputValue(current)}
            onChange={(event) => setValue(field.key, event.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            min={field.min}
            step={field.step}
            readOnly={readOnly}
            disabled={disabled}
          />
        )}
        {field.hint && <small>{field.hint}</small>}
      </label>
    );
  };

  return (
    <form onSubmit={submit} className="operation-record-form">
      {staffProgressOnly && (
        <div className="operation-role-note"><ShieldCheck size={17} /><span>You can update progress and completion evidence. Assignment details are controlled by an administrator.</span></div>
      )}
      {groups.map((group) => (
        <fieldset className="operation-form-section" key={group.name}>
          <legend>{group.name}</legend>
          <div className="form-grid">{group.fields.map(renderField)}</div>
        </fieldset>
      ))}

      <fieldset className="operation-form-section">
        <legend>Photos & supporting documents</legend>
        <p className="operation-form-hint">Attach receipts, veterinary records, evidence photos, invoices or certificates. Up to 8 files, 25 MB each.</p>
        {attachments.length > 0 && (
          <div className="operation-attachment-list">
            {attachments.map((attachment, index) => (
              <article key={`${attachment.publicId}-${index}`}>
                <span>{attachment.resourceType === "image" ? <ImageIcon size={17} /> : <FileText size={17} />}</span>
                <div><strong>{attachment.name}</strong><small>{attachment.resourceType}</small></div>
                <button type="button" className="icon-button icon-button-small" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${attachment.name}`}><X size={14} /></button>
              </article>
            ))}
          </div>
        )}
        <label className="button button-secondary file-button operation-upload-button">
          <UploadCloud size={17} /> {uploading ? `Uploading ${uploadProgress}%` : "Add photos or documents"}
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(event) => uploadFiles(event.target.files)} disabled={uploading} />
        </label>
      </fieldset>

      {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}
      <div className="modal-actions">
        <button type="button" className="button button-ghost" onClick={onClose}>Cancel</button>
        <button className="button button-primary" disabled={saving || uploading}>{saving ? <><i className="button-spinner" /> Saving…</> : record ? "Save changes" : `Record ${definition.singular}`}</button>
      </div>
      <small className="operation-form-audit">Your name and the exact save time are added automatically to the audit trail.</small>
    </form>
  );
}

function RecordDetail({
  definition,
  record,
  isAdmin,
  canEdit,
  relatedRecords,
  history,
  onClose,
  onEdit,
  onArchived,
}: {
  definition: FarmModuleDefinition;
  record: FarmOperationRecord;
  isAdmin: boolean;
  canEdit: boolean;
  relatedRecords: FarmOperationRecord[];
  history: AuditEvent[];
  onClose: () => void;
  onEdit: () => void;
  onArchived: () => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [working, setWorking] = useState(false);
  const attention = operationAttention(record);
  const groups = definition.fields.reduce<Array<{ name: string; fields: OperationFieldDefinition[] }>>((result, field) => {
    const name = field.section || "Record details";
    const current = result.find((group) => group.name === name);
    if (current) current.fields.push(field);
    else result.push({ name, fields: [field] });
    return result;
  }, []);

  const review = async (decision: "approved" | "rejected") => {
    const note = window.prompt(decision === "approved" ? "Optional approval note" : "What needs to be corrected?", "");
    if (note == null) return;
    setWorking(true);
    try {
      await reviewFarmOperation(record.id, decision, note.trim());
      showToast(decision === "approved" ? "Record approved." : "Record returned for correction.", "success");
      onClose();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
      setWorking(false);
    }
  };

  const archive = async () => {
    if (!window.confirm(`Archive ${record.reference}? It will remain in the audit trail.`)) return;
    setWorking(true);
    try {
      await archiveFarmOperation(record.id);
      showToast("Record archived.", "success");
      onArchived();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
      setWorking(false);
    }
  };

  return (
    <div className="operation-detail">
      <div className="operation-detail-banner">
        <div><span className="eyebrow">{definition.label}</span><h3>{record.title}</h3><p>{record.reference} · {formatDisplayDate(record.date)}</p></div>
        <span className={cn("attention-pill", `tone-${attention.tone}`)}>{attention.label}</span>
      </div>
      {groups.map((group) => (
        <section key={group.name} className="operation-detail-section">
          <h4>{group.name}</h4>
          <div className="detail-grid">
            {group.fields.map((field) => (
              <div className="detail-item" key={field.key}><small>{field.label}</small><strong>{displayRecordField(record, field)}</strong></div>
            ))}
          </div>
        </section>
      ))}

      {record.attachments?.length ? (
        <section className="operation-detail-section">
          <h4>Photos & supporting documents</h4>
          <div className="operation-detail-files">
            {record.attachments.map((attachment, index) => attachment.resourceType === "image" ? (
              <a href={attachment.url} target="_blank" rel="noreferrer" key={`${attachment.publicId}-${index}`} className="operation-detail-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachment.url} alt={attachment.name} /><span>{attachment.name}</span>
              </a>
            ) : (
              <a href={attachment.url} target="_blank" rel="noreferrer" key={`${attachment.publicId}-${index}`} className="operation-detail-file"><FileText size={19} /><span><strong>{attachment.name}</strong><small>Open document</small></span></a>
            ))}
          </div>
        </section>
      ) : null}

      {relatedRecords.length > 0 && (
        <section className="operation-detail-section">
          <h4>{record.module === "equipment" ? "Maintenance & repair history" : "Related records"}</h4>
          <div className="animal-history-timeline">
            {relatedRecords.map((related) => <article key={related.id}><span><ClipboardCheck size={16} /></span><div><small>{formatDisplayDate(related.date)} · {related.reference}</small><strong>{related.title}</strong><p>{related.summary || related.status}</p></div><em>{related.createdByName}</em></article>)}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="operation-detail-section">
          <h4>Update history</h4>
          <div className="animal-history-timeline">
            {history.map((event) => <article key={event.id}><span><ShieldCheck size={16} /></span><div><small>{formatDate(event.createdAt, true)} · {event.action.replace(/-/g, " ")}</small><strong>{event.description}</strong><p>Who: {event.createdByName}</p></div></article>)}
          </div>
        </section>
      )}

      {record.reviewStatus !== "not-required" && (
        <section className="operation-review-card">
          <ShieldCheck size={21} />
          <div><small>Management review</small><strong>{record.reviewStatus}</strong>{record.reviewedByName && <p>{record.reviewedByName} · {formatDate(record.reviewedAt, true)}</p>}{record.reviewNote && <p>{record.reviewNote}</p>}</div>
          {isAdmin && record.reviewStatus === "pending" && <div className="operation-review-actions"><button className="button button-primary button-small" disabled={working} onClick={() => review("approved")}><Check size={14} /> Approve</button><button className="button button-secondary button-small" disabled={working} onClick={() => review("rejected")}><X size={14} /> Return</button></div>}
        </section>
      )}

      <section className="operation-record-meta">
        <div><UserRound size={16} /><span><small>Recorded by</small><strong>{record.createdByName || "Team member"}</strong><em>{formatDate(record.createdAt, true)}</em></span></div>
        <div><Pencil size={16} /><span><small>Last updated by</small><strong>{record.updatedByName || record.createdByName}</strong><em>{formatDate(record.updatedAt, true)}</em></span></div>
      </section>
      <div className="operation-detail-actions">
        <button className="button button-primary" onClick={() => printOperationRecord(record, definition, user?.fullName, history)}><Download size={16} /> Export PDF</button>
        {canEdit && <button className="button button-secondary" onClick={onEdit}><Pencil size={16} /> Edit record</button>}
        {isAdmin && <button className="button button-ghost" disabled={working} onClick={archive}><Archive size={16} /> Archive</button>}
        <button className="button button-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function OperationWorkspace({ module }: { module: FarmModule }) {
  const definition = FARM_MODULES[module];
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<FarmOperationRecord[]>([]);
  const [allOperations, setAllOperations] = useState<FarmOperationRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FarmOperationRecord | null>(null);
  const [viewing, setViewing] = useState<FarmOperationRecord | null>(null);
  const [prefillAnimalId, setPrefillAnimalId] = useState("");

  useEffect(() => {
    const stopRecords = watchFarmOperations(null, (list) => {
      setAllOperations(list);
      setRecords(list.filter((record) => record.module === module));
      setLoading(false);
    });
    const stopAnimals = watchAnimals(setAnimals);
    const stopAudit = watchAuditTrail(setAuditEvents, 1000);
    getUsers().then(setStaff).catch(() => setStaff([]));
    return () => { stopRecords(); stopAnimals(); stopAudit(); };
  }, [module]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const animalId = new URLSearchParams(window.location.search).get("animal");
    if (!animalId || !definition.animalField) return;
    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;
      setPrefillAnimalId(animalId);
      setShowForm(true);
    });
    return () => { cancelled = true; };
  }, [definition.animalField]);

  const relevantRecords = useMemo(() => {
    if (module !== "task" || isAdmin) return records;
    return records.filter((record) => record.assignedTo === user?.uid || record.createdBy === user?.uid);
  }, [records, module, isAdmin, user?.uid]);

  const statuses = useMemo(() => Array.from(new Set(relevantRecords.map((record) => record.status))).filter(Boolean), [relevantRecords]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return relevantRecords.filter((record) => {
      if (status !== "all" && record.status !== status) return false;
      if (!term) return true;
      return [record.reference, record.title, record.summary, record.createdByName, JSON.stringify(record.values)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [relevantRecords, search, status]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const attentionCount = relevantRecords.filter((record) => ["critical", "warning"].includes(operationAttention(record).tone)).length;
  const pendingReview = relevantRecords.filter((record) => record.reviewStatus === "pending").length;
  const monthCount = relevantRecords.filter((record) => record.date?.startsWith(thisMonth)).length;
  const numericTotal = definition.module === "expense"
    ? relevantRecords.reduce((sum, record) => sum + Number(record.values.amount || 0), 0)
    : definition.module === "milk"
      ? relevantRecords.filter((record) => record.date?.startsWith(thisMonth)).reduce((sum, record) => sum + Number(record.values.totalProduction || 0), 0)
      : definition.module === "eggs"
        ? relevantRecords.filter((record) => record.date?.startsWith(thisMonth)).reduce((sum, record) => sum + Number(record.values.eggsCollected || 0), 0)
        : null;

  const canEditRecord = (record: FarmOperationRecord) => {
    if (isAdmin) return true;
    if (definition.adminCreatesOnly) return record.assignedTo === user?.uid;
    return true;
  };

  const relatedTo = (record: FarmOperationRecord) => {
    const assetNumber = String(record.values.assetNumber || "");
    const equipmentName = String(record.values.equipmentName || "").toLowerCase();
    return allOperations.filter((candidate) => {
      if (candidate.id === record.id) return false;
      if (["equipment", "maintenance"].includes(record.module) && ["equipment", "maintenance"].includes(candidate.module)) {
        return Boolean((assetNumber && candidate.values.assetNumber === assetNumber) || (equipmentName && String(candidate.values.equipmentName || "").toLowerCase() === equipmentName));
      }
      return Boolean(record.animalId && (candidate.animalId === record.animalId || candidate.relatedAnimalIds?.includes(record.animalId)));
    }).slice(0, 20);
  };

  const metricLabel = definition.module === "expense" ? "Total recorded" : definition.module === "milk" ? "Litres this month" : "Eggs this month";
  const metricValue = definition.module === "expense" ? money(numericTotal) : numericTotal?.toLocaleString("en-SZ");

  return (
    <div className="dashboard-stack operation-workspace">
      <section className="operation-page-hero">
        <div><span className="eyebrow">Farm operations</span><h2>{definition.label}</h2><p>{definition.description}</p></div>
        {(!definition.adminCreatesOnly || isAdmin) && <button className={cn("button button-primary", module === "incident" && "incident-report-button")} onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={18} /> {module === "incident" ? "Report a problem" : `Add ${definition.singular}`}</button>}
      </section>

      <section className="operation-stat-grid">
        <article><span><ClipboardCheck size={20} /></span><div><small>Total records</small><strong>{relevantRecords.length}</strong></div></article>
        <article className={attentionCount ? "warning" : ""}><span><AlertTriangle size={20} /></span><div><small>Needs attention</small><strong>{attentionCount}</strong></div></article>
        <article><span><CalendarDays size={20} /></span><div><small>This month</small><strong>{monthCount}</strong></div></article>
        {numericTotal != null ? <article><span><PackageOpen size={20} /></span><div><small>{metricLabel}</small><strong>{metricValue}</strong></div></article> : <article className={pendingReview ? "warning" : ""}><span><ShieldCheck size={20} /></span><div><small>Pending review</small><strong>{pendingReview}</strong></div></article>}
      </section>

      <section className="dashboard-panel operation-list-panel">
        <div className="operation-toolbar">
          <div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${definition.label.toLowerCase()}…`} aria-label={`Search ${definition.label}`} /></div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item.replace(/-/g, " ")}</option>)}</select>
        </div>

        {loading ? <Loading label={`Loading ${definition.label.toLowerCase()}…`} /> : visible.length ? (
          <div className="operation-record-list">
            {visible.map((record) => {
              const attention = operationAttention(record);
              return (
                <article key={record.id} className={cn("operation-record-row", `tone-border-${attention.tone}`)}>
                  <button className="operation-record-main" onClick={() => setViewing(record)}>
                    <span className={cn("operation-record-mark", `tone-${attention.tone}`)}>{record.priority === "critical" ? <AlertTriangle size={18} /> : <ClipboardCheck size={18} />}</span>
                    <span className="operation-record-copy"><small>{record.reference} · {formatDisplayDate(record.date)}</small><strong>{record.title}</strong><em>{record.summary || `${definition.singular} recorded`}</em></span>
                    <span className="operation-record-status"><i className={cn("attention-pill", `tone-${attention.tone}`)}>{attention.label}</i><small>{record.status.replace(/-/g, " ")}</small></span>
                    <span className="operation-record-author"><small>Recorded by</small><strong>{record.createdBy === user?.uid ? "You" : firstName(record.createdByName)}</strong><em>{formatDate(record.createdAt, true)}</em></span>
                    <ChevronRight size={18} />
                  </button>
                  <div className="operation-row-actions"><button className="icon-button icon-button-small" onClick={() => setViewing(record)} title="View"><Eye size={15} /></button>{canEditRecord(record) && <button className="icon-button icon-button-small" onClick={() => { setEditing(record); setShowForm(true); }} title="Edit"><Pencil size={15} /></button>}<button className="icon-button icon-button-small" onClick={() => printOperationRecord(record, definition, user?.fullName, auditEvents.filter((event) => event.entityId === record.id))} title="Export PDF"><Download size={15} /></button></div>
                </article>
              );
            })}
          </div>
        ) : relevantRecords.length ? (
          <EmptyState icon={Search} title="No matching records" description="Try a different search or status filter." />
        ) : (
          <EmptyState icon={definition.module === "incident" ? AlertTriangle : ClipboardCheck} title={definition.emptyTitle} description={definition.emptyDescription} action={(!definition.adminCreatesOnly || isAdmin) ? <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Add record</button> : undefined} />
        )}
      </section>

      <div className="operation-accountability-note"><ShieldCheck size={18} /><div><strong>Accountable by design</strong><p>Every record stores who created it, when it was created, who last changed it and the exact update time. Audit events cannot be edited or deleted.</p></div></div>

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} aria-label="Close form" />
          <div className="record-modal operation-modal" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">{editing ? "Update record" : "New farm record"}</span><h2>{editing ? `Edit ${editing.reference}` : `Add ${definition.singular}`}</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={20} /></button></header>
            <RecordForm definition={definition} record={editing} animals={animals} staff={staff} isAdmin={isAdmin} initialAnimalId={prefillAnimalId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setEditing(null); }} />
          </div>
        </div>
      )}

      {viewing && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setViewing(null)} aria-label="Close detail" />
          <div className="record-modal operation-detail-modal" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">View record</span><h2>{viewing.reference}</h2></div><button className="icon-button" onClick={() => setViewing(null)}><X size={20} /></button></header>
            <RecordDetail definition={definition} record={viewing} isAdmin={isAdmin} canEdit={canEditRecord(viewing)} relatedRecords={relatedTo(viewing)} history={auditEvents.filter((event) => event.entityId === viewing.id)} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true); }} onArchived={() => setViewing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
