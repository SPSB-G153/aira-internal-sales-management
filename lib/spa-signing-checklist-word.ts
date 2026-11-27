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
  const run=`<w:r>${lines.map((line,index)=>`${index?"<w:br/>":""}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`).join("")}</w:r>`;
  const replacement=cell.replace(/(<w:p\b[^>]*>[\s\S]*?<w:pPr>[\s\S]*?<\/w:pPr>)[\s\S]*?(<\/w:p>)/,`$1${run}$2`);
  return row.slice(0,match.index)+replacement+row.slice((match.index??0)+cell.length);
}

function updateRow(xml:string,label:string,updates:Array<[number,string]>){
  return xml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g,row=>{
    if(!plain(row).replace(/\s+/g," ").includes(label))return row;
    return updates.reduce((current,[index,value])=>setCellText(current,index,value),row);
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
  xml=updateRow(xml,"Prospect Offer Proposal Form",[[1,`Prospect Offer Proposal Form DD ${offerDate}\n____________`]]);
  xml=updateRow(xml,"Offer To Purchase issued",[[1,`Offer To Purchase issued ${offerDate}\n____________`]]);
  xml=updateRow(xml,"Notice of Acceptance issued",[[1,`Notice of Acceptance issued ${noticeDate}\n____________`]]);
  zip.file("word/document.xml",xml);
  return new Uint8Array(await zip.generateAsync({type:"uint8array",compression:"DEFLATE"}));
}
