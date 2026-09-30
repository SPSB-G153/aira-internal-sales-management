import { createClient } from "@/lib/supabase/server";
import type { SaleDocument } from "@/lib/types";
import { getTeamContext } from "@/lib/tenancy";
export async function getDocuments(saleId?:string){const db=await createClient();const{team}=await getTeamContext();let q=db.from("documents").select("*").eq("team_id",team.id).order("created_at",{ascending:false});if(saleId)q=q.eq("sale_id",saleId);const{data,error}=await q;if(error)throw new Error(error.message);return(data??[])as SaleDocument[]}
export async function getDocument(id:string){const db=await createClient();const{team}=await getTeamContext();const{data,error}=await db.from("documents").select("*").eq("team_id",team.id).eq("id",id).single();if(error)throw new Error(error.message);return data as SaleDocument}
