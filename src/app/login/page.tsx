"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const profile = await login(email.trim(), password);
      const requested = search.get("next");
      const safeRequested = requested?.startsWith("/") && !requested.startsWith("//") ? requested : null;
      router.replace(safeRequested || (profile?.role === "admin" ? "/admin" : profile?.role === "staff" ? "/staff" : "/dashboard"));
    } catch (cause) { setError(friendlyError(cause)); setLoading(false); }
  };

  return <><form className="auth-form" onSubmit={submit} noValidate>{error && <div className="form-alert error"><CircleAlert size={18} /> {error}</div>}<label className="field"><span>Email address</span><div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" autoFocus /></div></label><label className="field"><span className="field-label-row">Password <Link href="/reset-password">Forgot password?</Link></span><div className="input-with-icon input-with-action"><LockKeyhole size={18} /><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><button className="button button-primary button-large button-full" disabled={loading}>{loading ? <><i className="button-spinner" /> Signing in…</> : <>Sign in securely <ArrowRight size={18} /></>}</button></form><p className="auth-switch">New to The Branch Farm? <Link href="/register">Create a customer account</Link></p><p className="auth-security"><LockKeyhole size={15} /> Staff and admin access is assigned securely after registration. There is no public admin registration.</p></>;
}

export default function LoginPage() {
  return <AuthShell eyebrow="Welcome back" title="Sign in to your account." description="Track orders, manage documents or continue to your farm workspace."><Suspense fallback={<div className="loading-state"><i className="loader" /> Loading secure sign-in…</div>}><LoginForm /></Suspense></AuthShell>;
}
