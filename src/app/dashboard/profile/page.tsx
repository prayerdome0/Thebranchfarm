"use client";

import { CheckCircle2, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { updateProfile } from "@/lib/firebase/data";
import { friendlyError, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (user) setForm({ fullName: user.fullName, phone: user.phone }); }, [user]);
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!user) return; setSaving(true); try { await updateProfile(user.uid, form); showToast("Profile updated.", "success"); } catch (error) { showToast(friendlyError(error), "error"); } finally { setSaving(false); } };
  const signOut = async () => { await logout(); router.push("/"); };
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Profile &amp; contact</h2><p>Keep the details used for your orders up to date.</p></div></section><div className="profile-layout"><section className="dashboard-panel profile-card"><span className="profile-large-avatar"><UserRound size={29} /></span><h2>{user?.fullName}</h2><p>{user?.email}</p><span className="role-chip"><ShieldCheck size={15} /> {user?.role} account</span><dl><div><dt>Member since</dt><dd>{formatDate(user?.createdAt)}</dd></div><div><dt>Account status</dt><dd><CheckCircle2 size={15} /> {user?.status}</dd></div></dl></section><section className="dashboard-panel"><form className="profile-form" onSubmit={save}><h2>Contact details</h2><label className="field"><span>Full name</span><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="field"><span>Email</span><input value={user?.email || ""} disabled /><small>Email changes require identity verification and are not changed here.</small></label><label className="field"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label><button className="button button-primary" disabled={saving}>{saving ? <i className="button-spinner" /> : <Save size={17} />} {saving ? "Saving…" : "Save changes"}</button></form></section></div><button className="sign-out-row" onClick={signOut}><LogOut size={18} /><span><strong>Sign out</strong><small>End this session on this device.</small></span></button></div>;
}
