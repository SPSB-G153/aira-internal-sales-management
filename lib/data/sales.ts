import { createClient } from "@/lib/supabase/server";
import type { Sale } from "@/lib/types";

export async function getSales(search="",status="") {
  const db=await createClient();
  let query=db.from("sales").select("*").order("status",{ascending:false}).order("sale_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
  if(status) query=query.eq("status",status);
  if(search) query=query.or(`customer_name.ilike.%${search.replaceAll(",","")}%,project_name.ilike.%${search.replaceAll(",","")}%,sale_reference.ilike.%${search.replaceAll(",","")}%`);
  const {data,error}=await query;
  if(error) throw new Error(error.message);
  return (data??[]) as Sale[];
}
export async function getSale(id:string) {
  const db=await createClient(); const {data,error}=await db.from("sales").select("*").eq("id",id).single();
  if(error) throw new Error(error.message); return data as Sale;
}
export async function createSale(values:Omit<Partial<Sale>,"id"|"created_at">) {
  const db=await createClient(); const {data,error}=await db.from("sales").insert(values).select("*").single();
  if(error) throw new Error(error.message); return data as Sale;
}
export async function updateSale(id:string,values:Partial<Sale>) {
  const db=await createClient(); const {data,error}=await db.from("sales").update(values).eq("id",id).select("*").single();
  if(error) throw new Error(error.message); return data as Sale;
}
