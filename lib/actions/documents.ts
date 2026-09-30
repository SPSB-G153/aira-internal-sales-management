"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function markDocumentReviewed(id:string,saleId:string){const db=await createClient();const{error}=await db.from("documents").update({status:"reviewed"}).eq("id",id);if(error)throw new Error(error.message);revalidatePath(`/documents/${id}`);revalidatePath(`/sales/${saleId}`);revalidatePath("/documents")}
