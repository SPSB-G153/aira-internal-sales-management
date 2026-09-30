"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSale,getSale,updateSale } from "@/lib/data/sales";
import { buildDocumentSnapshot,documentOrder } from "@/lib/templates";
import { getTeamContext } from "@/lib/tenancy";

export type FormState={error?:string;fields?:Record<string,string>;fieldErrors?:Record<string,string>};
export type ConfirmState={error?:string};
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const numeric=(f:FormData,k:string)=>{const v=text(f,k);return v===""?null:Number(v)};
export async function saveSale(_:FormState,form:FormData):Promise<FormState>{
  const fields=Object.fromEntries([...form.entries()].map(([k,v])=>[k,String(v)]));
  const fieldErrors:Record<string,string>={}; if(!text(form,"customer_name"))fieldErrors.customer_name="Customer name is required.";if(!text(form,"project_name"))fieldErrors.project_name="Project is required.";const price=numeric(form,"purchase_price");if(!price||price<=0)fieldErrors.purchase_price="Enter a purchase price greater than zero.";
  const email=text(form,"customer_email");if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fieldErrors.customer_email="Enter a valid email address.";
  for(const key of ["floor_area","booking_fee","spa_value","loan_amount","rebate_amount"]){const value=numeric(form,key);if(value!=null&&value<0)fieldErrors[key]="Enter zero or a positive amount."}
  if(Object.keys(fieldErrors).length)return{fields,fieldErrors};
  const loan=numeric(form,"loan_amount"),rebate=numeric(form,"rebate_amount");
  const values={sale_reference:text(form,"sale_reference")||`S-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,customer_name:text(form,"customer_name"),customer_ic:text(form,"customer_ic")||null,customer_address:text(form,"customer_address")||null,customer_phone:text(form,"customer_phone")||null,customer_email:text(form,"customer_email")||null,project_name:text(form,"project_name"),unit_number:text(form,"unit_number")||null,unit_type:text(form,"unit_type")||null,floor_area:numeric(form,"floor_area"),purchase_price:price!,booking_fee:numeric(form,"booking_fee"),spa_value:numeric(form,"spa_value"),loan_amount:loan,loan_percentage:loan?Math.round(loan/price!*10000)/100:null,rebate_amount:rebate,rebate_percentage:rebate?Math.round(rebate/price!*10000)/100:null,salesperson_name:text(form,"salesperson_name")||null,sale_date:text(form,"sale_date")||null,status:"draft" as const};
  let sale;try{const id=text(form,"id");sale=id?await updateSale(id,values):await createSale(values)}catch(e){return{error:e instanceof Error?e.message:"Failed to save sale.",fields}}
  revalidatePath("/sales");redirect(`/sales/${sale.id}`);
}
export async function confirmSale(id:string,_:ConfirmState,__form:FormData):Promise<ConfirmState>{
  try {
    const sale=await getSale(id); const db=await createClient(); const [{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const rows=documentOrder.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at:new Date().toISOString()}));
    const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw new Error(error.message);
    await updateSale(id,{status:"confirmed"});
  } catch {
    return {error:"Failed to confirm the sale and generate its documents."};
  }
  revalidatePath(`/sales/${id}`);revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");redirect(`/sales/${id}?confirmed=1`);
}
