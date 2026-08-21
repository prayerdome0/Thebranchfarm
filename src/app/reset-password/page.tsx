"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Mail, Send } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/utils";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!email.includes("@")) { setError("Enter a valid email address."); return; } setState("loading"); setError(""); try { await resetPassword(email); setState("sent"); } catch (cause) { setError(friendlyError(cause)); setState("idle"); } };
  return <AuthShell eyebrow="Account recovery" title="Reset your password." description="We will send a secure reset link to your registered email address.">{state === "sent" ? <div className="reset-success"><span><CheckCircle2 size={31} /></span><h2>Check your inbox</h2><p>If an account exists for <strong>{email}</strong>, Firebase has sent password reset instructions.</p><Link href="/login" className="button button-primary"><ArrowLeft size={17} /> Return to sign in</Link></div> : <><form className="auth-form" onSubmit={submit}>{error && <div className="form-alert error"><CircleAlert size={18} /> {error}</div>}<label className="field"><span>Email address</span><div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus placeholder="you@example.com" /></div></label><button className="button button-primary button-large button-full" disabled={state === "loading"}>{state === "loading" ? <><i className="button-spinner" /> Sending…</> : <>Send reset link <Send size={18} /></>}</button></form><p className="auth-switch"><Link href="/login"><ArrowLeft size={15} /> Back to sign in</Link></p></>}</AuthShell>;
}
