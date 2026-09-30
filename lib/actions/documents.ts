"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/tenancy";
export async function markDocumentReviewed(id:string,saleId:string){const db=await createClient();const{team}=await getTeamContext();const{error}=await db.from("documents").update({status:"reviewed"}).eq("team_id",team.id).eq("id",id);if(error)throw new Error(error.message);revalidatePath(`/documents/${id}`);revalidatePath(`/sales/${saleId}`);revalidatePath("/documents")}
