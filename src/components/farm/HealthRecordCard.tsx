"use client";

import { CalendarDays, CheckCircle2, Clock3, FileText, Pencil, Trash2, TriangleAlert, UserRound } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDisplayDate } from "@/lib/utils";
import type { HealthRecord } from "@/types";

function healthAttention(record: HealthRecord) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = new Date();
  upcoming.setDate(upcoming.getDate() + 30);
  const upcomingIso = upcoming.toISOString().slice(0, 10);
  if (["sick", "injured"].includes(record.healthStatus || "")) return { label: "Attention required", tone: "danger", icon: TriangleAlert };
  if (record.nextDate && record.nextDate < today) return { label: "Attention required", tone: "danger", icon: TriangleAlert };
  if (record.nextDate && record.nextDate <= upcomingIso) return { label: "Upcoming", tone: "warning", icon: Clock3 };
  return { label: "Up to date", tone: "good", icon: CheckCircle2 };
}

export function HealthRecordCard({
  record,
  showAnimal = false,
  canDelete = false,
  onDelete,
  onEdit,
}: {
  record: HealthRecord;
  showAnimal?: boolean;
  canDelete?: boolean;
  onDelete?: (record: HealthRecord) => void;
  onEdit?: (record: HealthRecord) => void;
}) {
  const attention = healthAttention(record);
  const AttentionIcon = attention.icon;
  return (
    <article className={`health-record-card health-attention-${attention.tone}`}>
      <div className="health-record-head">
        <div>
          <small className="health-record-reference">{record.type === "vaccination" && record.vaccineName ? record.vaccineName : STATUS_LABELS[record.type] || record.type}</small>
          <h4>{String(record.problem || "Health record")}</h4>
          {showAnimal && record.animalLabel && <small style={{ color: "var(--muted)", fontSize: ".62rem" }}>{String(record.animalLabel)}</small>}
        </div>
        <div className="health-record-badges"><span className={`health-attention-badge ${attention.tone}`}><AttentionIcon size={12} /> {attention.label}</span><span className={`status-badge status-${record.type}`}>{STATUS_LABELS[record.type] || String(record.type || "other")}</span></div>
      </div>
      <div className="health-record-body">
        {(record.symptoms || record.observation) && <p><strong>Symptoms / observation:</strong> {String(record.symptoms || record.observation)}</p>}
        {record.reason && <p><strong>Reason:</strong> {String(record.reason)}</p>}
        {(record.treatment || record.actionTaken) && <p><strong>Treatment / action:</strong> {String(record.treatment || record.actionTaken)}</p>}
        {(record.medication || record.vaccineName) && <p><strong>Medication / vaccine:</strong> {String(record.vaccineName || record.medication)}{record.dosage ? ` · ${record.dosage}` : ""}</p>}
        {record.veterinaryVisit && <p><strong>Veterinary visit:</strong> {record.vetName || "Veterinarian recorded"}{record.vetContact ? ` · ${record.vetContact}` : ""}</p>}
        {record.followUp && <p><strong>Follow-up:</strong> {String(record.followUp)}</p>}
        {record.nextDate && <p><strong>Next date:</strong> {formatDisplayDate(record.nextDate)}</p>}
        {record.notes && <p><strong>Medical notes:</strong> {String(record.notes)}</p>}
      </div>
      {record.photo && <div className="health-record-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={String(record.photo)} alt={String(record.problem || "Health record")} />
      </div>}
      {record.attachments?.length ? <div className="health-supporting-files">{record.attachments.map((file, index) => <a href={file.url} target="_blank" rel="noreferrer" key={`${file.publicId}-${index}`}><FileText size={13} /> {file.name}</a>)}</div> : null}
      <div className="health-record-foot">
        <span><CalendarDays size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{formatDisplayDate(record.date)}{" · "}<UserRound size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Recorded by <strong>{record.createdByName || "Team member"}</strong>{record.updatedByName && record.updatedByName !== record.createdByName ? ` · Updated by ${record.updatedByName} ${formatDate(record.updatedAt, true)}` : ""}</span>
        {(canDelete || onEdit) && <span style={{ display: "inline-flex", gap: 8 }}>{onEdit && <button type="button" className="icon-button icon-button-small" onClick={() => onEdit(record)} title="Edit record"><Pencil size={14} /></button>}{canDelete && onDelete && <button type="button" className="icon-button icon-button-small" onClick={() => onDelete(record)} title="Delete record"><Trash2 size={14} /></button>}</span>}
      </div>
    </article>
  );
}
