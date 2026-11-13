"use client";

import { useActionState } from "react";
import { removeAgentDetails, type RemoveAgentState } from "@/lib/actions/agent";

export function RemoveAgentForm({ saleId }: { saleId: string }) {
  const action = removeAgentDetails.bind(null, saleId);
  const [state, formAction, pending] = useActionState<RemoveAgentState, FormData>(action, {});

  return <form
    action={formAction}
    onSubmit={(event) => {
      if (!window.confirm("Remove this wrongly uploaded agent and its two agent letters from this sale?")) {
        event.preventDefault();
      }
    }}
  >
    <button className="button secondary" disabled={pending}>
      {pending ? "Removing…" : "Remove agent details"}
    </button>
    {state.error ? <p className="action-error" role="alert">{state.error}</p> : null}
  </form>;
}
