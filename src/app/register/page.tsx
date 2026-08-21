"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleAlert, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { registerSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; }
    setErrors({}); setServerError(""); setLoading(true);
    try { await register({ fullName: parsed.data.fullName, email: parsed.data.email, phone: parsed.data.phone, password: parsed.data.password }); router.replace("/dashboard?welcome=1"); }
    catch (cause) { setServerError(friendlyError(cause)); setLoading(false); }
  };

  return <AuthShell eyebrow="Welcome to register." title="Register." description="Create your customer account."><form className="auth-form register-form" onSubmit={submit} noValidate>{serverError && <div className="form-alert error"><CircleAlert size={18} /> {serverError}</div>}<label className="field"><span>Name</span><div className="input-with-icon"><UserRound size={18} /><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" autoFocus /></div>{errors.fullName && <small className="field-error">{errors.fullName}</small>}</label><label className="field"><span>Phone</span><div className="input-with-icon"><Phone size={18} /><input value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+268 …" /></div>{errors.phone && <small className="field-error">{errors.phone}</small>}</label><label className="field"><span>Email</span><div className="input-with-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label><label className="field"><span>Password</span><div className="input-with-icon input-with-action"><LockKeyhole size={18} /><input type={show ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label><label className="field"><span>Confirm password</span><div className="input-with-icon"><Check size={18} /><input type={show ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} autoComplete="new-password" /></div>{errors.confirmPassword && <small className="field-error">{errors.confirmPassword}</small>}</label><button className="button button-primary button-large button-full" disabled={loading}>{loading ? <><i className="button-spinner" /> Creating account…</> : <>Register <ArrowRight size={18} /></>}</button></form><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></AuthShell>;
}
