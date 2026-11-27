"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/tenancy";

export async function savePopApprovalDate(id: string, form: FormData) {
  const date = form.get("pop_approval_date");
  const parsed = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(date)
    : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error("Enter a valid POP approval date.");
  }

  const db = await createClient();
  const {team} = await getTeamContext();
  const checklist = db.from("documents");
  const {data, error} = await checklist.select("content").eq("team_id", team.id)
    .eq("id", id).eq("document_type", "spa_signing_checklist").single();
  if (error) throw new Error(error.message);
  const {error: updateError} = await db.from("documents")
    .update({content: {...data.content, verified_pop_approval_date: date}})
    .eq("team_id", team.id).eq("id", id).eq("document_type", "spa_signing_checklist");
  if (updateError) throw new Error(updateError.message);
  revalidatePath("/documents/" + id);
}
export async function markDocumentReviewed(id:string,saleId:string){const db=await createClient();const{team}=await getTeamContext();const{error}=await db.from("documents").update({status:"reviewed"}).eq("team_id",team.id).eq("id",id);if(error)throw new Error(error.message);revalidatePath(`/documents/${id}`);revalidatePath(`/sales/${saleId}`);revalidatePath("/documents")}
export async function regenerateDocumentToday(id:string,saleId:string){const db=await createClient();const{team}=await getTeamContext();const{error}=await db.from("documents").update({generated_at:new Date().toISOString()}).eq("team_id",team.id).eq("id",id);if(error)throw new Error(error.message);revalidatePath(`/documents/${id}`);revalidatePath(`/sales/${saleId}`);revalidatePath("/documents");revalidatePath("/dashboard")}
