import { readFile } from "node:fs/promises";
import path from "node:path";
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { DocumentType } from "@/lib/types";

const text=(content:Record<string,unknown>,key:string,fallback="—")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const amount=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(value):"—";
const date=(value:unknown)=>{if(typeof value!=="string"||!value)return "—";return new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));};
const line=(value:string)=>new Paragraph({children:[new TextRun(value)]});

const noBorder={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
const pageNumberFooter=()=>new Footer({children:[new Table({
  alignment:AlignmentType.RIGHT,
  width:{size:900,type:WidthType.DXA},
  rows:[new TableRow({children:[new TableCell({
    width:{size:540,type:WidthType.DXA},
    margins:{top:45,bottom:0,left:0,right:0},
    borders:{top:{style:BorderStyle.SINGLE,size:4,color:"8A8A8A"},bottom:noBorder,left:noBorder,right:noBorder},
    children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:0},children:[new TextRun({children:[PageNumber.CURRENT],size:20})]})]
  }),new TableCell({
    width:{size:360,type:WidthType.DXA},
    margins:{top:0,bottom:0,left:0,right:0},
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},
    children:[new Paragraph({spacing:{before:0,after:0}})]
  })]})]
})]});

const letterHeader=(image:Uint8Array,emblem=false)=>new Header({children:[new Paragraph({
  alignment:AlignmentType.RIGHT,
  spacing:{before:0,after:0},
  children:[new ImageRun({type:"png",data:image,transformation:emblem?{width:40,height:31}:{width:195,height:58},altText:{title:emblem?"SPB emblem":"Selangor Properties Berhad",description:"Selangor Properties Berhad",name:emblem?"SPB emblem":"Selangor Properties Berhad"}})]
})]});

const popMoney=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{maximumFractionDigits:2}).format(value):"0";
const popCell=(value:string,bold=false)=>new TableCell({children:[new Paragraph({children:[new TextRun({text:value,bold})]})]});

async function createPopWord(content:Record<string,unknown>){
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const discount=typeof content.discount_amount==="number"?content.discount_amount:0;
  const rebate=typeof content.rebate_amount==="number"?content.rebate_amount:0;
  const other=typeof content.other_incentives==="number"?content.other_incentives:0;
  const spa=Math.max(0,price-discount), net=Math.max(0,spa-rebate), total=discount+rebate+other;
  const size=typeof content.floor_area==="number"?content.floor_area:0;
  const psf=(value:number)=>size?`(RM${popMoney(value/size)} psf)`:"";
  const fields:[string,string][]=[
    ["Introduction By - Agent",[text(content,"salesperson_name","") ,text(content,"agent_company","")].filter(Boolean).join(", ")],
    ["SPB","NOT APPLICABLE"],["Team Member Assisting",text(content,"salesperson_name","")],["Purchaser's Name",text(content,"customer_name","")],
    ["Unit No.",text(content,"unit_number","")],["Unit Type",text(content,"unit_type","")],["Size",`${popMoney(size)} ft²`],
    ["List Price of Unit",`RM ${popMoney(price)} ${psf(price)}`],["Discount Offered",`RM ${popMoney(discount)}`],["SPA Price",`RM ${popMoney(spa)} ${psf(spa)}`],
    ["Value of any Rebate being proposed for the Purchaser",`RM ${popMoney(rebate)}`],["Hence, PROPOSED NET SELLING PRICE",`RM ${popMoney(net)} ${psf(net)}`],
    ["Value of any other incentives/gifts being proposed for/by the Purchaser",`RM ${popMoney(other)}`],["Hence: Total Value of Incentives",`RM ${popMoney(total)}`]
  ];
  const border={style:BorderStyle.SINGLE,size:4,color:"000000"};
  const details=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:fields.map(([label,value])=>new TableRow({children:[popCell(label,label.startsWith("Hence")),popCell(value,label.startsWith("Hence"))]})),borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border}});
  const approvals=["1. SBDM/BDM's Proposal:","2. Recommendation:","3. Feasibility Check:","4. Comments/Approval:"];
  const document=new Document({sections:[{children:[
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"SALES",bold:true,size:22})]}),
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"PROSPECT OFFER PROPOSAL FORM",bold:true,size:26})]}),details,
    new Paragraph({children:[new TextRun({text:"INCENTIVES",bold:true,color:"C00000"})]}),
    ...approvals.flatMap((heading,index)=>[new Paragraph({children:[new TextRun({text:heading,bold:true})]}),new Paragraph({children:[new TextRun({text:index===1?"N/A":""})]}),new Paragraph({children:[new TextRun({text:index===0?`SBDM/BDM Signature: ${text(content,"salesperson_name","")}    Date: ${text(content,"sale_date","")}`:index===1?"Head of Sales    Date:":"Director of Property    Date:"})]})])
  ]}]});
  return new Uint8Array(await Packer.toBuffer(document));
}

