import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDocument } from "@/lib/data/documents";
import { getSale,updateSale } from "@/lib/data/sales";
import { createClient } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/tenancy";
import { buildDocumentSnapshot } from "@/lib/templates";
import { downloadFilename } from "@/lib/download-filename";
import { documentNames } from "@/lib/types";
import { solicitorForUnit } from "@/lib/unit-solicitor";
import type { DocumentType,Sale } from "@/lib/types";

export const runtime="nodejs";

const fieldNames=["customer_name","customer_ic","customer_salutation","customer_tin","customer_nationality","customer_sex","customer_race","bumi_status","customer_occupation","contact_person","customer_phone","customer_email","customer_address","customer_name_2","customer_ic_2","customer_salutation_2","customer_tin_2","customer_nationality_2","customer_sex_2","customer_race_2","bumi_status_2","customer_occupation_2","contact_person_2","customer_phone_2","customer_email_2","customer_address_2","sale_date","unit_number","solicitor_name","storey_number","unit_type","floor_area_sqm","floor_area","purchase_price","car_parking_bay","payment_method","payment_reference","purchaser_type"] as const;
type FieldName=typeof fieldNames[number];
type ExtractedFields=Record<FieldName,string>;
function numberValue(value:string){const parsed=Number(value.replace(/[^0-9.-]/g,""));return Number.isFinite(parsed)?parsed:null;}
function booleanValue(value:string){const normalized=value.trim().toLowerCase();if(["yes","true","bumi"].includes(normalized))return true;if(["no","false","non-bumi","non bumi"].includes(normalized))return false;return null;}
function cleanFields(input:unknown){
  const source=input&&typeof input==="object"?input as Record<string,unknown>:{};
  return Object.fromEntries(fieldNames.map(name=>[name,typeof source[name]==="string"?source[name].trim():""])) as ExtractedFields;
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;const document=await getDocument(id);if(document.document_type!=="booking_form")return NextResponse.json({error:"Upload is available only on the Booking Form page."},{status:400});
    const body=await request.json();const fields=cleanFields(body.fields);const updates:Partial<Sale>={};
    for(const name of fieldNames){const value=fields[name];if(!value)continue;
      if(name==="floor_area"||name==="floor_area_sqm"||name==="purchase_price"){const number=numberValue(value);if(number!==null)(updates as Record<string,unknown>)[name]=number;continue;}
      if(name==="bumi_status"||name==="bumi_status_2"){const bool=booleanValue(value);if(bool!==null)(updates as Record<string,unknown>)[name]=bool;continue;}
      if(name==="payment_method"){const method=value.toLowerCase();if(method.includes("cheque"))(updates as Record<string,unknown>)[name]="cheque";else if(method.includes("bank")||method.includes("transfer"))(updates as Record<string,unknown>)[name]="bank_transfer";continue;}
      if(name==="purchaser_type"){(updates as Record<string,unknown>)[name]=value.toLowerCase().includes("company")?"company":"individual";continue;}
      (updates as Record<string,unknown>)[name]=value;
    }
    const mappedSolicitor=solicitorForUnit(fields.unit_number);if(mappedSolicitor&&!fields.solicitor_name)updates.solicitor_name=mappedSolicitor;
    if(typeof updates.purchase_price==="number")updates.booking_fee=Math.round(updates.purchase_price*2)/100;
    const sale=await updateSale(document.sale_id,updates);const db=await createClient();const{team}=await getTeamContext();const{data:documents,error}=await db.from("documents").select("id,document_type").eq("team_id",team.id).eq("sale_id",sale.id);if(error)throw error;
    const refreshedAt=new Date().toISOString();await Promise.all((documents??[]).map(item=>db.from("documents").update({content:buildDocumentSnapshot(sale,item.document_type as DocumentType),status:"generated",generated_at:refreshedAt}).eq("team_id",team.id).eq("id",item.id)));
    revalidatePath(`/sales/${sale.id}`);revalidatePath(`/documents/${id}`);revalidatePath("/sales");revalidatePath("/documents");revalidatePath("/dashboard");
    const files=(documents??[]).map(item=>{const content=buildDocumentSnapshot(sale,item.document_type as DocumentType);return{id:item.id,type:item.document_type,wordFilename:downloadFilename(documentNames[item.document_type as DocumentType],"docx",content),pdfFilename:item.document_type==="booking_form"?downloadFilename("aira-booking-form","pdf",content):item.document_type==="pre_booking_form"?downloadFilename("prospect-offer-proposal-form","pdf",content):null};});
    return NextResponse.json({ok:true,unit_number:sale.unit_number||fields.unit_number,files});
  }catch(error){console.error("Booking Form upload save failed",error);return NextResponse.json({error:error instanceof Error?error.message:"The extracted information could not be saved."},{status:500});}
}
