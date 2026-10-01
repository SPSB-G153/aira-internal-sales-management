import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { DocumentType } from "@/lib/types";

const text=(content:Record<string,unknown>,key:string,fallback="—")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const amount=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(value):"—";
const date=(value:unknown)=>{if(typeof value!=="string"||!value)return "—";return new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));};
const line=(value:string)=>new Paragraph({children:[new TextRun(value)]});

export async function createWordLetter(type:DocumentType,content:Record<string,unknown>){
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const signer=text(content,"authorised_signatory_name","");
  const designation=text(content,"authorised_signatory_position","");
  const common=[
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"SELANGOR PROPERTIES SDN. BHD.",bold:true,size:26})]}),
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"AIRA RESIDENCE",bold:true,size:22})]}),
    new Paragraph({children:[new TextRun(date(content.sale_date))]}),
    line(purchaser),line(text(content,"customer_address")),
  ];
  let title="";let body:string[]=[];
  if(type==="acceptance_letter"){title="NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE";body=[`Dear ${purchaser},`,`We are pleased to inform you that your offer to purchase Unit ${unit}, ${text(content,"project_name")}, is accepted, subject to execution of the Sale and Purchase Agreement and related sale documents.`,`Please contact ${text(content,"salesperson_name","our sales team")} to arrange execution of the sale documents within fourteen (14) days from receipt of this letter.`,`For your appointment, please bring a cheque or bank draft in favour of “Selangor Properties Sdn Bhd” for the balance deposit.`];}
  if(type==="rebate_letter"){title=`AIRA RESIDENCE UNIT ${unit} — CONFIRMATION OF REBATE OFFER`;body=[`Dear ${purchaser},`,`The rebate offered for this purchase will be recorded in the executed sale documents and applied in accordance with their terms.`,`Once again, congratulations on becoming part of the AIRA family.`];}
  if(type==="hovp_letter"){title="AIRA RESIDENCE — HANDOVER OF VACANT POSSESSION";body=[`Dear ${purchaser},`,`We refer to your purchase of Unit ${unit}, AIRA Residence.`,`We are pleased to inform you that vacant possession is available for handover on ${text(content,"hovp_date","To be confirmed")}.`,`1. As-Is, Where-Is Basis and No DLP`,`The Unit is handed over and accepted on an as-is, where-is basis in accordance with the Sale and Purchase Agreement.`,`2. Handover Items`,`The applicable keys, access cards, remote controls and other handover items will be handed over upon completion of the handover formalities.`,`3. Renovation and Alteration`,`Following handover, any renovation, alteration or modification carried out within the Unit shall be at your own cost and responsibility.`,`4. Building Management`,`Following handover, matters relating to the building, common areas, facilities and building management shall be referred to AIRA Building Management.`,`AIRA Building Management`, `Tel: 03-2011 5908`, `Email: airaresidencemgmt@gmail.com`, `Please contact ${text(content,"salesperson_name","the sales team")} for HOVP and handover arrangements.`];}
  if(type==="pre_booking_form"){title="AIRA BOOKING FORM";body=[`Purchaser: ${purchaser}`,`Project: ${text(content,"project_name")}`,`Unit: ${unit}`,`Purchase price: ${amount(content.purchase_price)}`,`Earnest deposit: ${amount(content.booking_fee)}`];}
  const document=new Document({sections:[{properties:{},children:[...common,new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:title,bold:true})]}),...body.map(line),line(""),line("Yours faithfully,"),line("For and on behalf of Selangor Properties Sdn. Bhd."),line(""),line(""),line("__________________________________"),line(`Name: ${signer||"__________________________________"}`),line(`Designation: ${designation||"____________________________"}`)]}]});
  return new Uint8Array(await Packer.toBuffer(document));
}
