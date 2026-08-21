"use client";

import { Activity as ActivityIcon, CalendarDays, CircleAlert, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { addActivity, deleteActivity, getActivities, getAnimals } from "@/lib/firebase/data";
import { activitySchema } from "@/lib/validation";
import { formatDisplayDate, friendlyError, todayIso } from "@/lib/utils";
import type { ActivityRecord, Animal } from "@/types";

export default function ActivityPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    activity: "Feeding",
    date: todayIso(),
    time: "",
    location: "",
    animalId: "",
    notes: "",
  });

  const load = () => {
    getActivities().then((list) => {
      setActivities(list);
      setLoading(false);
    });
    getAnimals().then(setAnimals);
  };
  useEffect(load, []);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = activitySchema.safeParse({
      activity: form.activity,
      date: form.date,
      time: form.time || undefined,
      location: form.location || undefined,
      notes: form.notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information.");
      return;
    }
    setSaving(true);
    try {
      await addActivity({
        activity: parsed.data.activity,
        date: parsed.data.date,
        time: parsed.data.time,
        location: parsed.data.location,
        notes: parsed.data.notes,
        animalId: form.animalId || undefined,
      });
      showToast("Activity recorded.", "success");
      setForm({ activity: "Feeding", date: todayIso(), time: "", location: "", animalId: "", notes: "" });
      setShowForm(false);
      load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: ActivityRecord) => {
    if (!window.confirm("Delete this activity record?")) return;
    try {
      await deleteActivity(record.id);
      showToast("Activity deleted.", "success");
      load();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Activity / records</h2>
          <p>Feeding, cleaning, inspections and other work — recorded with who did it and when.</p>
        </div>
        <button className="button button-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Log activity
        </button>
      </section>

      {loading ? (
        <Loading label="Loading activity…" />
      ) : activities.length ? (
        <div className="health-record-list">
          {activities.map((record) => (
            <article className="health-record-card" key={record.id}>
              <div className="health-record-head">
                <h4>{record.activity}</h4>
                <span className="status-badge status-active">{record.time || "—"}</span>
              </div>
              <div className="health-record-body">
                <p>{record.notes}</p>
                {record.location && <p><strong>Location:</strong> {record.location}</p>}
              </div>
              <div className="health-record-foot">
                <span>
                  <CalendarDays size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  {formatDisplayDate(record.date)}
                  {" · "}
                  Recorded by <strong>{record.createdByName || "Team member"}</strong>
                </span>
                {isAdmin && (
                  <button className="icon-button icon-button-small" onClick={() => remove(record)} title="Delete record">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ActivityIcon}
          title="No activity recorded yet"
          description="Log the first farm activity — feeding, cleaning, an inspection or a repair."
          action={
            <button className="button button-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Log activity
            </button>
          }
        />
      )}

      {showForm && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setShowForm(false)} aria-label="Close form" />
          <div className="record-modal small-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="eyebrow">Farm activity</span>
                <h2>Log activity</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </header>
            <form onSubmit={submit} className="dashboard-stack">
              <div className="form-grid">
                <label className="field">
                  <span>Activity *</span>
                  <select value={form.activity} onChange={(e) => update("activity", e.target.value)}>
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Date *</span>
                  <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Time</span>
                  <input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} />
                </label>
                <label className="field">
                  <span>Location</span>
                  <input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Main cattle pen" />
                </label>
                <label className="field field-full">
                  <span>Related animal (optional)</span>
                  <select value={form.animalId} onChange={(e) => update("animalId", e.target.value)}>
                    <option value="">None</option>
                    {animals.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.name || animal.animalId} (#{animal.animalId})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field-full">
                  <span>Notes *</span>
                  <textarea rows={4} value={form.notes} onChange={(e) => update("notes", e.target.value)} required />
                </label>
              </div>
              {error && (
                <div className="form-alert error">
                  <CircleAlert size={17} /> {error}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <i className="button-spinner" /> Saving…
                    </>
                  ) : (
                    "Save activity"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
