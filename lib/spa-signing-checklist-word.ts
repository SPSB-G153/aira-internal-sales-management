import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const text=(content:Record<string,unknown>,key:string,fallback="")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const amount=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{maximumFractionDigits:0}).format(value):"";
const displayDate=(value:unknown)=>{
  if(typeof value!=="string"||!value)return"";
  const parsed=new Date(`${value.slice(0,10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())?value:new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(parsed);
};
const displayDateShort=(value:unknown)=>{
  if(typeof value!=="string"||!value)return"";
  const parsed=new Date(`${value.slice(0,10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())?value:`${String(parsed.getUTCDate()).padStart(2,"0")}.${String(parsed.getUTCMonth()+1).padStart(2,"0")}.${String(parsed.getUTCFullYear()).slice(-2)}`;
};
const escapeXml=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const plain=(value:string)=>value.replace(/<[^>]+>/g,"");

function setCellText(row:string,index:number,value:string){
  const cells=[...row.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)];
  const match=cells[index];if(!match)return row;
  const cell=match[0];
  const lines=value.split("\n");
  const runProperties='<w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>';
  const run=`<w:r>${runProperties}${lines.map((line,index)=>`${index?"<w:br/>":""}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`).join("")}</w:r>`;
  let replacement=cell.replace(/<w:p\b([^>]*)>([\s\S]*?)<\/w:p>/,(_paragraph,attributes:string,body:string)=>{
    const properties=body.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0]??"";
    return `<w:p${attributes}>${properties}${run}</w:p>`;
  });
  if(replacement===cell)replacement=cell.replace(/<w:p\b([^>]*)\/>/,`<w:p$1>${run}</w:p>`);
  return row.slice(0,match.index)+replacement+row.slice((match.index??0)+cell.length);
}

function setCellLabeledDate(row:string,index:number,label:string,date:string){
  const cells=[...row.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)];
  const match=cells[index];if(!match)return row;
  const cell=match[0];
  const base='<w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>';
  const underlined=`<w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escapeXml(date||"____________")}</w:t></w:r>`;
  const runs=`<w:r>${base}<w:t xml:space="preserve">${escapeXml(label)} </w:t></w:r>${underlined}`;
  let replacement=cell.replace(/<w:p\b([^>]*)>([\s\S]*?)<\/w:p>/,(_paragraph,attributes:string,body:string)=>{
    const properties=body.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0]??"";
    return `<w:p${attributes}>${properties}${runs}</w:p>`;
  });
  if(replacement===cell)replacement=cell.replace(/<w:p\b([^>]*)\/>/,`<w:p$1>${runs}</w:p>`);
  return row.slice(0,match.index)+replacement+row.slice((match.index??0)+cell.length);
}

function updateRow(xml:string,label:string,updates:Array<[number,string]>){
  let updated=false;
  return xml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g,row=>{
    if(updated||!plain(row).replace(/\s+/g," ").includes(label))return row;
    updated=true;
    return updates.reduce((current,[index,value])=>setCellText(current,index,value),row);
  });
}

function updateDatedRow(xml:string,rowLabel:string,displayLabel:string,date:string){
  let updated=false;
  return xml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g,row=>{
    if(updated||!plain(row).replace(/\s+/g," ").includes(rowLabel))return row;
    updated=true;
    return setCellLabeledDate(row,1,displayLabel,date);
  });
}

export async function createSpaSigningChecklistWord(content:Record<string,unknown>){
  const template=await readFile(path.join(process.cwd(),"public","templates","SPA_Signing_Checklist.docx"));
  const zip=await JSZip.loadAsync(template);const file=zip.file("word/document.xml");if(!file)throw new Error("SPA checklist template is incomplete.");
  let xml=await file.async("string");
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const booking=price*.02;
  const balance=price*.08;
  const inventory=typeof content.inventory_payment_amount==="number"&&!content.inventory_payment_not_required?content.inventory_payment_amount:0;
  const offerDate=displayDate(content.offer_to_purchase_date||content.sale_date);
  const noticeDate=displayDate(content.notice_issued_at);
  const bookingDate=displayDateShort(content.sale_date);
  const balanceDate=displayDateShort(content.balance_deposit_received_at);
  const approvedDate=displayDateShort(content.purchase_proposal_approved_at||content.sale_date);
  xml=updateRow(xml,"Project Name",[[1,"AIRA RESIDENCE DAMANSARA"],[3,text(content,"unit_number")]]);
  xml=updateRow(xml,"Purchase Price (RM)",[[1,amount(price)]]);
  xml=updateRow(xml,"Purchaser (1)",[[1,text(content,"customer_name").toUpperCase()]]);
  xml=updateRow(xml,"Purchaser (2)",[[1,text(content,"customer_name_2").toUpperCase()]]);
  xml=updateRow(xml,"Purchaser (3)",[[1,text(content,"customer_name_3").toUpperCase()]]);
  xml=updateRow(xml,"Booking (Deposit 2%)",[[1,amount(booking)],[3,bookingDate]]);
  xml=updateRow(xml,"Deposit (Balance 8%)",[[1,`${amount(balance)}${inventory?` + ${amount(inventory)}`:""}`],[3,balanceDate]]);
  xml=updateRow(xml,"Purchase proposal approved by",[[1,text(content,"purchase_proposal_approved_by",text(content,"authorised_signatory_name"))],[3,approvedDate]]);
  xml=updateDatedRow(xml,"Prospect Offer Proposal Form","Prospect Offer Proposal Form DD",offerDate);
  xml=updateDatedRow(xml,"Offer To Purchase issued","Offer To Purchase issued",offerDate);
  xml=updateDatedRow(xml,"Notice of Acceptance issued","Notice of Acceptance issued",noticeDate);
  zip.file("word/document.xml",xml);
  return new Uint8Array(await zip.generateAsync({type:"uint8array",compression:"DEFLATE"}));
}
