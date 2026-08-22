"use client";

import { CircleAlert, EyeOff, KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import { changeOwnPassword } from "@/lib/firebase/auth";
import { useToast } from "@/contexts/ToastContext";
import { friendlyError } from "@/lib/utils";

/**
 * Lets the signed-in user change ONLY their own password. The current password
 * is required (re-authentication happens server-side), and the new password is
 * saved to Firebase Auth and is effective on the next sign-in.
 */
export function ChangePassword({ compact = false }: { compact?: boolean }) {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (next === current) {
      setError("Choose a password that is different from your current one.");
      return;
    }
    setSaving(true);
    try {
      await changeOwnPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      showToast("Password updated. Use it the next time you sign in.", "success");
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={compact ? "change-password-form compact" : "change-password-form"}>
      <div className="change-password-grid">
        <label className="field">
          <span>Current password *</span>
          <div className="input-with-icon">
            <Lock size={17} />
            <input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              placeholder="Your current password"
            />
          </div>
        </label>
        <label className="field">
          <span>New password *</span>
          <div className="input-with-icon">
            <KeyRound size={17} />
            <input
              type={show ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
        </label>
        <label className="field">
          <span>Confirm new password *</span>
          <div className="input-with-icon">
            <KeyRound size={17} />
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
            />
          </div>
        </label>
      </div>

      <div className="change-password-meta">
        <label className="check-field">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <span><i>✓</i> Show passwords</span>
        </label>
        <small>Only you can change your password. The new one works immediately on the next sign-in.</small>
      </div>

      {error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}

      <div className="modal-actions">
        <button className="button button-primary" disabled={saving}>
          {saving ? <><i className="button-spinner" /> Updating…</> : <><KeyRound size={16} /> Update password</>}
        </button>
        <button type="button" className="button button-ghost" onClick={() => { setCurrent(""); setNext(""); setConfirm(""); setError(""); setShow(false); }} disabled={saving}>
          <EyeOff size={15} /> Clear
        </button>
      </div>
    </form>
  );
}
