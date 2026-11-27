import { NextResponse } from "next/server";
import { getDocument } from "@/lib/data/documents";
import { createSpaSigningChecklistPdf } from "@/lib/spa-signing-checklist-pdf";
import { downloadFilename } from "@/lib/download-filename";

export const runtime="nodejs";export const dynamic="force-dynamic";export const revalidate=0;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;const document=await getDocument(id);if(document.document_type!=="spa_signing_checklist")return new NextResponse("Not found",{status:404});
    const file=await createSpaSigningChecklistPdf(document.content);const body=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength) as ArrayBuffer;
    const preview=new URL(request.url).searchParams.get("preview")==="1";
    return new NextResponse(body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`${preview?"inline":"attachment"}; filename="${downloadFilename("SPA Signing Checklist","pdf",document.content)}"`,"Cache-Control":"private, no-store"}});
  }catch{return new NextResponse("The checklist PDF could not be created.",{status:500});}
}
