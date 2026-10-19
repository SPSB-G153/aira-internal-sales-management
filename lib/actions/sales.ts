"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSale,getSale,updateSale } from "@/lib/data/sales";
import { buildDocumentSnapshot } from "@/lib/templates";
import { getTeamContext } from "@/lib/tenancy";
import { detailsForUnit, squareFeetToSquareMetres, storeyForUnit } from "@/lib/unit-details";
import type { DocumentType,Sale } from "@/lib/types";
import { combineAgencyDetails, splitAgencyDetails } from "@/lib/agency-details";

export type FormState={error?:string;fields?:Record<string,string>;fieldErrors?:Record<string,string>};
export type ConfirmState={error?:string};
export type DeleteSaleState={error?:string};
export type PopAdminSaveState={error?:string;saved?:boolean};
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const numeric=(f:FormData,k:string)=>{const v=text(f,k);return v===""?null:Number(v)};
const optionalBoolean=(f:FormData,k:string)=>{const v=text(f,k);return v==="true"?true:v==="false"?false:null};
const isMalayRace=(race:string)=>/\b(malay|melayu)\b/i.test(race.trim());
const fullSex=(value:string)=>{const normalized=value.trim().toUpperCase();return normalized==="M"||normalized==="MALE"?"Male":normalized==="F"||normalized==="FEMALE"?"Female":value.trim();};
const normalizeNationality=(value:string)=>{const trimmed=value.trim();return ["UK","US","USA","UAE","PRC"].includes(trimmed.toUpperCase())?trimmed.toUpperCase():trimmed;};
export async function saveSale(_:FormState,form:FormData):Promise<FormState>{
  const fields=Object.fromEntries([...form.entries()].map(([k,v])=>[k,String(v)]));
  const entryMode=text(form,"entry_mode")==="pop"?"pop":"booking";
  const requestedSaveIntent=text(form,"save_intent");
  const saveIntent=requestedSaveIntent==="draft"?"draft":"final";
  const uploadAnother=requestedSaveIntent==="final_and_new";
  const fieldErrors:Record<string,string>={}; if(!text(form,"customer_name"))fieldErrors.customer_name="Customer name is required.";if(!text(form,"project_name"))fieldErrors.project_name="Project is required.";const price=numeric(form,"purchase_price");if(!price||price<=0)fieldErrors.purchase_price="Enter a purchase price greater than zero.";
  const uploadedBookingFee=numeric(form,"booking_fee");if(entryMode==="booking"&&saveIntent==="final"&&uploadedBookingFee==null)fieldErrors.booking_fee="Upload the banking receipt or enter the actual amount paid.";
  const email=text(form,"customer_email");if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fieldErrors.customer_email="Enter a valid email address.";
  for(const key of ["floor_area","floor_area_sqm","rebate_amount","quoted_id_net_selling_price"]){const value=numeric(form,key);if(value!=null&&value<0)fieldErrors[key]="Enter zero or a positive amount."}
  if(Object.keys(fieldErrors).length)return{fields,fieldErrors};
  const bookingFee=uploadedBookingFee;
  const purchaserType:"company"|"individual"=text(form,"purchaser_type")==="company"?"company":"individual";
  const paymentMethodValue=text(form,"payment_method");
  const paymentMethod:"cheque"|"bank_transfer"|null=paymentMethodValue==="cheque"||paymentMethodValue==="bank_transfer"?paymentMethodValue:null;
  const status=entryMode==="pop"?"draft" as const:saveIntent==="draft"?"booking_draft" as const:"confirmed" as const;
  const values={sale_reference:text(form,"sale_reference")||`S-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,customer_name:text(form,"customer_name"),customer_ic:text(form,"customer_ic")||null,purchaser_type:purchaserType,customer_name_2:text(form,"customer_name_2")||null,customer_ic_2:text(form,"customer_ic_2")||null,customer_salutation_2:text(form,"customer_salutation_2")||null,customer_tin_2:text(form,"customer_tin_2")||null,customer_nationality_2:text(form,"customer_nationality_2")||null,customer_sex_2:text(form,"customer_sex_2")||null,customer_race_2:text(form,"customer_race_2")||null,bumi_status_2:optionalBoolean(form,"bumi_status_2"),customer_occupation_2:text(form,"customer_occupation_2")||null,contact_person_2:text(form,"contact_person_2")||null,customer_address_2:text(form,"customer_address_2")||null,customer_phone_2:text(form,"customer_phone_2")||null,customer_email_2:text(form,"customer_email_2")||null,customer_salutation:text(form,"customer_salutation")||null,customer_tin:text(form,"customer_tin")||null,customer_nationality:text(form,"customer_nationality")||null,customer_sex:text(form,"customer_sex")||null,customer_race:text(form,"customer_race")||null,bumi_status:optionalBoolean(form,"bumi_status"),customer_occupation:text(form,"customer_occupation")||null,contact_person:text(form,"contact_person")||null,customer_address:text(form,"customer_address")||null,customer_phone:text(form,"customer_phone")||null,customer_email:text(form,"customer_email")||null,project_name:text(form,"project_name"),unit_number:text(form,"unit_number")||null,storey_number:text(form,"storey_number")||null,unit_type:text(form,"unit_type")||null,floor_area:numeric(form,"floor_area"),floor_area_sqm:numeric(form,"floor_area_sqm"),car_parking_bay:text(form,"car_parking_bay")||null,purchase_price:price!,booking_fee:bookingFee,rebate_amount:numeric(form,"rebate_amount"),quoted_id_net_selling_price:numeric(form,"quoted_id_net_selling_price"),payment_method:paymentMethod,payment_reference:text(form,"payment_reference")||null,salesperson_name:text(form,"salesperson_name")||null,salesperson_designation:text(form,"salesperson_designation")||null,salesperson_mobile:text(form,"salesperson_mobile")||null,salesperson_email:text(form,"salesperson_email")||null,agent_company:combineAgencyDetails(text(form,"agent_company"),text(form,"agent_address"))||null,solicitor_name:text(form,"solicitor_name")||null,sale_date:text(form,"sale_date")||null,authorised_signatory_name:text(form,"authorised_signatory_name")||null,authorised_signatory_position:text(form,"authorised_signatory_position")||null,pop_proposal_note:text(form,"pop_proposal_note")||null,pop_recommendation_note:text(form,"pop_recommendation_note")||null,pop_feasibility_note:text(form,"pop_feasibility_note")||null,pop_comments_note:text(form,"pop_comments_note")||null,status};
  const approvedStorey=storeyForUnit(values.unit_number||"");if(approvedStorey)values.storey_number=approvedStorey;
  const unitDetails=detailsForUnit(values.unit_number||"");if(unitDetails){values.floor_area=unitDetails.floorAreaSquareFeet;values.floor_area_sqm=squareFeetToSquareMetres(unitDetails.floorAreaSquareFeet);values.unit_type=unitDetails.unitType;if(unitDetails.parkingBay)values.car_parking_bay=unitDetails.parkingBay;}
  values.bumi_status=isMalayRace(values.customer_race||"");if(values.customer_name_2||values.customer_ic_2)values.bumi_status_2=isMalayRace(values.customer_race_2||"");
  values.customer_sex=fullSex(values.customer_sex||"")||null;if(values.customer_name_2||values.customer_ic_2)values.customer_sex_2=fullSex(values.customer_sex_2||"")||null;
  values.customer_nationality=normalizeNationality(values.customer_nationality||"")||null;if(values.customer_name_2||values.customer_ic_2)values.customer_nationality_2=normalizeNationality(values.customer_nationality_2||"")||null;
  let sale:Sale;try{const id=text(form,"id");sale=id?await updateSale(id,values):await createSale(values);const db=await createClient();const{team}=await getTeamContext();const{data:{user}}=await db.auth.getUser();const generated_at=new Date().toISOString();if(sale.status==="draft"){const{error}=await db.from("documents").upsert({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type:"pre_booking_form",content:buildDocumentSnapshot(sale,"pre_booking_form"),status:"generated",generated_at},{onConflict:"sale_id,document_type"});if(error)throw error;}else if(sale.status!=="booking_draft"){const types:DocumentType[]=["booking_form","acceptance_letter","agent_commission_letter"];if(sale.rebate_amount&&sale.rebate_amount>0)types.push("rebate_letter");if(sale.quoted_id_net_selling_price&&sale.quoted_id_net_selling_price>0)types.push("inventory_confirmation_letter");const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at}));const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw error;}}catch(e){return{error:e instanceof Error?e.message:"Failed to save sale.",fields}}
  revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");redirect(uploadAnother?"/sales/new":`/sales/${sale.id}`);
}
export async function savePopAdminDetails(id:string,fields:Record<string,string>):Promise<PopAdminSaveState>{
  try{
    const sale=await getSale(id);
    const existingAgency=splitAgencyDetails(sale.agent_company);
    const clean=(key:string)=>String(fields[key]??"").trim();
    const company=clean("agent_company")||existingAgency.company;
    const address=clean("agent_address")||existingAgency.address;
    const values:Partial<Sale>={};
    const allowed=["sale_reference","salesperson_name","salesperson_designation","salesperson_mobile","salesperson_email"] as const;
    for(const key of allowed){const value=clean(key);if(value)values[key]=value;}
    if(company||address)values.agent_company=combineAgencyDetails(company,address)||null;
    const updated=await updateSale(id,values);
    const db=await createClient();
    const[{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const{data:documents,error:documentsError}=await db.from("documents").select("document_type,status,generated_at").eq("team_id",team.id).eq("sale_id",id);
    if(documentsError)throw documentsError;
    if(documents?.length){
      const rows=documents.map(document=>({
        team_id:team.id,user_id:user?.id??null,sale_id:id,
        document_type:document.document_type,
        content:buildDocumentSnapshot(updated,document.document_type as DocumentType),
        status:document.status,generated_at:document.generated_at,
      }));
      const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});
      if(error)throw error;
    }
    revalidatePath(`/sales/${id}`);revalidatePath(`/sales/${id}/edit`);revalidatePath("/documents");revalidatePath("/dashboard");
    return{saved:true};
  }catch(error){return{error:error instanceof Error?error.message:"Could not save the POP administration details."};}
}
export async function confirmSale(id:string,_:ConfirmState,__form:FormData):Promise<ConfirmState>{
  try {
    const sale=await getSale(id); const db=await createClient(); const [{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const types:DocumentType[]=["booking_form","acceptance_letter","agent_commission_letter"];
    if(sale.rebate_amount&&sale.rebate_amount>0)types.push("rebate_letter");
    if(sale.quoted_id_net_selling_price&&sale.quoted_id_net_selling_price>0)types.push("inventory_confirmation_letter");
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
export async function generateHovpAfterClearance(id:string):Promise<ConfirmState>{
  return generateHovp(id,{},new FormData());
}
export async function deleteSale(id:string,_:DeleteSaleState,form:FormData):Promise<DeleteSaleState>{
  const confirmationReference=text(form,"confirmation_reference");
  try {
    const db=await createClient();
    const [{team,role},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    if(!user||role!=="owner")return{error:"Only the signed-in workspace owner can delete a booking."};
    const{data:sale,error:saleError}=await db.from("sales").select("id,sale_reference").eq("team_id",team.id).eq("id",id).single();
    if(saleError||!sale)return{error:"This booking could not be found in your workspace."};
    if(confirmationReference!==sale.sale_reference)return{error:`Type ${sale.sale_reference} exactly to confirm deletion.`};
    const{error}=await db.rpc("delete_sale_with_documents",{target_sale_id:id,confirmation_reference:confirmationReference});
    if(error&&!["PGRST202","42883"].includes(error.code))throw new Error(error.message);
    // During a rolling deploy the UI can arrive just before the migration.
    // Keep the same server-side owner check and use the existing scoped RLS
    // until the transactional RPC is visible in PostgREST's schema cache.
    if(error){
      const{error:documentsError}=await db.from("documents").delete().eq("team_id",team.id).eq("sale_id",id);
      if(documentsError)throw new Error(documentsError.message);
      const{data:deletedSale,error:saleDeleteError}=await db.from("sales").delete().eq("team_id",team.id).eq("id",id).select("id").single();
      if(saleDeleteError||!deletedSale)throw new Error(saleDeleteError?.message??"Booking was not deleted.");
    }
  }catch{
    return{error:"The booking was not deleted. Please check that you are signed in as the owner and try again."};
  }
  revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");redirect("/sales?deleted=1");
}
