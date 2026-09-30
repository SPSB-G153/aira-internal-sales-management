"use client";

import { useActionState } from "react";
import { requestMagicLink, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export function AuthForm({ next = "/settings/team" }: { next?: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, initialState);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </div>
      {state.error && <p className="alert">{state.error}</p>}
      {state.success && <p className="alert success">{state.success}</p>}
      <button className="button" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
}
