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
import { BUSINESS } from "@/lib/constants";

const PERMISSIONS = ["Orders", "Products", "Animals", "Customers", "Media", "Documents", "Photos", "Videos", "Gallery"] as const;

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
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", title: "", role: "staff" as "staff" | "admin", permissions: [] as string[] });

  const load = () => {
    getUsers().then((list) => { setMembers(list); setLoading(false); });
  };
  useEffect(load, []);

  const update = (key: keyof typeof form, value: string) => setForm((c) => ({ ...c, [key]: value }));

  const togglePerm = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter((p) => p !== perm) : [...f.permissions, perm],
    }));
  };

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = staffSchema.safeParse({ fullName: form.fullName, email: form.email, phone: form.phone, title: form.title, role: form.role });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Review info"); return; }
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
      setForm({ fullName: "", email: "", phone: "", title: "", role: "staff", permissions: [] });
      setShowForm(false);
      showToast(`Staff account created for ${BUSINESS.name} - permissions: ${form.permissions.join(", ") || "full for admin, custom for staff"}`, "success");
      load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member: UserProfile, role: AppRole) => {
    if (!confirm(`Change ${member.fullName}'s role to ${role}?`)) return;
    try {
      await setUserRole(member.uid, role);
      showToast("Role updated", "success");
      load();
    } catch (cause) {
      showToast(friendlyError(cause), "error");
    }
  };

  const toggleStatus = async (member: UserProfile) => {
    const next = member.status === "active" ? "disabled" : "active";
    if (!confirm(`${next === "disabled" ? "Disable" : "Enable"} ${member.fullName}?`)) return;
    try {
      await setUserStatus(member.uid, next);
      showToast(`Account ${next}`, "success");
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
            <h2>Staff Management</h2>
            <p>{BUSINESS.name} — {BUSINESS.slogan}. Admin full access. Staff can be granted access to Orders, Products, Animals, Customers, Media, Documents. Content Staff primarily Photos, Videos, Gallery. Permissions explicit.</p>
          </div>
          <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Add staff</button>
        </section>

        {tempPassword && (
          <div className="secret-notice">
            <div className="section-row">
              <div><strong>{tempPassword}</strong><p>Temporary password shown once. Share securely — sign in at /login and change it.</p></div>
              <button className="icon-button" onClick={() => setTempPassword(null)}><X size={18} /></button>
            </div>
          </div>
        )}

        <section className="dashboard-panel people-panel">
          {loading ? <Loading label="Loading staff…" /> : members.length ? (
            <div className="people-table">
              <div className="table-head"><span>Name</span><span>Phone</span><span>Role</span><span>Status</span><span>Added</span><span>Actions</span></div>
              {members.map((member) => {
                const isSelf = member.uid === user?.uid;
                return (
                  <article key={member.uid}>
                    <span className="person-cell"><i>{initials(member.fullName)}</i><span><strong>{member.fullName}</strong><small>{member.email} {member.title ? `· ${member.title}` : ""}</small></span></span>
                    <span>{member.phone || "—"}</span>
                    <span><RolePill role={member.role} /></span>
                    <span className={cn("account-status", member.status === "disabled" && "disabled")}><i /> {member.status}</span>
                    <span>{formatDate(member.createdAt)}</span>
                    <span className="person-actions">
                      <select value={member.role} disabled={isSelf} onChange={(e) => changeRole(member, e.target.value as AppRole)} aria-label={`Role for ${member.fullName}`}>
                        <option value="user">Pending</option><option value="staff">Staff</option><option value="admin">Admin</option>
                      </select>
                      <button className="button button-ghost button-small" disabled={isSelf} onClick={() => toggleStatus(member)}>{member.status === "active" ? "Disable" : "Enable"}</button>
                    </span>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={UsersRound} title="No staff yet" description="Add staff with explicit permissions." action={<button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Add staff</button>} />
          )}
        </section>

        <div className="roles-security-note">
          <KeyRound size={20} />
          <div>
            <strong>Clear roles — {BUSINESS.name}</strong>
            <p><strong>Admin:</strong> Full access. <strong>Staff:</strong> Can be granted Orders, Products, Animals, Customers, Media, Documents. <strong>Content Staff:</strong> Primarily Photos, Videos, Gallery. Permissions explicit rather than everyone everything.</p>
          </div>
        </div>

        {showForm && (
          <div className="modal-layer">
            <button className="modal-scrim" onClick={() => setShowForm(false)} />
            <div className="record-modal small-modal">
              <header><div><span className="eyebrow">{BUSINESS.name}</span><h2>Add Staff</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={20} /></button></header>
              <form onSubmit={addMember} className="dashboard-stack" style={{ padding: 20 }}>
                <div className="form-grid">
                  <label className="field field-full"><span>Full name *</span><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required /></label>
                  <label className="field"><span>Email *</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
                  <label className="field"><span>Phone *</span><input value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></label>
                  <label className="field"><span>Title</span><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Herd manager" /></label>
                  <label className="field"><span>Role *</span>
                    <select value={form.role} onChange={(e) => update("role", e.target.value)}>
                      <option value="staff">Staff — Orders, Products, Animals, Customers, Media, Documents</option>
                      <option value="admin">Admin — Full access</option>
                    </select>
                  </label>
                </div>

                <div>
                  <span style={{ fontSize: ".8rem", fontWeight: 700 }}>Permissions (explicit)</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 8 }}>
                    {PERMISSIONS.map((perm) => (
                      <label key={perm} className="check-field" style={{ marginTop: 0 }}>
                        <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePerm(perm)} />
                        <span><i>✓</i> {perm}</span>
                      </label>
                    ))}
                  </div>
                  <small>Admin gets full access automatically. Staff permissions are explicit.</small>
                </div>

                {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}

                <div className="modal-actions">
                  <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="button button-primary" disabled={saving}>{saving ? <><i className="button-spinner" /> Creating…</> : "Create account"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
