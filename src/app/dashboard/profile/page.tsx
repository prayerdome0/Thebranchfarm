"use client";

import { CheckCircle2, CloudUpload, LogOut, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { removeUserSignature, saveUserSignature, updateProfile } from "@/lib/firebase/data";
import { friendlyError, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [signatureBusy, setSignatureBusy] = useState(false);
  const { upload, uploading, progress } = useCloudinaryUpload();
  useEffect(() => { if (user) setForm({ fullName: user.fullName, phone: user.phone }); }, [user]);
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!user) return; setSaving(true); try { await updateProfile(user.uid, form); showToast("Profile updated.", "success"); } catch (error) { showToast(friendlyError(error), "error"); } finally { setSaving(false); } };
  const onSignature = async (file?: File) => { if (!file || !user) return; setSignatureBusy(true); try { const result = await upload(file, "profiles"); await saveUserSignature(result.url); showToast("Signature saved. It appears on your documents.", "success"); } catch (error) { showToast(friendlyError(error), "error"); } finally { setSignatureBusy(false); } };
  const removeSignature = async () => { if (!user) return; setSignatureBusy(true); try { await removeUserSignature(); showToast("Signature removed.", "success"); } catch (error) { showToast(friendlyError(error), "error"); } finally { setSignatureBusy(false); } };
  const signOut = async () => { await logout(); router.push("/"); };
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Profile &amp; contact</h2><p>Keep the details used for your orders up to date.</p></div></section><div className="profile-layout"><section className="dashboard-panel profile-card"><span className="profile-large-avatar"><UserRound size={29} /></span><h2>{user?.fullName}</h2><p>{user?.email}</p><span className="role-chip"><ShieldCheck size={15} /> {user?.role} account</span><dl><div><dt>Member since</dt><dd>{formatDate(user?.createdAt)}</dd></div><div><dt>Account status</dt><dd><CheckCircle2 size={15} /> {user?.status}</dd></div></dl></section><section className="dashboard-panel"><form className="profile-form" onSubmit={save}><h2>Contact details</h2><label className="field"><span>Full name</span><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="field"><span>Email</span><input value={user?.email || ""} disabled /><small>Email changes require identity verification and are not changed here.</small></label><label className="field"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label><button className="button button-primary" disabled={saving}>{saving ? <i className="button-spinner" /> : <Save size={17} />} {saving ? "Saving…" : "Save changes"}</button></form></section>
        {(user?.role === "staff" || user?.role === "admin") && <section className="dashboard-panel profile-signature-section"><h2>Prepared-by signature</h2><p>This signature appears as the person who prepared quotations, invoices and receipts. The customer does not sign.</p>{user.signature ? <div className="profile-signature-preview"><img src={user.signature} alt="Your signature" /></div> : <p className="prepared-note">No signature uploaded yet.</p>}<div className="signature-actions"><label className="button button-secondary file-button"><CloudUpload size={17} /> {uploading ? `Uploading ${progress}%` : "Upload signature image"}<input type="file" accept="image/*" onChange={(e) => onSignature(e.target.files?.[0])} disabled={uploading || signatureBusy} /></label>{user.signature && <button className="button button-ghost" onClick={removeSignature} disabled={signatureBusy}><Trash2 size={17} /> Remove</button>}</div></section>}
      </div><button className="sign-out-row" onClick={signOut}><LogOut size={18} /><span><strong>Sign out</strong><small>End this session on this device.</small></span></button></div>;
}
