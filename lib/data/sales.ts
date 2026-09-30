import { createClient } from "@/lib/supabase/server";
import type { Sale } from "@/lib/types";
import { getTeamContext } from "@/lib/tenancy";

export async function getSales(search="",status="") {
  const db=await createClient();
  const {team}=await getTeamContext();
  let query=db.from("sales").select("*").eq("team_id",team.id).order("status",{ascending:false}).order("sale_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
  if(status) query=query.eq("status",status);
  if(search) query=query.or(`customer_name.ilike.%${search.replaceAll(",","")}%,project_name.ilike.%${search.replaceAll(",","")}%,sale_reference.ilike.%${search.replaceAll(",","")}%`);
  const {data,error}=await query;
  if(error) throw new Error(error.message);
  return (data??[]) as Sale[];
}
export async function getSale(id:string) {
  const db=await createClient(); const {team}=await getTeamContext(); const {data,error}=await db.from("sales").select("*").eq("team_id",team.id).eq("id",id).single();
  if(error) throw new Error(error.message); return data as Sale;
}
export async function createSale(values:Omit<Partial<Sale>,"id"|"created_at">) {
  const db=await createClient(); const [{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]); const {data,error}=await db.from("sales").insert({...values,team_id:team.id,user_id:user?.id??null}).select("*").single();
  if(error) throw new Error(error.message); return data as Sale;
}
export async function updateSale(id:string,values:Partial<Sale>) {
  const db=await createClient(); const {team}=await getTeamContext(); const {team_id:_,...safeValues}=values; const {data,error}=await db.from("sales").update(safeValues).eq("team_id",team.id).eq("id",id).select("*").single();
  if(error) throw new Error(error.message); return data as Sale;
}
