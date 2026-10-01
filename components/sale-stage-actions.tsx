"use client";
import { useActionState } from "react";
import { generateHovp, markSpaSigned, type ConfirmState } from "@/lib/actions/sales";

export function SaleStageActions({saleId,status}:{saleId:string;status:"confirmed"|"spa_signed"}){
  const operation=status==="confirmed"?markSpaSigned:generateHovp;
  const action=operation.bind(null,saleId);
  const[state,formAction,pending]=useActionState<ConfirmState,FormData>(action,{});
  const label=status==="confirmed"?"Mark SPA signed":"Confirm 90% paid / consent complete & issue HOVP";
  return <form action={formAction} className="confirm-form"><button className="button accent" disabled={pending}>{pending?"Updating…":label}</button>{state.error&&<p className="action-error" role="alert">{state.error}</p>}</form>;
}
