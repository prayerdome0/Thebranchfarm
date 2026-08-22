"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/utils";
import { BUSINESS } from "@/lib/constants";

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
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      const requested = search.get("next");
      const safeRequested = requested?.startsWith("/") && !requested.startsWith("//") ? requested : null;
      router.replace(safeRequested || "/dashboard");
    } catch (cause) {
      setError(friendlyError(cause));
      setLoading(false);
    }
  };

  return (
    <>
      <form className="auth-form" onSubmit={submit} noValidate>
        {error && <div className="form-alert error"><CircleAlert size={18} /> {error}</div>}
        <label className="field">
          <span>Email</span>
          <div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" autoFocus /></div>
        </label>
        <label className="field">
          <span className="field-label-row">Password <Link href="/reset-password">Forgot password?</Link></span>
          <div className="input-with-icon input-with-action">
            <LockKeyhole size={18} />
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </label>
        <button className="button button-primary button-large button-full" disabled={loading}>
          {loading ? <><i className="button-spinner" /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}
        </button>
      </form>
      <p className="auth-switch">Don't have account? <Link href="/register">Register</Link></p>
      <p className="auth-switch" style={{ marginTop: 8 }}><Link href="/">Back to {BUSINESS.name}</Link></p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell eyebrow={BUSINESS.name} title="Welcome to sign in" description={`${BUSINESS.name} - ${BUSINESS.slogan}. Sign in to continue.`}>
      <Suspense fallback={<div className="loading-state"><i className="loader" /> Loading…</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
