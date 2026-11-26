"use client";

import { useActionState } from "react";
import { changePassword, type PwState } from "../actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<PwState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block"><span className="mb-1 block text-sm text-neutral-400">Aktuelles Passwort</span><input name="current" type="password" autoComplete="current-password" className="input" required /></label>
      <label className="block"><span className="mb-1 block text-sm text-neutral-400">Neues Passwort (min. 8 Zeichen)</span><input name="next" type="password" autoComplete="new-password" minLength={8} className="input" required /></label>
      <label className="block"><span className="mb-1 block text-sm text-neutral-400">Neues Passwort wiederholen</span><input name="repeat" type="password" autoComplete="new-password" className="input" required /></label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-400">Passwort geändert.</p>}
      <button className="btn-primary w-full" disabled={pending}>Passwort ändern</button>
    </form>
  );
}
