"use client";
import { useActionState } from "react";
import { generateMissingHovp, type ConfirmState } from "@/lib/actions/sales";

export function GenerateHovpButton({saleId}:{saleId:string}){
  const action=generateMissingHovp.bind(null,saleId);
  const[state,formAction,pending]=useActionState<ConfirmState,FormData>(action,{});
  return <form action={formAction} className="confirm-form"><button className="button secondary" disabled={pending}>{pending?"Creating…":"Create HOVP Letter"}</button>{state.error&&<p className="action-error" role="alert">{state.error}</p>}</form>;
}
