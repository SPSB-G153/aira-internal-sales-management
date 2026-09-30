import { createClient } from "@/lib/supabase/server";
import type { SaleDocument } from "@/lib/types";
import { getTeamContext } from "@/lib/tenancy";
import { documentOrder } from "@/lib/templates";
export async function getDocuments(saleId?:string){const db=await createClient();const{team}=await getTeamContext();let q=db.from("documents").select("*").eq("team_id",team.id).order("created_at",{ascending:false});if(saleId)q=q.eq("sale_id",saleId);const{data,error}=await q;if(error)throw new Error(error.message);const documents=((data??[])as SaleDocument[]).filter(doc=>documentOrder.includes(doc.document_type));return saleId?documents.sort((a,b)=>documentOrder.indexOf(a.document_type)-documentOrder.indexOf(b.document_type)):documents}
export async function getDocument(id:string){const db=await createClient();const{team}=await getTeamContext();const{data,error}=await db.from("documents").select("*").eq("team_id",team.id).eq("id",id).single();if(error)throw new Error(error.message);const document=data as SaleDocument;if(!documentOrder.includes(document.document_type))throw new Error("This document type is no longer used.");return document}