export async function createWordLetter(type:DocumentType,content:Record<string,unknown>){
  if(type==="pre_booking_form")return createPopWord(content);
  const [fullLogo,emblemLogo]=await Promise.all([
    readFile(path.join(process.cwd(),"public","selangor-properties-berhad-letterhead.png")),
    readFile(path.join(process.cwd(),"public","selangor-properties-emblem.png")),
  ]);
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const signer=text(content,"authorised_signatory_name","");
  const designation=text(content,"authorised_signatory_position","");
  const common=[
    new Paragraph({children:[new TextRun(date(content.sale_date))]}),
    line(purchaser),line(text(content,"customer_address")),
  ];
  let title="";let body:string[]=[];
  if(type==="acceptance_letter"){const balance=Math.max((typeof content.purchase_price==="number"?content.purchase_price:0)*.1-(typeof content.booking_fee==="number"?content.booking_fee:0),0);const agent=[text(content,"salesperson_name","your sales and marketing agent"),text(content,"agent_company","")].filter(Boolean).join(" from ");title="NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE";body=[`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`,`Project: ${text(content,"project_name")}`,`Property: Parcel No. ${unit}${text(content,"storey_number","")?`, Tower ${text(content,"storey_number","")}`:""}`,`Developer: Selangor Properties Sdn Bhd`,`Proprietor: ${text(content,"proprietor_name","Bangsar Hill Holdings Sdn. Bhd.")}`,`Purchaser: ${purchaser}`,`Purchase Price: ${amount(content.purchase_price)}`,`Greetings from Selangor Properties and the AIRA Residence team.`,`We thank you for your Offer to Purchase the Property described above, dated ${date(content.sale_date)} (“Offer”). We are pleased that you have made such a discerning decision to purchase a unit in this award-winning development. We encourage you to discover more of the hidden treasures that only living in the exclusive enclave of Damansara Heights can offer.`,`You are just a few steps away from owning the Property and to help you to progress the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (“SPA”), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively “Sale Documents”) in the manner described below.`,`As a first step, we kindly ask that you to contact your sales and marketing agents, ${agent}, to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter.`,`Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:`,`(1) a cheque or bank draft made in favour of “Selangor Properties Sdn Bhd” for a sum equivalent to ${amount(balance)}, being payment of the Balance Deposit of the Purchase Price as prescribed in the Sixth Schedule of the SPA; and`,`(2) if you are an individual, your identity card or passport; or, if you are a corporation: (a) the certified board and shareholder resolution; (b) certified Authorised Signatory NRIC, Certificate of Incorporation, Change of Name Form, Memorandum and Articles of Association, and Forms 24, 44 and 49; and (c) the company’s rubber stamp.`,`Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase.`,`c.c. ${text(content,"solicitor_name","")}`];}
  if(type==="rebate_letter"){title=`AIRA RESIDENCE : UNIT ${unit} — CONFIRMATION OF REBATE OFFER`;body=[`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`,`Greetings from AIRA Residence.`,`Thank you for taking the next step towards culminating your purchase of the abovementioned unit.`,`As agreed, a rebate of ${amount(content.rebate_amount)} has been approved and will be offset directly from the payment of your Balance Purchase Price that follows the signing of the Sale and Purchase Agreement (SPA) and payment of Balance Deposit under the Sixth Schedule.`,`Once again, congratulations for becoming part of the AIRA family.`];}
  if(type==="inventory_confirmation_letter"){title=`AIRA RESIDENCE — CONFIRMATION OF INVENTORIES FOR UNIT ${unit}`;body=[`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`,`Greetings from AIRA Residence.`,`Thank you for taking the next step towards culminating your purchase of the abovementioned unit.`,`As agreed, Unit ${unit} comes with a Schedule of Inventories (refer Attachment) which are included in the sale on an “as is where is” basis at a selling price of ${amount(content.quoted_id_net_selling_price)}.`,`As a result, we make no express or implied warranties or representations about the working condition, durability, fitness for purpose, or merchantability of the inventories on an “as is where is” basis. Furthermore, from the date of deemed delivery of vacant possession of the abovementioned unit, we will not be accountable to you for any incidental or indirect losses or damages arising from the use of the mentioned inventories.`,`We kindly ask that you sign the acknowledgement and acceptance below.`,`Once again, congratulations for becoming part of the AIRA family.`,`ACKNOWLEDGEMENT & ACCEPTANCE`,`I, ${purchaser}, ${text(content,"customer_ic","")} hereby acknowledge receipt of this letter, and confirm my understanding of, and agreement to the contents of this letter.`,`______________________________`,`Name:`,`IC / Passport No.:`,`Date:`];}
  if(type==="hovp_letter"){const handover=text(content,"hovp_date","To be confirmed");title="AIRA RESIDENCE — HANDOVER OF VACANT POSSESSION";body=[`Dear Sir or Madam,`,`We refer to your purchase of Unit ${unit}, AIRA Residence (“Unit”).`,`We are pleased to inform you that vacant possession of the Unit is available for handover on ${handover}.`,`The handover of the Unit shall be on the following basis:`,`As-Is, Where-Is Basis and No DLP`,`The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an “as-is, where-is” basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (“SPA”).`,`Handover Items`,`The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon completion of the handover formalities.`,`Renovation and Alteration`,`Following handover, any renovation, alteration or modification carried out within the Unit shall be at your own cost and responsibility.`,`Building Management`,`Following handover, matters relating to the building, common areas, facilities and building management shall be referred to AIRA Building Management.`,`AIRA Building Management`,`Tel: 03-2011 5908`,`Email: airaresidencemgmt@gmail.com`,`For matters relating to the HOVP and handover arrangements, please contact:`,`Name: ${text(content,"salesperson_name","")}`,`Designation: `,`Mobile: `,`Email: `,`Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession.`,`Thank you.`];}
  if(type==="booking_form"){const price=typeof content.purchase_price==="number"?content.purchase_price:0;const earnest=typeof content.booking_fee==="number"?content.booking_fee:0;title="BOOKING FORM — OFFER TO PURCHASE";body=[`Purchaser's Name: 1. ${purchaser}  2. ${text(content,"customer_name_2","")}`,`Purchaser's NRIC / Passport / Company No.: 1. ${text(content,"customer_ic")}  2. ${text(content,"customer_ic_2","")}`,`Purchaser's Address: ${text(content,"customer_address")}`,`To: SELANGOR PROPERTIES SDN. BHD., Level 3, Block D, The FIVE @ KPD, Kompleks Pejabat Damansara, Jalan Dungun, Damansara Heights, 50490 Kuala Lumpur, Malaysia`,`Dear Sirs,`,`I/We, the undersigned, hereby irrevocably and unconditionally offer to purchase (“Offer”) from you the Property at the Purchase Price based on the terms hereinafter appearing and subject to the terms and conditions stipulated in the Sale and Purchase Agreement (“SPA”), the Deed of Mutual Covenants and all other documents in relation to the sale of the Property to be executed by me/us in accordance with paragraph 3 below (“Sale Documents”).`,`The sale and purchase of the Property shall be on an as is where is basis, free from all encumbrances, subject to the existing category of land use and all restrictions in interest and conditions, and the Purchase Price shall be final and conclusive unless expressly provided in the Sale Documents.`,`I/We acknowledge and agree that I/we am/are required to pay you ten per centum (10%) of the Purchase Price (“Deposit”). I/We hereby deposit with you a non-refundable sum of Ringgit Malaysia ${amount(earnest)}, being the sum equivalent to two per centum (2%) of the Purchase Price (“Earnest Deposit”) towards part payment of the Deposit.`,`Subject to your Acceptance Notice, I/we agree and undertake to execute the Sale Documents within fourteen (14) days from receipt and to pay the balance of the Deposit of ${amount(price*.08)}, being eight per centum (8%) of the Purchase Price, upon execution of the Sale Documents.`,`If I/we fail to execute the Sale Documents or pay the Balance Deposit within the Execution Period, the Earnest Deposit shall be forfeited as agreed liquidated damages and the Offer shall lapse.`,`I/We acknowledge and agree that I/we am/are required to pay ninety per centum (90%) of the Purchase Price within three (3) months from the date of the Sale Documents / six (6) weeks from State Authority Approval, if applicable.`,`Meanwhile, the following documents are enclosed: the duly completed Appendix; and for an individual, a photocopy of identity card / passport, or for a company, the required certified corporate documents.`,`APPENDIX`,`Project: ${text(content,"project_name")}`,`Property: Parcel No. ${unit}, Tower ${text(content,"storey_number")}`,`Developer: Selangor Properties Sdn. Bhd.`,`Purchaser: ${purchaser}${text(content,"customer_name_2","")?` / ${text(content,"customer_name_2","")}`:""}`,`Purchase Price: ${amount(price)}`];}
  const document=new Document({
    features:{updateFields:true},
    styles:{
      default:{
        document:{run:{font:"Arial",size:18},paragraph:{spacing:{line:256,after:0}}},
        heading1:{run:{font:"Arial",size:20,bold:true,color:"000000"},paragraph:{spacing:{before:0,after:0},alignment:AlignmentType.CENTER}}
      }
    },
    sections:[{
      properties:{titlePage:true},
      headers:{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)},
      footers:{first:pageNumberFooter(),default:pageNumberFooter()},
      children:[...common,new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:title,bold:true})]}),...body.map(line),line(""),line("Yours faithfully,"),line("For and on behalf of Selangor Properties Sdn. Bhd."),line(""),line(""),line("__________________________________"),line(`Name: ${signer||"__________________________________"}`),line(`Designation: ${designation||"____________________________"}`)]
    }]
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
