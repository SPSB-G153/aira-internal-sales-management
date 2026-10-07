import { NextResponse } from "next/server";
import { getDocument } from "@/lib/data/documents";
import { getSale } from "@/lib/data/sales";
import { getTeamContext } from "@/lib/tenancy";
import { createWordLetter } from "@/lib/word-document";
import { createBookingFormWord } from "@/lib/booking-form-word";
import { downloadFilename } from "@/lib/download-filename";
import { documentNames } from "@/lib/types";

export const runtime="nodejs";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const context=await getTeamContext();
  // The public demo contains only test data, so it can demonstrate the owner
  // export. Real workspaces retain the owner-only Word restriction.
  if(context.role!=="owner"&&!context.isDemo)return new NextResponse("Only the workspace owner can download Microsoft Word files.",{status:403});
  try{
    const {id}=await params;const document=await getDocument(id);const isLetter=document.document_type!=="booking_form"&&document.document_type!=="pre_booking_form";const sale=isLetter?await getSale(document.sale_id):null;const content=sale?{...document.content,authorised_signatory_name:sale.authorised_signatory_name,authorised_signatory_position:sale.authorised_signatory_position}:document.content;const file=document.document_type==="booking_form"?await createBookingFormWord(content):await createWordLetter(document.document_type,content);
    const filename=downloadFilename(documentNames[document.document_type],"docx",content);
    const body=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer;
    return new NextResponse(body,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","Content-Disposition":`attachment; filename="${filename}"`,"Cache-Control":"private, no-store"}});
  }catch{return new NextResponse("The Word document could not be created.",{status:500});}
}
