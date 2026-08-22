"use client";

import {
  BarChart3,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActivities,
  getAnimals,
  getAuditTrail,
  getFarmOperations,
  getHealthRecords,
} from "@/lib/firebase/data";
import { printFarmReport, type ReportColumn, type ReportRow } from "@/lib/farmReports";
import { FARM_MODULES, formatOperationValue } from "@/lib/farmModules";
import { formatDate, formatDisplayDate, money, toDate } from "@/lib/utils";
import type { ActivityRecord, Animal, AuditEvent, FarmModule, FarmOperationRecord, HealthRecord } from "@/types";

type ReportKind =
  | "animal" | "health" | "vaccination" | "breeding" | "birth" | "purchase"
  | "sales" | "feed" | "inventory" | "milk" | "eggs" | "expense" | "equipment"
  | "maintenance" | "staff-activity" | "incident" | "daily" | "task" | "monthly" | "custom";

interface ReportOption { value: ReportKind; label: string; description: string; }

const REPORTS: ReportOption[] = [
  { value: "animal", label: "Animal Report", description: "Permanent livestock register and current status" },
  { value: "health", label: "Health Report", description: "Treatments, observations and veterinary records" },
  { value: "vaccination", label: "Vaccination Report", description: "Vaccines given, upcoming and overdue dates" },
  { value: "breeding", label: "Breeding Report", description: "Mating, pregnancy, outcomes and offspring" },
  { value: "birth", label: "Birth Report", description: "Newborn registrations and parent links" },
  { value: "purchase", label: "Purchase Report", description: "Purchased and transferred-in animals" },
  { value: "sales", label: "Sales & Transfer Report", description: "Animals sold, transferred or deceased" },
  { value: "feed", label: "Feed Report", description: "Feed received, used, wasted and remaining" },
  { value: "inventory", label: "Inventory Report", description: "Farm stock movements and low items" },
  { value: "milk", label: "Milk Production Report", description: "Yield, waste, sales and remaining milk" },
  { value: "eggs", label: "Egg Production Report", description: "Collection, quality, sales and remaining eggs" },
  { value: "expense", label: "Expense Report", description: "Operational costs and approval status" },
  { value: "equipment", label: "Equipment Report", description: "Asset register, condition and location" },
  { value: "maintenance", label: "Maintenance Report", description: "Outstanding and completed repairs" },
  { value: "task", label: "Task Report", description: "Assigned, overdue and completed work" },
  { value: "staff-activity", label: "Staff Activity Report", description: "Who recorded or changed each item" },
  { value: "incident", label: "Incident / Problem Report", description: "Open, critical and resolved farm problems" },
  { value: "daily", label: "Daily Farm Report", description: "Daily logs and operational observations" },
  { value: "monthly", label: "Monthly Farm Report", description: "Management summary across every module" },
  { value: "custom", label: "Custom Report", description: "All records within your chosen date range" },
];

interface Dataset { title: string; subtitle: string; columns: ReportColumn[]; rows: ReportRow[]; totals: Array<{ label: string; value: string }>; }

const MODULE_BY_REPORT: Partial<Record<ReportKind, FarmModule>> = {
  breeding: "breeding", birth: "birth", purchase: "acquisition", sales: "movement",
  feed: "feed", inventory: "inventory", milk: "milk", eggs: "eggs", expense: "expense",
  equipment: "equipment", maintenance: "maintenance", incident: "incident", daily: "daily-log", task: "task",
};

function inRange(value: string | undefined, from: string, to: string) {
  if (!value) return false;
  return value >= from && value <= to;
}

function operationRows(records: FarmOperationRecord[]): ReportRow[] {
  return records.map((record) => {
    const definition = FARM_MODULES[record.module];
    const details = definition.fields
      .map((field) => {
        const raw = ["animal", "staff"].includes(field.type) ? record.values[`${field.key}Label`] || record.values[field.key] : record.values[field.key];
        return raw == null || raw === "" ? "" : `${field.label}: ${formatOperationValue(field, raw)}`;
      })
      .filter(Boolean)
      .join(" · ");
    return {
      date: formatDisplayDate(record.date),
      reference: record.reference,
      record: record.title,
      details: details || record.summary || "—",
      status: record.status.replace(/-/g, " "),
      review: record.reviewStatus.replace(/-/g, " "),
      staff: record.createdByName,
    };
  });
}

