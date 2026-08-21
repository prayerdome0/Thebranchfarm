"use client";

import { CalendarDays, Pencil, Trash2, UserRound } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/utils";
import type { HealthRecord } from "@/types";

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
  return (
    <article className="health-record-card">
      <div className="health-record-head">
        <div>
          <h4>{record.problem}</h4>
          {showAnimal && record.animalLabel && (
            <small style={{ color: "var(--muted)", fontSize: ".62rem" }}>{record.animalLabel}</small>
          )}
        </div>
        <span className={`status-badge status-${record.type}`}>{STATUS_LABELS[record.type] || record.type}</span>
      </div>
      <div className="health-record-body">
        {record.observation && (
          <p><strong>Observation:</strong> {record.observation}</p>
        )}
        {record.actionTaken && (
          <p><strong>Action taken:</strong> {record.actionTaken}</p>
        )}
        {record.medication && (
          <p><strong>Medication / vaccine:</strong> {record.medication}</p>
        )}
        {record.notes && (
          <p><strong>Medical notes:</strong> {record.notes}</p>
        )}
        {record.nextDate && (
          <p><strong>Follow-up:</strong> {formatDisplayDate(record.nextDate)}</p>
        )}
      </div>
      {record.photo && (
        <div className="health-record-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={record.photo} alt={record.problem} />
        </div>
      )}
      <div className="health-record-foot">
        <span>
          <CalendarDays size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {formatDisplayDate(record.date)}
          {" · "}
          <UserRound size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Recorded by <strong>{record.createdByName || "Team member"}</strong>
        </span>
        {(canDelete || onEdit) && (
          <span style={{ display: "inline-flex", gap: 8 }}>
            {onEdit && (
              <button type="button" className="icon-button icon-button-small" onClick={() => onEdit(record)} title="Edit record">
                <Pencil size={14} />
              </button>
            )}
            {canDelete && onDelete && (
              <button type="button" className="icon-button icon-button-small" onClick={() => onDelete(record)} title="Delete record">
                <Trash2 size={14} />
              </button>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
