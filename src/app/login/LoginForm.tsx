"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm text-neutral-400">Benutzername</span>
        <input name="username" autoComplete="username" autoCapitalize="none" className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-neutral-400">Passwort</span>
        <input name="password" type="password" autoComplete="current-password" className="input" required />
      </label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Wird angemeldet …" : "Anmelden"}</button>
    </form>
  );
}
