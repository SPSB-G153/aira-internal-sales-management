import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const text=(content:Record<string,unknown>,key:string)=>content[key]==null?"":String(content[key]);
const money=(value:number)=>new Intl.NumberFormat("en-MY",{maximumFractionDigits:0}).format(value);
const shortDate=(value:unknown)=>typeof value==="string"&&value?`${value.slice(8,10)}.${value.slice(5,7)}.${value.slice(2,4)}`:"";
const longDate=(value:unknown)=>typeof value==="string"&&value?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:"";

export async function createSpaSigningChecklistPdf(content:Record<string,unknown>){
  const template=await readFile(path.join(process.cwd(),"public","templates","SPA_Signing_Checklist.pdf"));
  const pdf=await PDFDocument.load(template);const page=pdf.getPage(0);const font=await pdf.embedFont(StandardFonts.Helvetica);
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const inventory=typeof content.inventory_payment_amount==="number"&&!content.inventory_payment_not_required?content.inventory_payment_amount:0;
  const ink=rgb(0,0,0);
  const draw=(value:string,x:number,y:number,size=10)=>{if(value)page.drawText(value,{x,y,size,font,color:ink,maxWidth:250});};
  draw(text(content,"unit_number"),412,731);
  draw(money(price),153,710);
  draw(text(content,"customer_name").toUpperCase(),153,690);
  draw(text(content,"customer_name_2").toUpperCase(),153,669);
  draw(text(content,"customer_name_3").toUpperCase(),153,648);
  draw(money(price*.02),153,627);
  draw(shortDate(content.sale_date),412,627);
  draw(`${money(price*.08)}${inventory?` + ${money(inventory)}`:""}`,153,607);
  draw(shortDate(content.balance_deposit_received_at),412,607);
  draw(text(content,"authorised_signatory_name"),153,584);
  draw(shortDate(content.sale_date),412,584);
  const datedLine=(labelDate:string,x:number,y:number,width:number)=>{
    if(!labelDate)return;
    page.drawRectangle({x:x-2,y:y-2,width,height:13,color:rgb(1,1,1)});
    draw(labelDate,x,y,9.5);
    page.drawLine({start:{x,y:y-1},end:{x:x+width,y:y-1},thickness:.55,color:ink});
  };
  const offerDate=longDate(content.offer_to_purchase_date||content.sale_date);
  datedLine(offerDate,212,500,92);
  datedLine(offerDate,176,440,120);
  datedLine(longDate(content.notice_issued_at),189,420,105);
  return pdf.save();
}
