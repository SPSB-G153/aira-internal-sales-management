"use client";

import { useActionState } from "react";
import { confirmSale, type ConfirmState } from "@/lib/actions/sales";

export function ConfirmSaleForm({ saleId }: { saleId: string }) {
  const action = confirmSale.bind(null, saleId);
  const [state, formAction, pending] = useActionState<ConfirmState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="confirm-form">
      <button className="button accent" disabled={pending}>
        {pending ? "Generating 4 documents…" : "Confirm & generate"}
      </button>
      {state.error ? (
        <p className="action-error" role="alert">
          {state.error} You can retry without re-entering the sale.
        </p>
      ) : null}
    </form>
  );
}
