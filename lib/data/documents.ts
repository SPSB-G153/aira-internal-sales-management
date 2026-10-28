import { createClient } from "@/lib/supabase/server";
import type { Sale, SaleDocument } from "@/lib/types";
import { getTeamContext } from "@/lib/tenancy";
import { buildDocumentSnapshot, documentOrder } from "@/lib/templates";
import { mergeDocumentContent } from "@/lib/document-content";
import { hasExternalAgent } from "@/lib/agency-details";
const agentDocumentTypes=["agency_appointment_letter","agent_commission_letter"] as const;
export async function getDocuments(saleId?:string){const db=await createClient();const{team,role,isDemo}=await getTeamContext();const canAccessAgentLetter=role==="owner"||isDemo;let q=db.from("documents").select("*").eq("team_id",team.id).order("created_at",{ascending:false});if(saleId)q=q.eq("sale_id",saleId);const{data,error}=await q;if(error)throw new Error(error.message);const documents=((data??[])as SaleDocument[]).filter(doc=>documentOrder.includes(doc.document_type)&&(!agentDocumentTypes.includes(doc.document_type as typeof agentDocumentTypes[number])||(canAccessAgentLetter&&hasExternalAgent(doc.content))));return saleId?documents.sort((a,b)=>documentOrder.indexOf(a.document_type)-documentOrder.indexOf(b.document_type)):documents}
export async function ensureAgentCommissionDocument(sale:Sale){
  const db=await createClient();const{team}=await getTeamContext();
  const{data:existing,error:lookupError}=await db.from("documents").select("id,document_type").eq("team_id",team.id).eq("sale_id",sale.id).in("document_type",agentDocumentTypes);
  if(lookupError)throw new Error(lookupError.message);
  if(!hasExternalAgent(sale)){
    if(existing?.length){const{error}=await db.from("documents").delete().eq("team_id",team.id).eq("sale_id",sale.id).in("document_type",agentDocumentTypes);if(error)throw new Error(error.message);}
    return;
  }
  const missing=agentDocumentTypes.filter(type=>!(existing??[]).some(document=>document.document_type===type));
  if(!missing.length)return;
  const{data:{user}}=await db.auth.getUser();
  const{error}=await db.from("documents").upsert(missing.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at:new Date().toISOString()})),{onConflict:"sale_id,document_type"});
  if(error)throw new Error(error.message);
}
export async function getDocument(id:string){
  const db=await createClient();
  const{team,role,isDemo}=await getTeamContext();
  const{data,error}=await db.from("documents").select("*").eq("team_id",team.id).eq("id",id).single();
  if(error)throw new Error(error.message);
  const document=data as SaleDocument;
  if(!documentOrder.includes(document.document_type))throw new Error("This document type is no longer used.");
  if(agentDocumentTypes.includes(document.document_type as typeof agentDocumentTypes[number])&&role!=="owner"&&!isDemo)throw new Error("Only the workspace owner can access this letter.");

  // A document is a historical snapshot, but previews/downloads must reflect
  // later approved booking corrections. Merge the related snapshots first,
  // then make the current sale record authoritative. Blank current fields are
  // ignored by mergeDocumentContent, so older captured details remain usable.
  const[{data:related,error:relatedError},{data:sale,error:saleError}]=await Promise.all([
    db.from("documents").select("content").eq("team_id",team.id).eq("sale_id",document.sale_id),
    db.from("sales").select("*").eq("team_id",team.id).eq("id",document.sale_id).single(),
  ]);
  if(relatedError)throw new Error(relatedError.message);
  if(saleError)throw new Error(saleError.message);
  if(agentDocumentTypes.includes(document.document_type as typeof agentDocumentTypes[number])&&!hasExternalAgent(sale as Sale))throw new Error("Agent details are required before this letter can be generated.");
  const historical=(related??[]).reduce<Record<string,unknown>>(
    (content,row)=>mergeDocumentContent(content,(row.content??{}) as Record<string,unknown>),
    {},
  );
  const current=buildDocumentSnapshot(sale as Sale,document.document_type);
  document.content=mergeDocumentContent(
    mergeDocumentContent(historical,document.content),
    current,
  );
  return document;
}
