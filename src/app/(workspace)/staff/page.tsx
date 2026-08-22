"use client";

import { CircleAlert, KeyRound, Pencil, Plus, ShieldCheck, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  BUSINESS,
  DEFAULT_STAFF_PERMISSIONS,
  ROLE_PERMISSION_PRESETS,
  STAFF_PERMISSIONS,
  STATUS_LABELS,
} from "@/lib/constants";
import {
  createStaffAccount,
  getUsers,
  setUserPermissions,
  setUserRole,
  setUserStatus,
  updateStaffProfile,
} from "@/lib/firebase/data";
import { staffSchema } from "@/lib/validation";
import { cn, formatDate, friendlyError, initials } from "@/lib/utils";
import type { AppRole, UserProfile } from "@/types";

function RolePill({ role }: { role: AppRole }) {
  return <span className={cn("role-pill", `role-${role}`)}>{STATUS_LABELS[role] || role}</span>;
}

/** What a member can actually reach today, given role + saved permissions. */
function effectivePermissions(member: UserProfile): string[] {
  if (member.role === "admin") return [...STAFF_PERMISSIONS];
  if (member.role !== "staff") return [];
  const saved = (member.permissions || []).filter(Boolean);
  return saved.length ? saved : [...DEFAULT_STAFF_PERMISSIONS];
}

