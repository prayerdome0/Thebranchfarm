"use client";

import { CircleAlert, KeyRound, Plus, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { STATUS_LABELS } from "@/lib/constants";
import { createStaffAccount, getUsers, setUserRole, setUserStatus } from "@/lib/firebase/data";
import { staffSchema } from "@/lib/validation";
import { cn, formatDate, friendlyError, initials } from "@/lib/utils";
import type { AppRole, UserProfile } from "@/types";

function RolePill({ role }: { role: AppRole }) {
  return <span className={cn("role-pill", `role-${role}`)}>{STATUS_LABELS[role] || role}</span>;
}

export default function StaffPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", title: "", role: "staff" });

  const load = () => {
    getUsers().then((list) => {
      setMembers(list);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = staffSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the information.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createStaffAccount({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        title: parsed.data.title,
        role: parsed.data.role,
      });
      setTempPassword(result.tempPassword);
      setForm({ fullName: "", email: "", phone: "", title: "", role: "staff" });
      setShowForm(false);
      showToast("Staff account created.", "success");
      load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member: UserProfile, role: AppRole) => {
    if (!window.confirm(`Change ${member.fullName}'s role to ${role}?`)) return;
    try {
      await setUserRole(member.uid, role);
      showToast("Role updated.", "success");
      load();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  const toggleStatus = async (member: UserProfile) => {
    const next = member.status === "active" ? "disabled" : "active";
    if (!window.confirm(`${next === "disabled" ? "Disable" : "Enable"} ${member.fullName}'s account?`)) return;
    try {
      await setUserStatus(member.uid, next);
      showToast(`Account ${next === "disabled" ? "disabled" : "enabled"}.`, "success");
      load();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="dashboard-stack">
        <section className="dashboard-section-title">
          <div>
            <h2>Staff</h2>
            <p>Manage who has access to the farm records, and their role.</p>
          </div>
          <button className="button button-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add staff member
          </button>
        </section>

        {tempPassword && (
          <div className="secret-notice">
            <div className="section-row">
              <div>
                <strong>{tempPassword}</strong>
                <p>
                  This temporary password is shown once. Share it securely — the new member will
                  sign in at /login and should change it.
                </p>
              </div>
              <button className="icon-button" onClick={() => setTempPassword(null)} aria-label="Dismiss">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <section className="dashboard-panel people-panel">
          {loading ? (
            <Loading label="Loading staff…" />
          ) : members.length ? (
            <div className="people-table">
              <div className="table-head">
                <span>Name</span>
                <span>Phone</span>
                <span>Role</span>
                <span>Status</span>
                <span>Added</span>
                <span>Actions</span>
              </div>
              {members.map((member) => {
                const isSelf = member.uid === user?.uid;
                return (
                  <article key={member.uid}>
                    <span className="person-cell">
                      <i>{initials(member.fullName)}</i>
                      <span>
                        <strong>{member.fullName}</strong>
                        <small>{member.email}</small>
                      </span>
                    </span>
                    <span>{member.phone || "—"}</span>
                    <span>
                      <RolePill role={member.role} />
                    </span>
                    <span className={cn("account-status", member.status === "disabled" && "disabled")}>
                      <i /> {member.status}
                    </span>
                    <span>{formatDate(member.createdAt)}</span>
                    <span className="person-actions">
                      <select
                        value={member.role}
                        disabled={isSelf}
                        onChange={(event) => changeRole(member, event.target.value as AppRole)}
                        aria-label={`Role for ${member.fullName}`}
                      >
                        <option value="user">Pending</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="button button-ghost button-small"
                        disabled={isSelf}
                        onClick={() => toggleStatus(member)}
                      >
                        {member.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="No accounts yet"
              description="Add staff members or promote registered accounts to staff."
              action={
                <button className="button button-primary" onClick={() => setShowForm(true)}>
                  <Plus size={18} /> Add staff member
                </button>
              }
            />
          )}
        </section>

        <div className="roles-security-note">
          <KeyRound size={20} />
          <div>
            <strong>Roles and access</strong>
            <p>
              Admins can add, edit and delete animals, manage staff and documents, and see
              everything. Staff can view animals, add observations and health records, upload files
              and update assigned records.
            </p>
          </div>
        </div>

        {showForm && (
          <div className="modal-layer">
            <button className="modal-scrim" onClick={() => setShowForm(false)} aria-label="Close form" />
            <div className="record-modal small-modal" role="dialog" aria-modal="true">
              <header>
                <div>
                  <span className="eyebrow">Staff management</span>
                  <h2>Add staff member</h2>
                </div>
                <button className="icon-button" onClick={() => setShowForm(false)}>
                  <X size={20} />
                </button>
              </header>
              <form onSubmit={addMember} className="dashboard-stack">
                <div className="form-grid">
                  <label className="field field-full">
                    <span>Full name *</span>
                    <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Email *</span>
                    <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Phone *</span>
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Title</span>
                    <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Herd manager" />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select value={form.role} onChange={(e) => update("role", e.target.value)}>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
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
                        <i className="button-spinner" /> Creating…
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
