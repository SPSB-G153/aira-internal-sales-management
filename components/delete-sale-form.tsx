"use client";

import { useActionState } from "react";
import { deleteSale, type DeleteSaleState } from "@/lib/actions/sales";

export function DeleteSaleForm({ saleId, saleReference }: { saleId: string; saleReference: string }) {
  const action = deleteSale.bind(null, saleId);
  const [state, formAction, pending] = useActionState<DeleteSaleState, FormData>(action, {});

  return <details className="delete-sale-panel">
    <summary className="button danger">Delete booking record</summary>
    <form action={formAction} className="delete-sale-confirmation">
      <strong>Permanently delete {saleReference}?</strong>
      <p>This deletes this booking and all letters linked to it. It cannot be undone. Other bookings and approved templates will not be changed.</p>
      <label htmlFor="delete-confirmation">Type <b>{saleReference}</b> to confirm</label>
      <input id="delete-confirmation" name="confirmation_reference" required autoComplete="off" spellCheck={false} />
      <button className="button danger" disabled={pending}>{pending ? "Deleting…" : "Permanently delete booking"}</button>
      {state.error ? <p className="action-error" role="alert">{state.error}</p> : null}
    </form>
  </details>;
}
