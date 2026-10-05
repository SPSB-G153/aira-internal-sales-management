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
const optionalBoolean=(f:FormData,k:string)=>{const v=text(f,k);return v==="true"?true:v==="false"?false:null};
export async function saveSale(_:FormState,form:FormData):Promise<FormState>{
  const fields=Object.fromEntries([...form.entries()].map(([k,v])=>[k,String(v)]));
  const fieldErrors:Record<string,string>={}; if(!text(form,"customer_name"))fieldErrors.customer_name="Customer name is required.";if(!text(form,"project_name"))fieldErrors.project_name="Project is required.";const price=numeric(form,"purchase_price");if(!price||price<=0)fieldErrors.purchase_price="Enter a purchase price greater than zero.";
  const email=text(form,"customer_email");if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fieldErrors.customer_email="Enter a valid email address.";
  for(const key of ["floor_area","floor_area_sqm","rebate_amount","quoted_id_net_selling_price"]){const value=numeric(form,key);if(value!=null&&value<0)fieldErrors[key]="Enter zero or a positive amount."}
  if(Object.keys(fieldErrors).length)return{fields,fieldErrors};
  const bookingFee=Math.round(price!*2)/100;
  const purchaserType=text(form,"purchaser_type")==="company"?"company":"individual";
  const paymentMethod=text(form,"payment_method");
  const values={sale_reference:text(form,"sale_reference")||`S-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,customer_name:text(form,"customer_name"),customer_ic:text(form,"customer_ic")||null,purchaser_type:purchaserType,customer_name_2:text(form,"customer_name_2")||null,customer_ic_2:text(form,"customer_ic_2")||null,customer_salutation_2:text(form,"customer_salutation_2")||null,customer_tin_2:text(form,"customer_tin_2")||null,customer_nationality_2:text(form,"customer_nationality_2")||null,customer_sex_2:text(form,"customer_sex_2")||null,customer_race_2:text(form,"customer_race_2")||null,bumi_status_2:optionalBoolean(form,"bumi_status_2"),customer_occupation_2:text(form,"customer_occupation_2")||null,contact_person_2:text(form,"contact_person_2")||null,customer_address_2:text(form,"customer_address_2")||null,customer_phone_2:text(form,"customer_phone_2")||null,customer_email_2:text(form,"customer_email_2")||null,customer_salutation:text(form,"customer_salutation")||null,customer_tin:text(form,"customer_tin")||null,customer_nationality:text(form,"customer_nationality")||null,customer_sex:text(form,"customer_sex")||null,customer_race:text(form,"customer_race")||null,bumi_status:optionalBoolean(form,"bumi_status"),customer_occupation:text(form,"customer_occupation")||null,contact_person:text(form,"contact_person")||null,customer_address:text(form,"customer_address")||null,customer_phone:text(form,"customer_phone")||null,customer_email:text(form,"customer_email")||null,project_name:text(form,"project_name"),unit_number:text(form,"unit_number")||null,storey_number:text(form,"storey_number")||null,unit_type:text(form,"unit_type")||null,floor_area:numeric(form,"floor_area"),floor_area_sqm:numeric(form,"floor_area_sqm"),car_parking_bay:text(form,"car_parking_bay")||null,purchase_price:price!,booking_fee:bookingFee,rebate_amount:numeric(form,"rebate_amount"),quoted_id_net_selling_price:numeric(form,"quoted_id_net_selling_price"),payment_method:paymentMethod==="cheque"||paymentMethod==="bank_transfer"?paymentMethod:null,payment_reference:text(form,"payment_reference")||null,salesperson_name:text(form,"salesperson_name")||null,agent_company:text(form,"agent_company")||null,solicitor_name:text(form,"solicitor_name")||null,sale_date:text(form,"sale_date")||null,authorised_signatory_name:text(form,"authorised_signatory_name")||null,authorised_signatory_position:text(form,"authorised_signatory_position")||null,status:"draft" as const};
  let sale;try{const id=text(form,"id");sale=id?await updateSale(id,values):await createSale(values);const db=await createClient();const{team}=await getTeamContext();const{data:{user}}=await db.auth.getUser();const{error:popError}=await db.from("documents").upsert({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type:"pre_booking_form",content:buildDocumentSnapshot(sale,"pre_booking_form"),status:"generated",generated_at:new Date().toISOString()},{onConflict:"sale_id,document_type"});if(popError)throw popError;if(sale.status!=="draft"){const{error:bookingError}=await db.from("documents").upsert({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type:"booking_form",content:buildDocumentSnapshot(sale,"booking_form"),status:"generated",generated_at:new Date().toISOString()},{onConflict:"sale_id,document_type"});if(bookingError)throw bookingError;}if(id&&sale.status!=="draft"){const{data:documents,error}=await db.from("documents").select("id,document_type").eq("sale_id",id);if(error)throw new Error(error.message);await Promise.all((documents??[]).filter(doc=>doc.document_type!=="pre_booking_form").map(doc=>db.from("documents").update({content:buildDocumentSnapshot(sale,doc.document_type as typeof documentOrder[number])}).eq("id",doc.id)));const addDocument=async(document_type:"rebate_letter"|"inventory_confirmation_letter")=>{const{error}=await db.from("documents").upsert({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at:new Date().toISOString()},{onConflict:"sale_id,document_type"});if(error)throw error;};if(sale.rebate_amount&&sale.rebate_amount>0&&!(documents??[]).some(doc=>doc.document_type==="rebate_letter"))await addDocument("rebate_letter");if(sale.quoted_id_net_selling_price&&sale.quoted_id_net_selling_price>0&&!(documents??[]).some(doc=>doc.document_type==="inventory_confirmation_letter"))await addDocument("inventory_confirmation_letter");}}catch(e){return{error:e instanceof Error?e.message:"Failed to save sale.",fields}}
  revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");redirect(`/sales/${sale.id}`);
}
export async function confirmSale(id:string,_:ConfirmState,__form:FormData):Promise<ConfirmState>{
  try {
    const sale=await getSale(id); const db=await createClient(); const [{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const types=["booking_form","acceptance_letter",...(sale.rebate_amount&&sale.rebate_amount>0?["rebate_letter"]:[]),...(sale.quoted_id_net_selling_price&&sale.quoted_id_net_selling_price>0?["inventory_confirmation_letter"]:[])] as const;
    const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at:new Date().toISOString()}));
    const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw new Error(error.message);
    await updateSale(id,{status:"confirmed"});
  } catch {
    return {error:"Failed to confirm the sale and generate its booking form."};
  }
  revalidatePath(`/sales/${id}`);revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");redirect(`/sales/${id}?confirmed=1`);
}
export async function markSpaSigned(id:string,_:ConfirmState,__form:FormData):Promise<ConfirmState>{
  try { await updateSale(id,{status:"spa_signed"}); } catch { return {error:"Could not mark the SPA as signed."}; }
  revalidatePath(`/sales/${id}`);revalidatePath("/sales");revalidatePath("/dashboard");return {};
}
export async function generateHovp(id:string,_:ConfirmState,__form:FormData):Promise<ConfirmState>{
  try {
    const sale=await getSale(id);if(sale.status!=="spa_signed")return{error:"Record the SPA as signed before issuing the HOVP letter."};
    const db=await createClient();const[{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const{error}=await db.from("documents").upsert({team_id:team.id,user_id:user?.id??null,sale_id:id,document_type:"hovp_letter",content:buildDocumentSnapshot(sale,"hovp_letter"),status:"generated",generated_at:new Date().toISOString()},{onConflict:"sale_id,document_type"});if(error)throw error;
    await updateSale(id,{status:"hovp_ready"});
  } catch { return {error:"Could not issue the HOVP letter."}; }
  revalidatePath(`/sales/${id}`);revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");return {};
}
