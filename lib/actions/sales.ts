"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSale,getSale,getSales,updateSale } from "@/lib/data/sales";
import { buildDocumentSnapshot } from "@/lib/templates";
import { getTeamContext } from "@/lib/tenancy";
import { detailsForUnit, squareFeetToSquareMetres, storeyForUnit } from "@/lib/unit-details";
import type { DocumentType,Sale } from "@/lib/types";
import { combineAgencyDetails, hasExternalAgent, splitAgencyDetails } from "@/lib/agency-details";

export type FormState={error?:string;fields?:Record<string,string>;fieldErrors?:Record<string,string>};
export type ConfirmState={error?:string};
export type DeleteSaleState={error?:string};
export type PopAdminSaveState={error?:string;saved?:boolean;agentLetterId?:string;agencyAppointmentLetterId?:string};
export type UploadedPopSaveState={error?:string;saleId?:string;previewDocumentId?:string;agentLetterId?:string;agencyAppointmentLetterId?:string};
export type SavedAgentDetails={agent_company:string;agent_address:string;agent_name:string;agent_designation:string;agent_mobile:string;agent_email:string};
export type SavedSalespersonDetails={salesperson_name:string;salesperson_designation:string;salesperson_mobile:string;salesperson_email:string};
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const numeric=(f:FormData,k:string)=>{const v=text(f,k);return v===""?null:Number(v)};
const optionalBoolean=(f:FormData,k:string)=>{const v=text(f,k);return v==="true"?true:v==="false"?false:null};
const isMalayRace=(race:string)=>/\b(malay|melayu)\b/i.test(race.trim());
const fullSex=(value:string)=>{const normalized=value.trim().toUpperCase();return normalized==="M"||normalized==="MALE"?"Male":normalized==="F"||normalized==="FEMALE"?"Female":value.trim();};
const normalizeNationality=(value:string)=>{const trimmed=value.trim();return ["UK","US","USA","UAE","PRC"].includes(trimmed.toUpperCase())?trimmed.toUpperCase():trimmed;};
const normalizeCompany=(value:string)=>value.toUpperCase().replace(/[^A-Z0-9]/g,"");
export async function findSavedAgentDetails(company:string):Promise<SavedAgentDetails|null>{
  const wanted=normalizeCompany(company);
  if(!wanted)return null;
  const matches=(await getSales()).map(sale=>splitAgencyDetails(sale.agent_company)).filter(details=>normalizeCompany(details.company)===wanted&&Boolean(details.agent_name||details.agent_email||details.agent_mobile));
  const unique=new Map(matches.map(details=>[[details.agent_name,details.agent_email,details.agent_mobile].map(value=>value.trim().toUpperCase()).join("|"),details]));
  if(unique.size!==1)return null;
  const details=[...unique.values()][0];
  return{agent_company:details.company,agent_address:details.address,agent_name:details.agent_name,agent_designation:details.agent_designation,agent_mobile:details.agent_mobile,agent_email:details.agent_email};
}
export async function findSavedSalespersonDetails(name:string):Promise<SavedSalespersonDetails|null>{
  const wanted=name.trim().toLocaleLowerCase("en-MY");
  if(!wanted)return null;
  const matches=(await getSales()).filter(sale=>sale.salesperson_name?.trim().toLocaleLowerCase("en-MY")===wanted);
  const withMobile=matches.find(sale=>Boolean(sale.salesperson_mobile?.trim()));
  const saved=withMobile??matches.find(sale=>Boolean(sale.salesperson_email?.trim()||sale.salesperson_designation?.trim()));
  if(!saved)return null;
  return{salesperson_name:saved.salesperson_name||name,salesperson_designation:saved.salesperson_designation||"",salesperson_mobile:saved.salesperson_mobile||"",salesperson_email:saved.salesperson_email||""};
}
export async function saveSale(_:FormState,form:FormData):Promise<FormState>{
  const fields=Object.fromEntries([...form.entries()].map(([k,v])=>[k,String(v)]));
  const entryMode=text(form,"entry_mode")==="pop"?"pop":"booking";
  const bookingSource=text(form,"booking_source")==="uploaded"?"uploaded":"manual";
  const requestedSaveIntent=text(form,"save_intent");
  const saveIntent=requestedSaveIntent==="draft"?"draft":"final";
  const uploadAnother=requestedSaveIntent==="final_and_new";
  const fieldErrors:Record<string,string>={}; if(!text(form,"customer_name"))fieldErrors.customer_name="Customer name is required.";if(!text(form,"project_name"))fieldErrors.project_name="Project is required.";const price=numeric(form,"purchase_price");if(!price||price<=0)fieldErrors.purchase_price="Enter a purchase price greater than zero.";
  const uploadedBookingFee=numeric(form,"booking_fee");if(entryMode==="booking"&&saveIntent==="final"&&uploadedBookingFee==null)fieldErrors.booking_fee="Upload the banking receipt or enter the actual amount paid.";
  const email=text(form,"customer_email");if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fieldErrors.customer_email="Enter a valid email address.";
  for(const key of ["floor_area","floor_area_sqm","rebate_amount","quoted_id_net_selling_price","approved_selling_price","additional_revenue","repeat_buyer_discount"]){const value=numeric(form,key);if(value!=null&&value<0)fieldErrors[key]="Enter zero or a positive amount."}
  if(entryMode==="pop"){
    const approved=numeric(form,"approved_selling_price");
    const additional=numeric(form,"additional_revenue")??0;
    const discount=numeric(form,"repeat_buyer_discount")??0;
    if(approved!=null&&price!=null&&Math.abs((approved-discount+additional)-price)>0.01){
      fieldErrors.purchase_price="Purchase Price / SPA Price must equal Approved Selling Price minus Repeat Buyer Discount plus Additional Revenue.";
    }
  }
  if(Object.keys(fieldErrors).length)return{fields,fieldErrors};
  const bookingFee=uploadedBookingFee;
  const purchaserType:"company"|"individual"=text(form,"purchaser_type")==="company"?"company":"individual";
  const paymentMethodValue=text(form,"payment_method");
  const paymentMethod:"cheque"|"bank_transfer"|null=paymentMethodValue==="cheque"||paymentMethodValue==="bank_transfer"?paymentMethodValue:null;
  const status=entryMode==="pop"?"draft" as const:saveIntent==="draft"?"booking_draft" as const:"confirmed" as const;
  const values={sale_reference:text(form,"sale_reference")||`S-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,customer_name:text(form,"customer_name"),customer_ic:text(form,"customer_ic")||null,purchaser_type:purchaserType,customer_name_2:text(form,"customer_name_2")||null,customer_ic_2:text(form,"customer_ic_2")||null,customer_salutation_2:text(form,"customer_salutation_2")||null,customer_tin_2:text(form,"customer_tin_2")||null,customer_nationality_2:text(form,"customer_nationality_2")||null,customer_sex_2:text(form,"customer_sex_2")||null,customer_race_2:text(form,"customer_race_2")||null,bumi_status_2:optionalBoolean(form,"bumi_status_2"),customer_occupation_2:text(form,"customer_occupation_2")||null,contact_person_2:text(form,"contact_person_2")||null,customer_address_2:text(form,"customer_address_2")||null,customer_phone_2:text(form,"customer_phone_2")||null,customer_email_2:text(form,"customer_email_2")||null,customer_salutation:text(form,"customer_salutation")||null,customer_tin:text(form,"customer_tin")||null,customer_nationality:text(form,"customer_nationality")||null,customer_sex:text(form,"customer_sex")||null,customer_race:text(form,"customer_race")||null,bumi_status:optionalBoolean(form,"bumi_status"),customer_occupation:text(form,"customer_occupation")||null,contact_person:text(form,"contact_person")||null,customer_address:text(form,"customer_address")||null,customer_phone:text(form,"customer_phone")||null,customer_email:text(form,"customer_email")||null,project_name:text(form,"project_name"),unit_number:text(form,"unit_number")||null,storey_number:text(form,"storey_number")||null,unit_type:text(form,"unit_type")||null,floor_area:numeric(form,"floor_area"),floor_area_sqm:numeric(form,"floor_area_sqm"),car_parking_bay:text(form,"car_parking_bay")||null,purchase_price:price!,booking_fee:bookingFee,rebate_amount:numeric(form,"rebate_amount"),quoted_id_net_selling_price:numeric(form,"quoted_id_net_selling_price"),approved_selling_price:numeric(form,"approved_selling_price"),additional_revenue:numeric(form,"additional_revenue"),repeat_buyer_discount:numeric(form,"repeat_buyer_discount"),pop_introduction_agent:text(form,"pop_introduction_agent")||null,pop_introduction_spsb:text(form,"pop_introduction_spsb")||null,pop_assisting_member_2:text(form,"pop_assisting_member_2")||null,payment_method:paymentMethod,payment_reference:text(form,"payment_reference")||null,salesperson_name:text(form,"salesperson_name")||null,salesperson_designation:text(form,"salesperson_designation")||null,salesperson_mobile:text(form,"salesperson_mobile")||null,salesperson_email:text(form,"salesperson_email")||null,agent_company:combineAgencyDetails(text(form,"agent_company"),text(form,"agent_address"))||null,solicitor_name:text(form,"solicitor_name")||null,sale_date:text(form,"sale_date")||null,authorised_signatory_name:text(form,"authorised_signatory_name")||null,authorised_signatory_position:text(form,"authorised_signatory_position")||null,pop_proposal_note:text(form,"pop_proposal_note")||null,pop_conditions_note:text(form,"pop_conditions_note")||null,pop_recommendation_note:text(form,"pop_recommendation_note")||null,pop_feasibility_note:text(form,"pop_feasibility_note")||null,pop_comments_note:text(form,"pop_comments_note")||null,status};
  values.agent_company=combineAgencyDetails(text(form,"agent_company"),text(form,"agent_address"),text(form,"agent_name"),text(form,"agent_designation"),text(form,"agent_mobile"),text(form,"agent_email"))||null;
  if(values.unit_type)values.unit_type=values.unit_type.toUpperCase();
  const approvedStorey=storeyForUnit(values.unit_number||"");if(approvedStorey)values.storey_number=approvedStorey;
  const unitDetails=detailsForUnit(values.unit_number||"");if(unitDetails){values.floor_area=unitDetails.floorAreaSquareFeet;values.floor_area_sqm=squareFeetToSquareMetres(unitDetails.floorAreaSquareFeet);values.unit_type=unitDetails.unitType.toUpperCase();if(unitDetails.parkingBay)values.car_parking_bay=unitDetails.parkingBay;}
  values.bumi_status=isMalayRace(values.customer_race||"");if(values.customer_name_2||values.customer_ic_2)values.bumi_status_2=isMalayRace(values.customer_race_2||"");
  values.customer_sex=fullSex(values.customer_sex||"")||null;if(values.customer_name_2||values.customer_ic_2)values.customer_sex_2=fullSex(values.customer_sex_2||"")||null;
  values.customer_nationality=normalizeNationality(values.customer_nationality||"")||null;if(values.customer_name_2||values.customer_ic_2)values.customer_nationality_2=normalizeNationality(values.customer_nationality_2||"")||null;
  let sale:Sale;
  let agentLetterId:string|null=null;
  try{
    let id=text(form,"id");
    if(!id&&entryMode==="booking"&&values.unit_number){
      const normalizedUnit=values.unit_number.trim().toUpperCase();
      const linkedPop=(await getSales(values.unit_number)).find(candidate=>
        candidate.unit_number?.trim().toUpperCase()===normalizedUnit&&
        (candidate.status==="draft"||candidate.status==="booking_draft")
      );
      if(linkedPop){
        id=linkedPop.id;
        if(!text(form,"sale_reference"))values.sale_reference=linkedPop.sale_reference;
        if(!values.agent_company)values.agent_company=linkedPop.agent_company;
        for(const key of ["approved_selling_price","additional_revenue","repeat_buyer_discount","pop_introduction_agent","pop_introduction_spsb","pop_assisting_member_2","pop_proposal_note","pop_conditions_note","pop_recommendation_note","pop_feasibility_note","pop_comments_note"] as const){
          if(values[key]==null||values[key]==="")values[key]=linkedPop[key] as never;
        }
      }
    }
    sale=id?await updateSale(id,values):await createSale(values);
    const db=await createClient();
    const{team}=await getTeamContext();
    const{data:{user}}=await db.auth.getUser();
    const generated_at=new Date().toISOString();
    if(sale.status==="draft"){
      const types:DocumentType[]=["pre_booking_form"];
      if(hasExternalAgent(sale))types.push("agency_appointment_letter","agent_commission_letter");
      const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at}));
      const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw error;
    }else if(sale.status==="booking_draft"){
      const types:DocumentType[]=[];
      if(bookingSource==="manual")types.push("booking_form");
      if(hasExternalAgent(sale))types.push("agency_appointment_letter","agent_commission_letter");
      if(types.length){
        const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:{...buildDocumentSnapshot(sale,document_type),...(document_type==="booking_form"?{booking_source:"manual"}:{})},status:document_type==="booking_form"?"pending":"generated",generated_at}));
        const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw error;
      }
    }else{
      const types:DocumentType[]=["acceptance_letter"];
      if(hasExternalAgent(sale))types.push("agency_appointment_letter","agent_commission_letter");
      if(bookingSource==="manual")types.unshift("booking_form");
      if(sale.rebate_amount&&sale.rebate_amount>0)types.push("rebate_letter");
      if(sale.quoted_id_net_selling_price&&sale.quoted_id_net_selling_price>0)types.push("inventory_confirmation_letter");
      const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:{...buildDocumentSnapshot(sale,document_type),...(document_type==="booking_form"?{booking_source:"manual"}:{})},status:"generated",generated_at}));
      const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw error;
    }
    if(hasExternalAgent(sale)){
      const{data:agentLetter,error:agentLetterError}=await db.from("documents").select("id").eq("team_id",team.id).eq("sale_id",sale.id).eq("document_type","agent_commission_letter").maybeSingle();
      if(agentLetterError)throw agentLetterError;
      agentLetterId=agentLetter?.id??null;
    }
  }catch(e){return{error:e instanceof Error?e.message:"Failed to save sale.",fields}}
  revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");redirect(uploadAnother?"/sales/new":`/sales/${sale.id}`);
}
export async function savePopAdminDetails(id:string,fields:Record<string,string>):Promise<PopAdminSaveState>{
  try{
    const sale=await getSale(id);
    const existingAgency=splitAgencyDetails(sale.agent_company);
    const clean=(key:string)=>String(fields[key]??"").trim();
    const company=clean("agent_company")||existingAgency.company;
    const address=clean("agent_address")||existingAgency.address;
    const agentName=clean("agent_name")||existingAgency.agent_name;
    const agentDesignation=clean("agent_designation")||existingAgency.agent_designation;
    const agentMobile=clean("agent_mobile")||existingAgency.agent_mobile;
    const agentEmail=clean("agent_email")||existingAgency.agent_email;
    const values:Partial<Sale>={};
    const allowed=["sale_reference","salesperson_name","salesperson_designation","salesperson_mobile","salesperson_email"] as const;
    for(const key of allowed){const value=clean(key);if(value)values[key]=value;}
    if(company||address)values.agent_company=combineAgencyDetails(company,address,agentName,agentDesignation,agentMobile,agentEmail)||null;
    const updated=await updateSale(id,values);
    const db=await createClient();
    const[{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const{data:documents,error:documentsError}=await db.from("documents").select("id,document_type,status,generated_at").eq("team_id",team.id).eq("sale_id",id);
    if(documentsError)throw documentsError;
    {
      const rows=(documents??[]).map(document=>({
        team_id:team.id,user_id:user?.id??null,sale_id:id,
        document_type:document.document_type,
        content:buildDocumentSnapshot(updated,document.document_type as DocumentType),
        status:document.status,generated_at:document.generated_at,
      }));
      if(hasExternalAgent(updated))for(const document_type of ["agency_appointment_letter","agent_commission_letter"] as const)if(!(documents??[]).some(document=>document.document_type===document_type))rows.push({team_id:team.id,user_id:user?.id??null,sale_id:id,document_type,content:buildDocumentSnapshot(updated,document_type),status:"generated",generated_at:new Date().toISOString()});
      if(rows.length){const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw error;}
    }
    const{data:agentLetters,error:agentLetterError}=hasExternalAgent(updated)?await db.from("documents").select("id,document_type").eq("team_id",team.id).eq("sale_id",id).in("document_type",["agency_appointment_letter","agent_commission_letter"]):{data:null,error:null};
    if(agentLetterError)throw agentLetterError;
    revalidatePath(`/sales/${id}`);revalidatePath(`/sales/${id}/edit`);revalidatePath("/documents");revalidatePath("/dashboard");
    return{saved:true,agentLetterId:agentLetters?.find(item=>item.document_type==="agent_commission_letter")?.id,agencyAppointmentLetterId:agentLetters?.find(item=>item.document_type==="agency_appointment_letter")?.id};
  }catch(error){return{error:error instanceof Error?error.message:"Could not save the POP administration details."};}
}
export async function saveUploadedPopDetails(fields:Record<string,string>):Promise<UploadedPopSaveState>{
  try{
    const clean=(key:string)=>String(fields[key]??"").trim();
    const unit=clean("unit_number").toUpperCase();const customer=clean("customer_name");const parsedPrice=Number(clean("purchase_price").replace(/[^0-9.-]/g,""));const price=Number.isFinite(parsedPrice)&&parsedPrice>0?parsedPrice:0;
    if(!unit)return{error:"The unit number could not be read from the uploaded POP. Please enter it in the extracted-details review."};
    const company=clean("agent_company");const agentDetails=combineAgencyDetails(company,clean("agent_address"),clean("agent_name"),clean("agent_designation"),clean("agent_mobile"),clean("agent_email"))||null;
    const existing=(await getSales(unit)).find(item=>item.unit_number?.trim().toUpperCase()===unit);
    const values:Partial<Sale>={sale_reference:clean("sale_reference")||existing?.sale_reference||`S-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,customer_name:customer||existing?.customer_name||"Purchaser pending",purchaser_type:clean("purchaser_type").toLowerCase().includes("company")?"company":"individual",project_name:clean("project_name")||"Aira Residence",unit_number:unit,purchase_price:price||existing?.purchase_price||0,status:"draft",sale_date:clean("sale_date")||null,salesperson_name:clean("salesperson_name")||null,salesperson_designation:clean("salesperson_designation")||null,salesperson_mobile:clean("salesperson_mobile")||null,salesperson_email:clean("salesperson_email")||null,agent_company:agentDetails,solicitor_name:clean("solicitor_name")||null,authorised_signatory_name:clean("authorised_signatory_name")||null,authorised_signatory_position:clean("authorised_signatory_position")||null};
    const sale=existing?await updateSale(existing.id,values):await createSale(values);
    const db=await createClient();const[{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);const generated_at=new Date().toISOString();
    const types:DocumentType[]=["pre_booking_form"];if(hasExternalAgent(sale))types.push("agency_appointment_letter","agent_commission_letter");
    const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:sale.id,document_type,content:buildDocumentSnapshot(sale,document_type),status:"generated",generated_at}));
    const{error}=await db.from("documents").upsert(rows,{onConflict:"sale_id,document_type"});if(error)throw error;
    const{data:documents,error:documentsError}=await db.from("documents").select("id,document_type").eq("team_id",team.id).eq("sale_id",sale.id).in("document_type",types);if(documentsError)throw documentsError;
    const agencyAppointmentLetterId=documents?.find(item=>item.document_type==="agency_appointment_letter")?.id;const agentLetterId=documents?.find(item=>item.document_type==="agent_commission_letter")?.id;const popDocumentId=documents?.find(item=>item.document_type==="pre_booking_form")?.id;
    revalidatePath(`/sales/${sale.id}`);revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");
    return{saleId:sale.id,previewDocumentId:agencyAppointmentLetterId||agentLetterId||popDocumentId,agentLetterId,agencyAppointmentLetterId};
  }catch(error){return{error:error instanceof Error?error.message:"The uploaded POP could not be saved."};}
}
export async function confirmSale(id:string,_:ConfirmState,__form:FormData):Promise<ConfirmState>{
  try {
    const sale=await getSale(id); const db=await createClient(); const [{team},{data:{user}}]=await Promise.all([getTeamContext(),db.auth.getUser()]);
    const{data:manualBooking}=await db.from("documents").select("content").eq("team_id",team.id).eq("sale_id",id).eq("document_type","booking_form").maybeSingle();
    const types:DocumentType[]=["acceptance_letter"];
    if(hasExternalAgent(sale))types.push("agency_appointment_letter","agent_commission_letter");
    if(manualBooking?.content?.booking_source==="manual")types.unshift("booking_form");
    if(sale.rebate_amount&&sale.rebate_amount>0)types.push("rebate_letter");
    if(sale.quoted_id_net_selling_price&&sale.quoted_id_net_selling_price>0)types.push("inventory_confirmation_letter");
    const rows=types.map(document_type=>({team_id:team.id,user_id:user?.id??null,sale_id:id,document_type,content:{...buildDocumentSnapshot(sale,document_type),...(document_type==="booking_form"?{booking_source:"manual"}:{})},status:"generated",generated_at:new Date().toISOString()}));
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
    const sale=await getSale(id);if(sale.status!=="confirmed"&&sale.status!=="spa_signed")return{error:"Confirm the booking and upload the clearance letter before issuing the HOVP letter."};
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