function buildDataset(options: {
  kind: ReportKind;
  report: ReportOption;
  animals: Animal[];
  health: HealthRecord[];
  operations: FarmOperationRecord[];
  activities: ActivityRecord[];
  audit: AuditEvent[];
  from: string;
  to: string;
}): Dataset {
  const { kind, report, from, to } = options;
  const standardColumns: ReportColumn[] = [
    { key: "date", label: "Date" }, { key: "reference", label: "Reference" },
    { key: "record", label: "Record" }, { key: "details", label: "Details" },
    { key: "status", label: "Status" }, { key: "review", label: "Review" }, { key: "staff", label: "Recorded by" },
  ];
  const farmModule = MODULE_BY_REPORT[kind];
  if (farmModule) {
    const records = options.operations.filter((item) => item.module === farmModule && inRange(item.date, from, to));
    const rows = operationRows(records);
    let totalValue = "—";
    let totalLabel = "Records";
    if (farmModule === "expense") { totalLabel = "Total expenses"; totalValue = money(records.reduce((sum, item) => sum + Number(item.values.amount || 0), 0)); }
    if (farmModule === "milk") { totalLabel = "Total production"; totalValue = `${records.reduce((sum, item) => sum + Number(item.values.totalProduction || 0), 0).toLocaleString("en-SZ")} L`; }
    if (farmModule === "eggs") { totalLabel = "Eggs collected"; totalValue = records.reduce((sum, item) => sum + Number(item.values.eggsCollected || 0), 0).toLocaleString("en-SZ"); }
    if (["feed", "inventory"].includes(farmModule)) { totalLabel = "Low-stock records"; totalValue = String(records.filter((item) => item.status === "low").length); }
    return {
      title: report.label,
      subtitle: report.description,
      columns: standardColumns,
      rows,
      totals: [
        { label: "Records in period", value: String(rows.length) },
        { label: totalLabel, value: totalValue === "—" ? String(rows.length) : totalValue },
        { label: "Awaiting review", value: String(records.filter((item) => item.reviewStatus === "pending").length) },
      ],
    };
  }
  if (kind === "animal") {
    const animals = options.animals.filter((animal) => {
      const created = toDate(animal.createdAt)?.toISOString().slice(0, 10);
      return !created || inRange(created, from, to);
    });
    return {
      title: report.label,
      subtitle: report.description,
      columns: [
        { key: "id", label: "Animal ID" }, { key: "type", label: "Type" }, { key: "name", label: "Name / tag" },
        { key: "breed", label: "Breed" }, { key: "sex", label: "Sex" }, { key: "weight", label: "Weight" },
        { key: "location", label: "Location" }, { key: "status", label: "Status" }, { key: "staff", label: "Recorded by" },
      ],
      rows: animals.map((animal) => ({ id: animal.animalId, type: animal.animalType, name: animal.name || animal.tagNumber || "—", breed: animal.breed, sex: animal.sex, weight: animal.weight != null ? `${animal.weight} kg` : "—", location: animal.location, status: `${animal.status} / ${animal.healthStatus}`, staff: animal.createdByName })),
      totals: [
        { label: "Animals", value: String(animals.length) },
        { label: "Active", value: String(animals.filter((animal) => animal.status === "active").length) },
        { label: "Need attention", value: String(animals.filter((animal) => ["sick", "injured", "under-observation"].includes(animal.healthStatus)).length) },
      ],
    };
  }
  if (kind === "health" || kind === "vaccination") {
    const records = options.health.filter((item) => inRange(item.date, from, to) && (kind !== "vaccination" || item.type === "vaccination"));
    return {
      title: report.label, subtitle: report.description,
      columns: [{ key: "date", label: "Date" }, { key: "animal", label: "Animal" }, { key: "type", label: "Type" }, { key: "record", label: "Reason / observation" }, { key: "medicine", label: "Treatment / vaccine" }, { key: "next", label: "Next date" }, { key: "staff", label: "Recorded by" }],
      rows: records.map((item) => ({ date: formatDisplayDate(item.date), animal: item.animalLabel || item.animalId, type: item.type, record: item.problem, medicine: item.vaccineName || item.medication || item.treatment || item.actionTaken || "—", next: formatDisplayDate(item.nextDate), staff: item.createdByName })),
      totals: [{ label: "Records", value: String(records.length) }, { label: "Follow-ups due", value: String(records.filter((item) => item.nextDate && item.nextDate <= to).length) }, { label: "Veterinary visits", value: String(records.filter((item) => item.veterinaryVisit).length) }],
    };
  }
  if (kind === "staff-activity") {
    const events = options.audit.filter((event) => {
      const date = toDate(event.createdAt)?.toISOString().slice(0, 10);
      return Boolean(date && inRange(date, from, to));
    });
    return {
      title: report.label, subtitle: report.description,
      columns: [{ key: "date", label: "Date / time" }, { key: "staff", label: "Staff member" }, { key: "action", label: "Action" }, { key: "record", label: "Record" }, { key: "details", label: "Details" }],
      rows: events.map((event) => ({ date: formatDate(event.createdAt, true), staff: event.createdByName, action: event.action, record: event.entityLabel, details: event.description })),
      totals: [{ label: "Audit events", value: String(events.length) }, { label: "Staff active", value: String(new Set(events.map((event) => event.createdBy)).size) }, { label: "Records created", value: String(events.filter((event) => event.action === "created").length) }],
    };
  }
  const operationRecords = options.operations.filter((item) => inRange(item.date, from, to));
  const legacyActivities = options.activities.filter((item) => inRange(item.date, from, to));
  const rows: ReportRow[] = [
    ...operationRows(operationRecords),
    ...legacyActivities.map((item) => ({ date: formatDisplayDate(item.date), reference: `ACT-${item.id.slice(0, 6).toUpperCase()}`, record: item.activity, details: item.notes, status: "recorded", review: "not required", staff: item.createdByName })),
  ];
  return {
    title: report.label, subtitle: report.description, columns: standardColumns, rows,
    totals: [
      { label: "Operational records", value: String(operationRecords.length) },
      { label: "Daily activities", value: String(legacyActivities.length) },
      { label: "Open incidents", value: String(operationRecords.filter((item) => item.module === "incident" && item.status !== "resolved").length) },
      { label: "Pending tasks", value: String(operationRecords.filter((item) => item.module === "task" && !["completed", "cancelled"].includes(item.status)).length) },
    ],
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const first = `${today.slice(0, 7)}-01`;
  const [kind, setKind] = useState<ReportKind>("monthly");
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(today);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [operations, setOperations] = useState<FarmOperationRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(true);

  useEffect(() => {
    Promise.all([getAnimals(), getHealthRecords(), getFarmOperations(), getActivities(), getAuditTrail(2000)])
      .then(([animalList, healthList, operationList, activityList, auditList]) => {
        setAnimals(animalList); setHealth(healthList); setOperations(operationList); setActivities(activityList); setAudit(auditList);
      })
      .finally(() => setLoading(false));
  }, []);

  const report = REPORTS.find((item) => item.value === kind) || REPORTS[0];
  const dataset = useMemo(() => buildDataset({ kind, report, animals, health, operations, activities, audit, from, to }), [kind, report, animals, health, operations, activities, audit, from, to]);

  const exportPdf = () => printFarmReport({ ...dataset, dateFrom: from, dateTo: to, generatedBy: user?.fullName });

  return (
    <div className="dashboard-stack report-center">
      <section className="report-center-hero">
        <div><span className="eyebrow">Management oversight</span><h2>Report Center</h2><p>View every part of the farm by date range, then export a professional, branded PDF-ready report.</p></div>
        <div className="report-center-seal"><FileSpreadsheet size={26} /><span><strong>{REPORTS.length}</strong><small>report types</small></span></div>
      </section>

      <section className="dashboard-panel report-builder">
        <div className="report-builder-title"><Filter size={19} /><div><h3>Build your report</h3><p>Choose the report and period. Records always include who entered them.</p></div></div>
        <div className="report-controls">
          <label className="field"><span>Report type</span><select value={kind} onChange={(event) => { setKind(event.target.value as ReportKind); setPreview(false); }}>{REPORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="field"><span>From</span><input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPreview(false); }} /></label>
          <label className="field"><span>To</span><input type="date" value={to} min={from} onChange={(event) => { setTo(event.target.value); setPreview(false); }} /></label>
          <div className="report-control-actions"><button className="button button-secondary" onClick={() => setPreview(true)}><Eye size={16} /> View</button><button className="button button-primary" onClick={exportPdf}><Download size={16} /> Export PDF</button></div>
        </div>
        <div className="report-selection-note"><BarChart3 size={17} /><span><strong>{report.label}</strong><small>{report.description}</small></span></div>
      </section>

      {loading ? <Loading label="Preparing farm reports…" /> : (
        <>
          <section className="report-summary-grid">
            {dataset.totals.map((item) => <article key={item.label}><small>{item.label}</small><strong>{item.value}</strong></article>)}
          </section>
          {preview && (
            <section className="dashboard-panel report-preview">
              <div className="section-row"><div><span className="eyebrow">On-screen view</span><h2>{dataset.title}</h2><p>{formatDisplayDate(from)} – {formatDisplayDate(to)} · {dataset.rows.length} record{dataset.rows.length === 1 ? "" : "s"}</p></div><button className="button button-primary button-small" onClick={exportPdf}><Download size={15} /> Export PDF</button></div>
              <div className="report-table-wrap"><table><thead><tr>{dataset.columns.map((column) => <th key={column.key} className={column.align === "right" ? "num" : ""}>{column.label}</th>)}</tr></thead><tbody>{dataset.rows.slice(0, 100).map((row, index) => <tr key={index}>{dataset.columns.map((column) => <td key={column.key} className={column.align === "right" ? "num" : ""}>{String(row[column.key] ?? "—")}</td>)}</tr>)}{dataset.rows.length === 0 && <tr><td colSpan={dataset.columns.length}>No records in this period.</td></tr>}</tbody></table></div>
              {dataset.rows.length > 100 && <p className="report-limit-note">Showing the first 100 records on screen. The exported report contains the selected dataset.</p>}
            </section>
          )}
        </>
      )}

      <div className="operation-accountability-note"><ShieldCheck size={18} /><div><strong>Professional records, not database printouts</strong><p>Exports include The Branch Farm logo, report reference, generation date, full record details, staff attribution and signature / approval areas.</p></div></div>
    </div>
  );
}
