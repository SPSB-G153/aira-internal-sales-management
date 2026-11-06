"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { saveSpaProgress, type SpaTrackerState } from "@/lib/actions/sales";
import { privateReaderUrl } from "@/lib/private-reader";
import type { Sale } from "@/lib/types";

const money=(value:number)=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(value);
const displayDate=(value:string|null|undefined)=>value?new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value.slice(0,10)}T00:00:00Z`)):"—";
const daysBetween=(from:string,to:string)=>Math.ceil((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000);

export function SpaProgressTracker({sale,noticeIssuedAt,inventoryLetterId,showUnit}:{sale:Sale;noticeIssuedAt:string;inventoryLetterId?:string;showUnit?:{name:string;value:number}}){
  const action=saveSpaProgress.bind(null,sale.id);
  const[state,formAction,pending]=useActionState<SpaTrackerState,FormData>(action,{});
  const balanceInput=useRef<HTMLInputElement>(null);
  const inventoryInput=useRef<HTMLInputElement>(null);
  const[uploadMessage,setUploadMessage]=useState("");
  const[uploadError,setUploadError]=useState("");
  const inventoryDefault=sale.inventory_required??Boolean(showUnit||inventoryLetterId||sale.quoted_id_net_selling_price);
  const[hasInventory,setHasInventory]=useState(inventoryDefault);
  const inventoryIncluded=sale.inventory_payment_not_required||sale.inventory_payment_reference==="Included in selling price";
  const[inventoryArrangement,setInventoryArrangement]=useState<"separate"|"included">(inventoryIncluded?"included":"separate");
  const todayParts=Object.fromEntries(new Intl.DateTimeFormat("en",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(part=>[part.type,part.value]));
  const today=`${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const calculatedDue=useMemo(()=>{const value=new Date(`${noticeIssuedAt}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+14);return value.toISOString().slice(0,10);},[noticeIssuedAt]);
  const due=sale.spa_signing_due_at||calculatedDue;
  const countdownFrom=Date.parse(`${today}T00:00:00Z`)<Date.parse(`${noticeIssuedAt}T00:00:00Z`)?noticeIssuedAt:today;
  const remaining=daysBetween(countdownFrom,due);
  const reminder=sale.spa_signed_at?{label:"SPA signed",className:"confirmed"}:remaining<0?{label:`Overdue by ${Math.abs(remaining)} day${Math.abs(remaining)===1?"":"s"}`,className:"draft"}:remaining===0?{label:"Due today",className:"draft"}:remaining<=3?{label:`Due in ${remaining} days`,className:"draft"}:{label:`${remaining} days remaining`,className:"generated"};

  async function upload(file:File,kind:"balance"|"inventory"){
    setUploadMessage("");setUploadError("");
    try{
      const body=new FormData();
      body.set("unit_number",sale.unit_number||sale.sale_reference);
      body.set("filename",`${kind==="balance"?"SPA Balance 8 Percent":"Inventory Payment"} - ${file.name}`);
      body.set("file",file,file.name);
      const response=await fetch(`${privateReaderUrl()}/save-file`,{method:"POST",body});
      const result=await response.json();
      if(!response.ok)throw new Error(result.detail||"The payment file could not be saved.");
      setUploadMessage(`${kind==="balance"?"8% balance payment":"Inventory payment"} file saved separately with this unit.`);
    }catch(error){setUploadError(error instanceof Error&&error.message!=="Failed to fetch"?error.message:"Start the private Booking Form reader on this computer, then try again.");}
    finally{if(balanceInput.current)balanceInput.current.value="";if(inventoryInput.current)inventoryInput.current.value="";}
  }

  return <section className="card detail-card spa-tracker">
    <div className="page-header spa-tracker-head"><div><p className="eyebrow">Post-acceptance tracker</p><h2>SPA signing & payments</h2></div><span className={`badge ${reminder.className}`}>{reminder.label}</span></div>
    <div className="spa-timeline">
      <div><small>Notice issued</small><strong>{displayDate(noticeIssuedAt)}</strong></div>
      <span>→</span>
      <div><small>Signing target</small><strong>{displayDate(due)}</strong></div>
      <span>→</span>
      <div><small>SPA signing date</small><strong>{displayDate(sale.spa_signing_scheduled_at||sale.spa_signed_at)}</strong></div>
    </div>
    <form action={formAction} className="spa-tracker-form">
      <input type="hidden" name="notice_issued_at" value={noticeIssuedAt}/>
      <fieldset><legend>1. SPA signing</legend><div className="tracker-fields"><label>SPA signing date<input type="date" name="spa_signing_date" defaultValue={sale.spa_signing_scheduled_at||sale.spa_signed_at||""}/></label><label className="tracker-completion"><input type="checkbox" name="spa_signed_confirmed" value="yes" defaultChecked={Boolean(sale.spa_signed_at)}/><span>SPA signed / completed</span></label></div><p className="field-note">Update this date if the signing appointment changes. Tick SPA signed / completed only after signing is completed.</p></fieldset>
      <fieldset><legend>2. Balance deposit (8%)</legend><p className="tracker-amount">Expected: <strong>{money(sale.purchase_price*0.08)}</strong></p><div className="tracker-fields"><label>Payment date<input type="date" name="balance_deposit_received_at" defaultValue={sale.balance_deposit_received_at||""}/></label><label>Method<select name="balance_deposit_payment_method" defaultValue={sale.balance_deposit_payment_method||""}><option value="">Select</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option></select></label><label>Cheque / transfer reference<input name="balance_deposit_reference" defaultValue={sale.balance_deposit_reference||""}/></label></div><input ref={balanceInput} hidden type="file" accept="application/pdf,image/*" onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file,"balance");}}/><button type="button" className="button secondary tracker-upload" onClick={()=>balanceInput.current?.click()}>Upload 8% cheque / receipt</button></fieldset>
      <fieldset>
        <legend>3. Show-unit inventories</legend>
        {showUnit&&<div className="show-unit-master"><span>Approved show unit</span><strong>{showUnit.name}</strong><b>{money(showUnit.value)}</b></div>}
        <label className="tracker-choice">Inventories included?<select name="inventory_required" value={hasInventory?"yes":"no"} onChange={event=>setHasInventory(event.target.value==="yes")}><option value="no">No</option><option value="yes">Yes</option></select></label>
        {hasInventory&&<>
          <div className="inventory-arrangement" role="group" aria-label="Inventory payment arrangement">
            <button type="button" className={inventoryArrangement==="separate"?"selected":""} onClick={()=>setInventoryArrangement("separate")}>Separate inventory payment</button>
            <button type="button" className={inventoryArrangement==="included"?"selected":""} onClick={()=>setInventoryArrangement("included")}>Included in selling price</button>
          </div>
          <input type="hidden" name="inventory_payment_arrangement" value={inventoryArrangement}/>
          {inventoryArrangement==="included"&&<input type="hidden" name="inventory_payment_amount" value={sale.inventory_payment_amount??showUnit?.value??""}/>}
          <div className={`tracker-fields inventory-payment-fields ${inventoryArrangement==="included"?"disabled":""}`}>
            <label>Inventory value / separate cheque amount (RM)<input disabled={inventoryArrangement==="included"} type="number" min="0" step="0.01" name="inventory_payment_amount" defaultValue={sale.inventory_payment_amount??showUnit?.value??""}/></label>
            <label>Payment date<input disabled={inventoryArrangement==="included"} type="date" name="inventory_payment_received_at" defaultValue={sale.inventory_payment_received_at||""}/></label>
            <label>Method<select disabled={inventoryArrangement==="included"} name="inventory_payment_method" defaultValue={sale.inventory_payment_method||""}><option value="">Select</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option></select></label>
            <label>Separate cheque / transfer reference<input disabled={inventoryArrangement==="included"} name="inventory_payment_reference" defaultValue={sale.inventory_payment_reference||""}/></label>
          </div>
          <div className="form-actions tracker-actions">
            {inventoryLetterId&&<Link className="button secondary" href={`/documents/${inventoryLetterId}`}>View inventory letter</Link>}
            <input ref={inventoryInput} hidden type="file" accept="application/pdf,image/*" onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file,"inventory");}}/>
            <button disabled={inventoryArrangement==="included"} type="button" className="button secondary tracker-upload" onClick={()=>inventoryInput.current?.click()}>Upload inventory cheque / receipt</button>
          </div>
          <p className="field-note">{inventoryArrangement==="included"?"Inventory payment is included in the agreed selling price. No separate cheque or receipt is required.":"The inventory value and cheque are recorded separately from the 8% balance payment."}</p>
        </>}
      </fieldset>
      <div className="form-actions"><button className="button accent" disabled={pending}>{pending?"Saving…":"Save SPA progress"}</button>{state.saved&&<span className="tracker-saved">SPA progress saved.</span>}</div>
      {uploadMessage&&<p className="upload-message" role="status">{uploadMessage}</p>}{uploadError&&<p className="action-error" role="alert">{uploadError}</p>}{state.error&&<p className="action-error" role="alert">{state.error}</p>}
    </form>
  </section>;
}