export default function StaffPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    title: "",
    role: "staff" as "staff" | "admin",
    permissions: [...DEFAULT_STAFF_PERMISSIONS] as string[],
  });

  const load = useCallback(() => {
    getUsers().then((list) => {
      setMembers(list);
      setLoading(false);
    });
  }, []);

  useEffect(load, [load]);

  const counts = useMemo(
    () => ({
      admins: members.filter((member) => member.role === "admin").length,
      staff: members.filter((member) => member.role === "staff").length,
      pending: members.filter((member) => member.role === "user").length,
      disabled: members.filter((member) => member.status === "disabled").length,
    }),
    [members],
  );

  const update = (key: keyof typeof form, value: string) => setForm((c) => ({ ...c, [key]: value }));

  const changeRole = (role: "staff" | "admin") =>
    setForm((current) => ({
      ...current,
      role,
      // Admins hold everything; picking Staff drops back to a sensible preset.
      permissions: [...(ROLE_PERMISSION_PRESETS[role] || DEFAULT_STAFF_PERMISSIONS)],
    }));

  const togglePerm = (perm: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const openForm = () => {
    setForm({ fullName: "", email: "", phone: "", title: "", role: "staff", permissions: [...DEFAULT_STAFF_PERMISSIONS] });
    setError("");
    setShowForm(true);
  };

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = staffSchema.safeParse({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      title: form.title,
      role: form.role,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Review info");
      return;
    }
    if (parsed.data.role === "staff" && form.permissions.length === 0) {
      setError("Tick at least one area this staff member may work in.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const permissions =
        parsed.data.role === "admin" ? [...STAFF_PERMISSIONS] : form.permissions;
      const result = await createStaffAccount({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        title: parsed.data.title,
        role: parsed.data.role,
        permissions,
      });
      setTempPassword(result.tempPassword);
      setShowForm(false);
      showToast(
        `${parsed.data.fullName} added to ${BUSINESS.name} — ${
          parsed.data.role === "admin" ? "full access" : `${permissions.length} area(s)`
        }`,
        "success",
      );
      load();
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  };

  const applyRole = async (member: UserProfile, role: AppRole) => {
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
            <p>
              {BUSINESS.name} — {BUSINESS.slogan}. Administrators have full access. Staff only see
              the areas ticked for them, and those permissions are saved to their account.
            </p>
          </div>
          <button className="button button-primary" onClick={openForm}>
            <Plus size={18} /> Add staff
          </button>
        </section>

        <section className="stat-grid staff-stat-grid">
          <article><span><ShieldCheck size={18} /></span><div><small>Administrators</small><strong>{counts.admins}</strong></div></article>
          <article><span><UsersRound size={18} /></span><div><small>Staff</small><strong>{counts.staff}</strong></div></article>
          <article className={counts.pending ? "warning" : undefined}><span><KeyRound size={18} /></span><div><small>Awaiting approval</small><strong>{counts.pending}</strong></div></article>
          <article><span><X size={18} /></span><div><small>Disabled</small><strong>{counts.disabled}</strong></div></article>
        </section>

        {tempPassword && (
          <div className="secret-notice">
            <div className="section-row">
              <div>
                <strong>{tempPassword}</strong>
                <p>Temporary password shown once. Share securely — sign in at /login and change it.</p>
              </div>
              <button className="icon-button" onClick={() => setTempPassword(null)}><X size={18} /></button>
            </div>
          </div>
        )}

        <section className="dashboard-panel people-panel">
          {loading ? (
            <Loading label="Loading staff…" />
          ) : members.length ? (
            <div className="people-table people-table-wide">
              <div className="table-head">
                <span>Name</span><span>Phone</span><span>Role</span><span>Access</span>
                <span>Status</span><span>Added</span><span>Actions</span>
              </div>
              {members.map((member) => {
                const isSelf = member.uid === user?.uid;
                const access = effectivePermissions(member);
                return (
                  <article key={member.uid}>
                    <span className="person-cell">
                      <i>{initials(member.fullName)}</i>
                      <span>
                        <strong>{member.fullName}</strong>
                        <small>{member.email} {member.title ? `· ${member.title}` : ""}</small>
                      </span>
                    </span>
                    <span>{member.phone || "—"}</span>
                    <span><RolePill role={member.role} /></span>
                    <span className="perm-cell">
                      {member.role === "admin" ? (
                        <em className="perm-chip perm-chip-all">Full access</em>
                      ) : access.length ? (
                        access.map((perm) => <em key={perm} className="perm-chip">{perm}</em>)
                      ) : (
                        <em className="perm-chip perm-chip-none">No access yet</em>
                      )}
                    </span>
                    <span className={cn("account-status", member.status === "disabled" && "disabled")}>
                      <i /> {member.status}
                    </span>
                    <span>{formatDate(member.createdAt)}</span>
                    <span className="person-actions">
                      <select
                        value={member.role}
                        disabled={isSelf}
                        onChange={(e) => applyRole(member, e.target.value as AppRole)}
                        aria-label={`Role for ${member.fullName}`}
                      >
                        <option value="user">Pending</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="button button-secondary button-small"
                        onClick={() => setEditing(member)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
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
              title="No staff yet"
              description="Add your first team member and choose exactly which areas they may work in."
              action={<button className="button button-primary" onClick={openForm}><Plus size={18} /> Add staff</button>}
            />
          )}
        </section>

        <div className="roles-security-note">
          <KeyRound size={20} />
          <div>
            <strong>Clear roles — {BUSINESS.name}</strong>
            <p>
              <strong>Admin:</strong> full oversight, approvals, audit, reports, Staff and Settings.{" "}
              <strong>Staff:</strong> operational access to the areas you tick — Farm Operations,
              Animals, Reports, Orders, Products, Customers, Media and Documents. The workspace
              menu and every page enforce the same permissions.
            </p>
          </div>
        </div>

        {showForm && (
          <div className="modal-layer">
            <button className="modal-scrim" onClick={() => setShowForm(false)} />
            <div className="record-modal small-modal">
              <header>
                <div><span className="eyebrow">{BUSINESS.name}</span><h2>Add Staff</h2></div>
                <button className="icon-button" onClick={() => setShowForm(false)}><X size={20} /></button>
              </header>
              <form onSubmit={addMember} className="dashboard-stack" style={{ padding: 20 }}>
                <div className="form-grid">
                  <label className="field field-full"><span>Full name *</span><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required /></label>
                  <label className="field"><span>Email *</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
                  <label className="field"><span>Phone *</span><input value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></label>
                  <label className="field"><span>Title</span><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Herd manager" /></label>
                  <label className="field"><span>Role *</span>
                    <select value={form.role} onChange={(e) => changeRole(e.target.value as "staff" | "admin")}>
                      <option value="staff">Staff — only the areas you tick below</option>
                      <option value="admin">Admin — full access</option>
                    </select>
                  </label>
                </div>

                <div>
                  <span style={{ fontSize: ".8rem", fontWeight: 700 }}>Permissions (explicit)</span>
                  <div className="permission-grid">
                    {STAFF_PERMISSIONS.map((perm) => (
                      <label key={perm} className="check-field" style={{ marginTop: 0 }}>
                        <input
                          type="checkbox"
                          checked={form.role === "admin" || form.permissions.includes(perm)}
                          disabled={form.role === "admin"}
                          onChange={() => togglePerm(perm)}
                        />
                        <span><i>✓</i> {perm}</span>
                      </label>
                    ))}
                  </div>
                  <small>
                    {form.role === "admin"
                      ? "Administrators automatically hold every permission."
                      : "Only ticked areas appear in this member's workspace menu."}
                  </small>
                </div>

                {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}

                <div className="modal-actions">
                  <button type="button" className="button button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="button button-primary" disabled={saving}>
                    {saving ? <><i className="button-spinner" /> Creating…</> : "Create account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editing && (
          <EditMemberModal
            member={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

/** Edit an existing member: contact details plus the areas they may work in. */
function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(member.fullName || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [title, setTitle] = useState(member.title || "");
  const [permissions, setPermissions] = useState<string[]>(effectivePermissions(member));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdminMember = member.role === "admin";

  const toggle = (perm: string) =>
    setPermissions((current) =>
      current.includes(perm) ? current.filter((item) => item !== perm) : [...current, perm],
    );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (fullName.trim().length < 2) { setError("Enter the full name"); return; }
    if (phone.trim().length < 8) { setError("Enter a valid phone number"); return; }
    if (!isAdminMember && member.role === "staff" && permissions.length === 0) {
      setError("Tick at least one area, or disable the account instead.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateStaffProfile(member.uid, { fullName: fullName.trim(), phone: phone.trim(), title: title.trim() });
      if (!isAdminMember) await setUserPermissions(member.uid, permissions);
      showToast(`${fullName.trim()} updated`, "success");
      onSaved();
    } catch (cause) {
      setError(friendlyError(cause));
      setSaving(false);
    }
  };

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={onClose} />
      <div className="record-modal small-modal">
        <header>
          <div><span className="eyebrow">{BUSINESS.name}</span><h2>Edit {member.fullName}</h2></div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </header>
        <form onSubmit={save} className="dashboard-stack" style={{ padding: 20 }}>
          <div className="form-grid">
            <label className="field field-full"><span>Full name *</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
            <label className="field"><span>Phone *</span><input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
            <label className="field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Herd manager" /></label>
            <label className="field field-full"><span>Email (sign-in)</span><input value={member.email} readOnly /></label>
          </div>

          <div>
            <span style={{ fontSize: ".8rem", fontWeight: 700 }}>Areas this member may work in</span>
            <div className="permission-grid">
              {STAFF_PERMISSIONS.map((perm) => (
                <label key={perm} className="check-field" style={{ marginTop: 0 }}>
                  <input
                    type="checkbox"
                    checked={isAdminMember || permissions.includes(perm)}
                    disabled={isAdminMember}
                    onChange={() => toggle(perm)}
                  />
                  <span><i>✓</i> {perm}</span>
                </label>
              ))}
            </div>
            <small>
              {isAdminMember
                ? "This member is an administrator and holds every permission."
                : "Saved to the member's account — their workspace menu updates immediately."}
            </small>
          </div>

          {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}

          <div className="modal-actions">
            <button type="button" className="button button-ghost" onClick={onClose}>Cancel</button>
            <button className="button button-primary" disabled={saving}>
              {saving ? <><i className="button-spinner" /> Saving…</> : <><ShieldCheck size={16} /> Save changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
