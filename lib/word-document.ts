import { readFile } from "node:fs/promises";
import path from "node:path";
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, VerticalAlign, WidthType } from "docx";
import type { DocumentType } from "@/lib/types";
import { noticeAddressLines } from "@/lib/notice-address";
import { purchaserGreeting } from "@/lib/purchaser-greeting";
import { designationForSalesPersonnel } from "@/lib/sales-personnel";
import { agencyLetterDetails } from "@/lib/agency-details";

const text=(content:Record<string,unknown>,key:string,fallback="—")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const amount=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(value):"—";
const date=(value:unknown)=>{if(typeof value!=="string"||!value)return "—";return new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));};
const ordinalDate=(value:unknown)=>{if(typeof value!=="string"||!value)return "—";const parsed=new Date(`${value}T00:00:00`);if(Number.isNaN(parsed.getTime()))return "—";const day=parsed.getDate();const suffix=day%100>=11&&day%100<=13?"th":day%10===1?"st":day%10===2?"nd":day%10===3?"rd":"th";return `${day}${suffix} ${new Intl.DateTimeFormat("en-MY",{month:"long",year:"numeric"}).format(parsed)}`;};
const currentLetterDate=()=>new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kuala_Lumpur"}).format(new Date());
const ordinalDateRuns=(value:unknown,current=false)=>{const parsed=value instanceof Date?value:typeof value==="string"&&value?new Date(`${value}T00:00:00`):new Date();if(Number.isNaN(parsed.getTime()))return [new TextRun("—")];const formatter=new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric",...(current?{timeZone:"Asia/Kuala_Lumpur"}:{})});const parts=formatter.formatToParts(parsed);const day=Number(parts.find((part)=>part.type==="day")?.value||0);const suffix=day%100>=11&&day%100<=13?"th":day%10===1?"st":day%10===2?"nd":day%10===3?"rd":"th";const month=parts.find((part)=>part.type==="month")?.value||"";const year=parts.find((part)=>part.type==="year")?.value||"";return [new TextRun(String(day)),new TextRun({text:suffix,superScript:true}),new TextRun(` ${month} ${year}`)];};
const issuedLetterDate=(content:Record<string,unknown>)=>{const value=text(content,"letter_issued_at","");if(!value)return currentLetterDate();const parsed=new Date(value);return Number.isNaN(parsed.getTime())?currentLetterDate():new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kuala_Lumpur"}).format(parsed);};
const towerFromUnit=(unit:string)=>{const tower=unit.split("-")[0]?.toUpperCase();return tower==="A"||tower==="B"?tower:"";};
const individualIdDocument=(identifier:unknown)=>/^\d{6}-?\d{2}-?\d{4}$/.test(String(identifier??"").replace(/\s/g,""))?"identity card":"passport";
const line=(value:string)=>new Paragraph({children:[new TextRun(value)]});

const noBorder={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
const pageNumberFooter=()=>new Footer({children:[new Table({
  alignment:AlignmentType.RIGHT,
  width:{size:900,type:WidthType.DXA},
  rows:[new TableRow({children:[new TableCell({
    width:{size:900,type:WidthType.DXA},
    margins:{top:45,bottom:0,left:0,right:0},
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},
    children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new TextRun({children:[PageNumber.CURRENT],size:16})]})]
  })]})]
})]});

const letterHeader=(image:Uint8Array,emblem=false)=>new Header({children:[new Paragraph({
  alignment:AlignmentType.RIGHT,
  spacing:{before:0,after:0},
  children:[new ImageRun({type:"png",data:image,transformation:emblem?{width:52,height:41}:{width:168,height:47},altText:{title:emblem?"SPB emblem":"Selangor Properties Berhad",description:"Selangor Properties Berhad",name:emblem?"SPB emblem":"Selangor Properties Berhad"}})]
})]});

const hovpHeader=(airaLogo:Uint8Array,companyLogo:Uint8Array)=>new Header({children:[new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:[new TableRow({children:[
    new TableCell({width:{size:50,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[new Paragraph({alignment:AlignmentType.LEFT,spacing:{before:0,after:0},children:[new ImageRun({type:"png",data:airaLogo,transformation:{width:122,height:50},altText:{title:"AIRA Residence",description:"AIRA Residence",name:"AIRA Residence"}})]})]}),
    new TableCell({width:{size:50,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new ImageRun({type:"png",data:companyLogo,transformation:{width:168,height:47},altText:{title:"Selangor Properties Sdn. Bhd.",description:"Selangor Properties Sdn. Bhd.",name:"Selangor Properties Sdn. Bhd."}})]})]}),
  ]})]
})]});

const acceptanceFirstFooter=()=>new Footer({children:[new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  rows:[new TableRow({children:[
    new TableCell({
      width:{size:91,type:WidthType.PERCENTAGE},
      margins:{top:100,bottom:0,left:0,right:80},
      borders:{top:{style:BorderStyle.SINGLE,size:4,color:"BDBDBD"},bottom:noBorder,left:noBorder,right:noBorder},
      children:[new Paragraph({spacing:{before:0,after:0,line:210},children:[
        new TextRun({text:"SELANGOR PROPERTIES SDN. BHD.   ",bold:true,size:14}),
        new TextRun({text:"Registration No. 196301000340 (5199-X)",size:12}),
        new TextRun({text:"Level 3, Block D, The FIVE @ KPD, Kompleks Pejabat Damansara, Jalan Dungun, Damansara Heights, 50490 Kuala Lumpur,",break:1,size:14}),
        new TextRun({text:"Malaysia.        t +603 2094 1122        f +603 2095 0150",break:1,size:14}),
      ]})]
    }),
    new TableCell({
      width:{size:8,type:WidthType.PERCENTAGE},
      margins:{top:260,bottom:0,left:0,right:0},
      borders:{top:{style:BorderStyle.SINGLE,size:4,color:"BDBDBD"},bottom:noBorder,left:noBorder,right:noBorder},
      children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new TextRun({children:[PageNumber.CURRENT],size:16})]})]
    }),
    new TableCell({
      width:{size:1,type:WidthType.PERCENTAGE},
      margins:{top:0,bottom:0,left:0,right:0},
      borders:{top:{style:BorderStyle.SINGLE,size:4,color:"BDBDBD"},bottom:noBorder,left:noBorder,right:noBorder},
      children:[new Paragraph({spacing:{before:0,after:0}})]
    })
  ]})]
})]});

const acceptanceParagraph=(children:string|TextRun[],options:any={})=>new Paragraph({
  spacing:{before:0,after:180,line:320},
  alignment:AlignmentType.JUSTIFIED,
  ...options,
  children:typeof children==="string"?[new TextRun(children)]:children,
});

const acceptanceFactTable=(content:Record<string,unknown>)=>{
  const purchaser=text(content,"customer_name");
  const purchaser2=text(content,"customer_name_2","");
  const isCompany=text(content,"purchaser_type","individual")==="company";
  const unit=text(content,"unit_number");
  const tower=unit.split("-")[0]?.toUpperCase();
  const property=`Parcel No. ${unit}${tower==="A"||tower==="B"?`, Tower ${tower}`:""}`;
  const rows:[string,string][]=[
    ["Project",text(content,"project_name")],
    ["Property",property],
    ["Developer","Selangor Properties Berhad"],
    ["Proprietor",text(content,"proprietor_name","Bungsar Hill Holdings Sdn. Bhd.")],
    ["Purchaser",purchaser2?`1. ${purchaser}\n2. ${purchaser2}`:purchaser],
    ["Purchase Price",amount(content.purchase_price)],
  ];
  return new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:rows.map(([label,value],index)=>{const bottom=index===rows.length-1?{style:BorderStyle.SINGLE,size:4,color:"777777"}:noBorder;return new TableRow({children:[
      new TableCell({width:{size:18,type:WidthType.PERCENTAGE},margins:{top:0,bottom:index===rows.length-1?80:0,left:0,right:0},borders:{top:noBorder,bottom,left:noBorder,right:noBorder},children:[new Paragraph({spacing:{before:0,after:40,line:300},children:[new TextRun({text:label,bold:true})]})]}),
      new TableCell({width:{size:2,type:WidthType.PERCENTAGE},margins:{top:0,bottom:index===rows.length-1?80:0,left:0,right:0},borders:{top:noBorder,bottom,left:noBorder,right:noBorder},children:[new Paragraph({spacing:{before:0,after:40,line:300},children:[new TextRun({text:":",bold:true})]})]}),
      new TableCell({width:{size:80,type:WidthType.PERCENTAGE},margins:{top:0,bottom:index===rows.length-1?80:0,left:0,right:0},borders:{top:noBorder,bottom,left:noBorder,right:noBorder},children:[new Paragraph({spacing:{before:0,after:40,line:300},children:[new TextRun({text:value,bold:true})]})]}),
    ]});})
  });
};

const acceptanceSignature=(content:Record<string,unknown>)=>new Table({
  width:{size:3500,type:WidthType.DXA},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:[new TableRow({children:[new TableCell({
    width:{size:3500,type:WidthType.DXA},
    margins:{top:70,bottom:0,left:0,right:0},
    borders:{top:{style:BorderStyle.DOTTED,size:4,color:"333333"},bottom:noBorder,left:noBorder,right:noBorder},
    children:[new Paragraph({spacing:{before:0,after:0,line:240},children:[
      new TextRun({text:"Authorized Signatory"}),
      new TextRun({text:text(content,"authorised_signatory_name",""),bold:true,break:1}),
      new TextRun({text:text(content,"authorised_signatory_position",""),bold:true,break:1}),
    ]})]
  })]})]
});

const templateSignature=(content:Record<string,unknown>)=>new Table({
  width:{size:3500,type:WidthType.DXA},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:[new TableRow({children:[new TableCell({
    width:{size:3500,type:WidthType.DXA},
    margins:{top:70,bottom:0,left:0,right:0},
    borders:{top:{style:BorderStyle.DOTTED,size:4,color:"333333"},bottom:noBorder,left:noBorder,right:noBorder},
    children:[new Paragraph({spacing:{before:0,after:0,line:240},children:[
      new TextRun({text:text(content,"authorised_signatory_name","BRIAN NEWMAN"),bold:true}),
      new TextRun({text:text(content,"authorised_signatory_position","Director of Property"),bold:true,break:1}),
    ]})]
  })]})]
});

async function createAcceptanceWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const purchaser2=text(content,"customer_name_2","");
  const isCompany=text(content,"purchaser_type","individual")==="company";
  const salutation=text(content,"customer_salutation","Purchaser");
  const contact=text(content,"salesperson_name","Booking contact");
  const salespersonDesignation=designationForSalesPersonnel(contact);
  const agency=text(content,"agent_company","");
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const deposit=price*.1;
  const addressLines=noticeAddressLines(text(content,"customer_address",""));
  const pageOne=[
    acceptanceParagraph(ordinalDateRuns(new Date(),true),{alignment:AlignmentType.LEFT,spacing:{before:220,after:200,line:341}}),
    acceptanceParagraph([
      new TextRun({text:purchaser,bold:true}),
      ...(purchaser2?[new TextRun({text:purchaser2,bold:true,break:1})]:[]),
      ...addressLines.map((address)=>new TextRun({text:address,break:1})),
    ],{alignment:AlignmentType.LEFT,spacing:{before:0,after:240,line:300}}),
    acceptanceParagraph(purchaserGreeting(content),{alignment:AlignmentType.LEFT,spacing:{before:0,after:240,line:300}}),
    acceptanceParagraph([new TextRun({text:"RE:      NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE",bold:true,underline:{type:UnderlineType.SINGLE}})],{alignment:AlignmentType.LEFT,spacing:{before:120,after:220,line:300}}),
    acceptanceFactTable(content),
    acceptanceParagraph("Greetings from Selangor Properties and the AIRA Residence team.",{alignment:AlignmentType.LEFT,spacing:{before:180,after:200,line:341}}),
    acceptanceParagraph([new TextRun("We thank you for your Offer to Purchase the Property described above by way of the Booking Form dated "),...ordinalDateRuns(content.sale_date),new TextRun(" (\u201c"),new TextRun({text:"Offer",bold:true}),new TextRun("”). We are pleased that you have made such a discerning decision to purchase a unit in AIRA Residence – Kuala Lumpur’s best kept secret. With your selection, we welcome you to the beginning of AIRA Residence’s story and we encourage you to discover more of the hidden treasures which only living in the exclusive enclave of Damansara Heights can offer.")]),
    acceptanceParagraph([new TextRun("You are just a few steps away from owning the Property and to help you move along the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (“"),new TextRun({text:"SPA",bold:true}),new TextRun("”), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively “"),new TextRun({text:"Sale Documents",bold:true}),new TextRun("”) in the manner described below.")]),
    acceptanceParagraph(`Firstly we ask that you kindly contact our ${salespersonDesignation||"sales and marketing agent"}${salespersonDesignation?`, ${contact},`:` ${contact}${agency?` from ${agency}`:""}`} to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter.`),
    acceptanceParagraph("Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:"),
  ];
  const pageTwo=[
    new Paragraph({children:[new PageBreak()]}),
    acceptanceParagraph([new TextRun("1.   A cheque or bank draft made in favour of “"),new TextRun({text:"Selangor Properties Berhad",bold:true}),new TextRun("” for a sum equivalent to "),new TextRun({text:amount(deposit),bold:true}),new TextRun(", being payment of the first ten per centum (10%) of the Purchase Price as prescribed in the Third Schedule of the SPA; and")],{spacing:{before:510,after:180,line:320},indent:{left:420,hanging:420}}),
    ...(isCompany?[
      acceptanceParagraph([new TextRun("2.   "),new TextRun({text:"For a corporation",italics:true}),new TextRun(":")],{indent:{left:420,hanging:420}}),
      acceptanceParagraph("(a)   a certified true copy of your company’s board of directors’ and shareholders’ (if applicable) resolution authorizing (i) the purchase of the Property, and (ii) the execution of the Sale Documents, the Memorandum of Transfer in respect of the Property together with all relevant documents thereto and in respect of the sale and purchase of the Property, by way of affixation of your company’s common seal and execution by your company’s authorized signatories;",{indent:{left:900,hanging:450}}),
      acceptanceParagraph("(b)   a certified true copy of the latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49; and",{indent:{left:900,hanging:450}}),
      acceptanceParagraph("(c)   the company’s rubber stamp.",{indent:{left:900,hanging:450}}),
    ]:[acceptanceParagraph([new TextRun("2.   "),new TextRun({text:"For an individual",italics:true}),new TextRun(`: your ${individualIdDocument(content.customer_ic)};`)],{indent:{left:420,hanging:420}})]),
    acceptanceParagraph("Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase.",{spacing:{before:120,after:120,line:341}}),
    acceptanceParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"On behalf of Selangor Properties Sdn. Bhd.",bold:true,break:1})],{alignment:AlignmentType.LEFT,spacing:{before:240,after:500,line:300}}),
    acceptanceSignature(content),
    acceptanceParagraph(`c.c.   ${text(content,"solicitor_name","")}`,{alignment:AlignmentType.LEFT,spacing:{before:420,after:0,line:240}}),
  ];
  const document=new Document({
    features:{updateFields:true},
    styles:{default:{document:{run:{font:"Arial",size:22},paragraph:{spacing:{line:320,after:0}}}}},
    sections:[{
      properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1600,right:1134,bottom:1000,left:1134,header:876,footer:360}}},
      headers:{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)},
      footers:{first:acceptanceFirstFooter(),default:pageNumberFooter()},
      children:[...pageOne,...pageTwo],
    }]
  });
  return new Uint8Array(await Packer.toBuffer(document));
}

const letterDocument=(children:(Paragraph|Table)[],fullLogo:Uint8Array,emblemLogo:Uint8Array,twoPages=false,footerDistance=360,topMargin=1600,headerDistance=876,emblemOnly=false)=>new Document({
  features:{updateFields:true},
  styles:{default:{document:{run:{font:"Arial",size:18},paragraph:{spacing:{line:300,after:0}}}}},
  sections:[{
    properties:{titlePage:twoPages,page:{size:{width:11906,height:16838},margin:{top:topMargin,right:1134,bottom:1000,left:1134,header:headerDistance,footer:footerDistance}}},
    headers:twoPages?{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)}:{default:letterHeader(emblemOnly?emblemLogo:fullLogo,emblemOnly)},
    footers:twoPages?{first:acceptanceFirstFooter(),default:pageNumberFooter()}:{default:acceptanceFirstFooter()},
    children,
  }]
});

const hovpDocument=(children:(Paragraph|Table)[],fullLogo:Uint8Array,airaLogo:Uint8Array)=>new Document({
  features:{updateFields:true},
  styles:{default:{document:{run:{font:"Helvetica",size:20},paragraph:{spacing:{line:260,after:0}}}}},
  sections:[{
    properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1220,right:1440,bottom:700,left:1440,header:720,footer:360}}},
    headers:{first:hovpHeader(airaLogo,fullLogo),default:hovpHeader(airaLogo,fullLogo)},
    footers:{first:acceptanceFirstFooter(),default:pageNumberFooter()},
    children,
  }]
});

const exactParagraph=(children:string|TextRun[],options:any={})=>new Paragraph({
  spacing:{before:0,after:200,line:300},
  alignment:AlignmentType.LEFT,
  ...options,
  children:typeof children==="string"?[new TextRun(children)]:children,
});

const exactRecipient=(content:Record<string,unknown>)=>exactParagraph([
  new TextRun({text:text(content,"customer_name").toUpperCase(),bold:true}),
  ...noticeAddressLines(text(content,"customer_address")).map((address)=>new TextRun({text:address,break:1})),
],{spacing:{before:0,after:300,line:300}});

async function createRebateWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const children:(Paragraph|Table)[]=[
    exactParagraph(currentLetterDate(),{spacing:{before:420,after:540,line:300}}),
    exactParagraph([
      new TextRun({text:text(content,"customer_name").toUpperCase(),bold:true}),
      ...noticeAddressLines(text(content,"customer_address")).map((address)=>new TextRun({text:address,break:1})),
    ],{spacing:{before:0,after:1020,line:300}}),
    exactParagraph(`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`,{spacing:{before:0,after:340,line:300}}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[
      new TableCell({width:{size:5,type:WidthType.PERCENTAGE},margins:{top:0,bottom:10,left:0,right:0},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:6,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph("Re:",{spacing:{before:120,after:0,line:300}})]}),
      new TableCell({width:{size:95,type:WidthType.PERCENTAGE},margins:{top:0,bottom:10,left:0,right:0},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:6,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:"AIRA RESIDENCE",bold:true}),new TextRun({text:`UNIT ${unit} – CONFIRMATION OF REBATE OFFER`,bold:true,break:1})],{spacing:{before:120,after:0,line:300}})]}),
    ]})]}),
    exactParagraph("Greetings from AIRA Residence…",{spacing:{before:280,after:200,line:300}}),
    exactParagraph("Thank you for taking the next step towards culminating your purchase of the abovementioned unit."),
    exactParagraph([new TextRun("As agreed, a rebate of "),new TextRun({text:amount(content.rebate_amount),bold:true}),new TextRun(" has been approved and will be offset directly from the payment of your Balance Purchase Price that follows the signing of the Sale and Purchase Agreement (SPA) and payment of Balance Deposit under the Sixth Schedule.")],{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("Once again, congratulations for becoming part of the AIRA family."),
    exactParagraph([
      new TextRun("Yours sincerely,"),
      new TextRun({text:"For and on behalf of ",italics:true,break:1}),
      new TextRun({text:"SELANGOR PROPERTIES SDN BHD",bold:true,italics:true}),
    ],{alignment:AlignmentType.LEFT,spacing:{before:300,after:1560,line:300}}),
    acceptanceSignature(content),
  ];
  return new Uint8Array(await Packer.toBuffer(letterDocument(children,fullLogo,emblemLogo,false,720)));
}

async function createInventoryWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const children:(Paragraph|Table)[]=[
    exactParagraph(currentLetterDate(),{spacing:{before:220,after:200,line:300}}),exactRecipient(content),
    exactParagraph(`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`),
    exactParagraph([new TextRun({text:"RE:      AIRA RESIDENCE",bold:true,underline:{type:UnderlineType.SINGLE}}),new TextRun({text:`CONFIRMATION OF INVENTORIES FOR UNIT ${unit}`,bold:true,underline:{type:UnderlineType.SINGLE},break:1})],{spacing:{before:120,after:240,line:300}}),
    exactParagraph("Greetings from AIRA Residence."),
    exactParagraph("Thank you for taking the next step towards culminating your purchase of the abovementioned unit."),
    exactParagraph([new TextRun(`As agreed, Unit ${unit} comes with a Schedule of Inventories (refer Attachment) which are included in the sale on an “as is where is” basis at a selling price of `),new TextRun({text:amount(content.quoted_id_net_selling_price),bold:true}),new TextRun(".")],{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("As a result, we make no express or implied warranties or representations about the working condition, durability, fitness for purpose, or merchantability of the inventories on an “as is where is” basis. Furthermore, from the date of deemed delivery of vacant possession of the abovementioned unit, we will not be accountable to you for any incidental or indirect losses or damages arising from the use of the mentioned inventories.",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("We kindly ask that you sign the acknowledgement and acceptance below."),
    exactParagraph("Once again, congratulations for becoming part of the AIRA family."),
    exactParagraph([new TextRun("Yours sincerely,"),new TextRun({text:"For and on behalf of Selangor Properties Sdn. Bhd.",break:1})],{spacing:{before:120,after:620,line:300}}),
    acceptanceSignature(content),
    new Paragraph({children:[new PageBreak()]}),
    exactParagraph([new TextRun({text:"ACKNOWLEDGEMENT & ACCEPTANCE",bold:true,underline:{type:UnderlineType.SINGLE},size:22})],{alignment:AlignmentType.CENTER,spacing:{before:120,after:420,line:300}}),
    exactParagraph(`I, ${purchaser}, ${text(content,"customer_ic","")} hereby acknowledge receipt of this letter, and confirm my understanding of, and agreement to the contents of this letter.`,{alignment:AlignmentType.JUSTIFIED,spacing:{before:0,after:900,line:341}}),
    new Table({width:{size:3900,type:WidthType.DXA},borders:{top:{style:BorderStyle.SINGLE,size:6,color:"333333"},bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[new TableCell({borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:80,bottom:0,left:0,right:0},children:[exactParagraph([new TextRun("Name:"),new TextRun({text:"IC / Passport No.:",break:1}),new TextRun({text:"Date:",break:1})],{spacing:{before:0,after:0,line:300}})]})]})]}),
  ];
  return new Uint8Array(await Packer.toBuffer(letterDocument(children,fullLogo,emblemLogo,true)));
}

const agencyCommissionWordTable=()=>{
  const border={style:BorderStyle.SINGLE,size:5,color:"333333"};
  const richCell=(runs:TextRun[],fill?:string)=>new TableCell({shading:fill?{fill}:undefined,borders:{top:border,bottom:border,left:border,right:border},margins:{top:45,bottom:45,left:70,right:70},children:[exactParagraph(runs,{alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:240}})]});
  const plain=(value:string,bold=false,fill?:string)=>richCell([new TextRun({text:value,bold,size:26})],fill);
  const row=(values:[string,string],boldFirst=false)=>new TableRow({children:values.map((v,i)=>plain(v,boldFirst&&i===0))});
  const spacerRow=()=>new TableRow({height:{value:100,rule:"atLeast"},children:[new TableCell({columnSpan:2,borders:{top:border,bottom:border,left:border,right:border},margins:{top:0,bottom:0,left:0,right:0},children:[exactParagraph("",{spacing:{before:0,after:0,line:80}})]})]});
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows:[
    new TableRow({children:[richCell([new TextRun({text:"TOWER / UNIT TYPE",bold:true,size:26})],"D9D9D9"),richCell([new TextRun({text:"SALES COMMISSION",bold:true,size:26}),new TextRun({text:"% Purchase Price",break:1,size:26})],"D9D9D9")]}),
    new TableRow({children:[new TableCell({columnSpan:2,borders:{top:border,bottom:border,left:border,right:border},margins:{top:45,bottom:45,left:70,right:70},children:[exactParagraph([new TextRun({text:"Domestic Sales:",bold:true,size:26})],{spacing:{before:0,after:0,line:250}})]})]}),
    row(["TOWER A",""],true),row(["Type A1","2.00"]),row(["Type B","2.00"]),row(["Type A2","2.00"]),row(["Types D, E & F","2.00"]),row(["TOWER B",""],true),row(["Types G & H","3.00"]),spacerRow(),
    new TableRow({children:[new TableCell({columnSpan:2,borders:{top:border,bottom:border,left:border,right:border},margins:{top:45,bottom:45,left:70,right:70},children:[exactParagraph([new TextRun({text:"International Sales (Towers A & B):     ",bold:true,size:26}),new TextRun({text:"3.0%",bold:true,size:26}),new TextRun({text:" of the Purchase Price",size:26})],{spacing:{before:0,after:0,line:250}})]})]})
  ]});
};

async function createAgencyAppointmentWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const agency=text(content,"agent_company","");
  const details=agencyLetterDetails(agency,{company:agency,address:text(content,"agent_address",""),agent_name:text(content,"agent_name",""),agent_designation:text(content,"agent_designation",""),agent_mobile:text(content,"agent_mobile",""),agent_email:text(content,"agent_email","")});
  const address=noticeAddressLines(text(content,"agent_address",""));
  const salesperson=text(content,"salesperson_name","");
  const salespersonHonorific=salesperson.toLowerCase().includes("madihah")?"Pn. ":"Ms ";
  const salespersonMobile=salesperson.toLowerCase().includes("madihah")?"+60123331502":text(content,"salesperson_mobile","");
  const salespersonEmail=salesperson.toLowerCase().includes("madihah")?"madihah.hassan@selangorproperties.com.my":text(content,"salesperson_email","");
  const pageBreak=()=>new Paragraph({children:[new PageBreak()]});
  const children:(Paragraph|Table)[]=[
    exactParagraph(issuedLetterDate(content),{spacing:{before:220,after:420,line:300}}),
    exactParagraph([...(details.contactName?[new TextRun({text:details.contactName,bold:true})]:[]),new TextRun({text:agency,bold:true,break:details.contactName?1:0}),...address.map(line=>new TextRun({text:line,break:1}))]),
    exactParagraph(details.greeting),
    exactParagraph([new TextRun({text:"AGENCY APPOINTMENT TO THE AIRA RESIDENCE DEVELOPMENT",bold:true}),new TextRun({text:"No. 8, Jalan Batai, Bukit Damansara, Kuala Lumpur",bold:true,break:1})],{spacing:{before:0,after:220,line:260},border:{bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"}}}),
    exactParagraph("We would like to thank you for introducing a prospect for the AIRA Residence project and herein wish to take the opportunity to formalize your agency appointment.",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("As you know, AIRA Residence is a very special project due to its unique location, low density and harmonious fusion of Asian and European design aesthetics. AIRA has been almost exclusively designed for owner-occupiers and already houses a marquee family of residents from all segments of local and international society. Our brand speaks to those who instinctively understand our language and our way of being.",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("Your firm's representative will be required to escort the Prospect through the development and to lead the sales pitch. One of our Relationship Managers will accompany the Prospect/Salesperson and provide support whenever required. Our RMs are very well trained in the product, thus their presence will reinforce SPSB's commitment to your Prospect(s).",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("We welcome your initiative to introduce both local and foreign buyers. With regards international sales, we define a ‘foreign buyer’ in the following manner:",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph([new TextRun({text:"International Sales – Definition of a Foreign Buyer",bold:true})]),
    ...[
      "Any individual, corporation or company that is a foreign national and wishes to purchase a property in Malaysia for investment or dwelling purposes and is subject to restrictions or guidelines set by FIC or by any other related guideline related to foreign property purchase.",
      "Individuals who are not Malaysian citizens seeking to purchase for vacation/second home market under Malaysia My Second Home (MM2H).",
      "International Sales do not include individual purchasers bearing NRIC, red IC, PR holders, UN special pass holders or foreign nationals via marriage, work assignments or the like.",
    ].map((item,index)=>exactParagraph(`${index+1}.    ${item}`,{alignment:AlignmentType.JUSTIFIED,indent:{left:360,hanging:260},spacing:{before:0,after:130,line:260}})),
    pageBreak(),exactParagraph([new TextRun({text:"Sales Commission Structure",bold:true,size:22})]),exactParagraph("As an Appointed Agent you will gain entitlement to the following Sales Commission structure:"),agencyCommissionWordTable(),
    exactParagraph([new TextRun({text:"NB: The Commission structure shown in the above Table is valid for ",italics:true}),new TextRun({text:"12 months",bold:true,italics:true}),new TextRun({text:" from the date of this letter.",italics:true})],{spacing:{before:240,after:240,line:280}}),
    exactParagraph("The Sales Commission for both Towers ‘A’ & ‘B’ will be paid in Ringgit Malaysia within 30 days of our receipt of the following:"),
    exactParagraph("•    a stamped copy of the Sales & Purchase Agreement (SPA)",{indent:{left:360,hanging:240},spacing:{before:0,after:90,line:260}}),exactParagraph("•    a copy of the relevant State Authority's Consent Approval for Foreigners; and",{indent:{left:360,hanging:240},spacing:{before:0,after:90,line:260}}),exactParagraph("•    the Agent's Tax Invoice",{indent:{left:360,hanging:240},spacing:{before:0,after:0,line:260}}),
    exactParagraph([new TextRun("You shall at all times sell the units at the List Price approved by us and shall not adjust, revise, increase or amend the selling price for the units. Given the scarcity of units available for purchase in AIRA Residence and our philosophy of protecting purchaser's investment, the List Prices quoted are "),new TextRun({text:"fixed",bold:true}),new TextRun(" and non-negotiable.")],{alignment:AlignmentType.JUSTIFIED,spacing:{before:100,after:320,line:300}}),exactParagraph("As the sale of units @ AIRA Residence is on a first-come-first-serve basis, the Appointed Agent is encouraged to check with SPSB on the availability of units and to confirm the List Prices from time to time in case there has been a price increase.",{alignment:AlignmentType.JUSTIFIED,spacing:{before:0,after:320,line:300}}),exactParagraph("Please also note that you are strictly prohibited to advertise AIRA in any media platform without our approval.",{spacing:{before:0,after:360,line:300}}),pageBreak(),exactParagraph(`I trust that the above outline is clear, however, should you require any further clarification please contact ${salespersonHonorific}${salesperson} at ${salespersonMobile} or via email at ${salespersonEmail}. Alternatively, you can also contact Ms Katherine Chew at +60193901491 or via email at katherine.chew@selangorproperties.com.my for further assistance.`,{alignment:AlignmentType.JUSTIFIED,spacing:{before:0,after:340,line:300}}),exactParagraph("We look forward to working with you and your team and hope that our collaboration on AIRA Residence is a productive and profitable relationship for both companies.",{alignment:AlignmentType.JUSTIFIED,spacing:{before:0,after:420,line:300}}),exactParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"For and on behalf of SELANGOR PROPERTIES SDN BHD",bold:true,italics:true,break:1})],{spacing:{before:0,after:1100,line:300}}),templateSignature(content),
    pageBreak(),exactParagraph([new TextRun({text:"ACCEPTANCE",bold:true,size:22})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:620,line:300}}),exactParagraph([new TextRun({text:"AGENCY APPOINTMENT TO THE AIRA RESIDENCE DEVELOPMENT",bold:true}),new TextRun({text:"No. 8, Jalan Batai, Bukit Damansara, Kuala Lumpur",bold:true,break:1})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:800,line:300},border:{bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"}}}),exactParagraph(`We, ${agency||"____________________"} agree to become an Appointed Agent for AIRA Residence condominium project on the basis of the terms and conditions outlined herein and further, agree to adhere to the policies and sales procedures set forth by Selangor Properties Sdn Bhd and to always represent the project honestly and with the highest levels of professional conduct.`,{alignment:AlignmentType.JUSTIFIED,spacing:{before:0,after:500,line:341}}),exactParagraph("________________________________________\nSignature:\n\nName: __________________________________\n\nI/C No.:__________________________________\n\nDate:   __________________________________"),
  ];
  return new Uint8Array(await Packer.toBuffer(letterDocument(children,fullLogo,emblemLogo,true,360,1360,760)));
}

async function createAgentCommissionWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const agency=text(content,"agent_company","");
  const agencyDetails=agencyLetterDetails(agency,{company:agency,address:text(content,"agent_address",""),agent_name:text(content,"agent_name",""),agent_designation:text(content,"agent_designation",""),agent_mobile:text(content,"agent_mobile",""),agent_email:text(content,"agent_email","")});
  const enteredAgencyAddress=text(content,"agent_address","");
  const agencyAddress=enteredAgencyAddress
    ? noticeAddressLines(enteredAgencyAddress)
    : /\bIQI\b/i.test(agency)?["9-3, 3rd Floor, Medan Klang Lama 28,","Jalan Klang Lama,","58000 Kuala Lumpur."]:[];
  const unit=text(content,"unit_number");
  const purchaser=text(content,"customer_name").toUpperCase();
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const rebate=typeof content.rebate_amount==="number"?content.rebate_amount:0;
  const netPurchasePrice=Math.max(price-rebate,0);
  const priceText=`RM${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(price)}`;
  const netPriceText=`RM${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(netPurchasePrice)}`;
  const letterDate=issuedLetterDate(content);
  const facts=new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:6,color:"333333"},left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:[new TableRow({children:[new TableCell({borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph("",{spacing:{before:0,after:0,line:40}})]})]})]
  });
  const pageOne:(Paragraph|Table)[]=[
    exactParagraph(letterDate,{spacing:{before:220,after:420,line:300}}),
    exactParagraph([...(agencyDetails.contactName?[new TextRun({text:agencyDetails.contactName,bold:true}),new TextRun({text:agencyDetails.contactPosition,bold:true,break:1})]:[]),new TextRun({text:agency,bold:true,break:agencyDetails.contactName?1:0}),...agencyAddress.map(address=>new TextRun({text:address,break:1}))],{spacing:{before:0,after:420,line:300}}),
    exactParagraph(agencyDetails.greeting,{spacing:{before:0,after:320,line:300}}),
    exactParagraph([new TextRun({text:"AGENT'S FEE ARRANGEMENT",bold:true,size:20}),new TextRun({text:`UNIT ${unit}`,bold:true,size:20,break:1}),new TextRun({text:`PURCHASER: ${purchaser}`,bold:true,size:20,break:1}),new TextRun({text:`PURCHASE PRICE: ${priceText}`,bold:true,size:20,break:1})],{spacing:{before:0,after:0,line:260}}),
    facts,
    exactParagraph(`We refer to your letter of appointment${agencyDetails.appointmentDate?` dated ${agencyDetails.appointmentDate}`:""} and the recent sale of Unit ${unit} to the abovementioned purchaser.`,{spacing:{before:300,after:200,line:300}}),
    exactParagraph([new TextRun("We are pleased to advise that in the case of this sale only, the agent's commission will be increased from 2.00% to "),new TextRun({text:"3.00%",bold:true}),new TextRun(" of the Net Purchase Price of "),new TextRun({text:netPriceText,bold:true}),new TextRun(".")],{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("The Sales Commission will be paid in Ringgit Malaysia within 30 days of our receipt of the following:",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("•    a stamped copy of the Sales & Purchase Agreement (SPA);",{indent:{left:420,hanging:240},spacing:{before:0,after:100,line:300}}),
    exactParagraph("•    the Agent's Tax Invoice.",{indent:{left:420,hanging:240},spacing:{before:0,after:260,line:300}}),
    exactParagraph("We look forward to continuing our working collaboration and wish you every success in supporting our sales efforts during the year ahead.",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"For and behalf SELANGOR PROPERTIES SDN. BHD.",bold:true,italics:true,break:1})],{spacing:{before:300,after:620,line:300}}),
    templateSignature(content),
  ];
  return new Uint8Array(await Packer.toBuffer(letterDocument(pageOne,fullLogo,emblemLogo,false,360,1360,760,true)));
}

const hovpFieldTable=(rows:[string,string][],width=4300,labelWidth=1650,colonWidth=180,alignWrapped=false,valueLeft=45,rowBefore=0)=>new Table({
  width:{size:width,type:WidthType.DXA},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:rows.map(([label,value])=>new TableRow({children:[
    new TableCell({width:{size:labelWidth,type:WidthType.DXA},verticalAlign:VerticalAlign.BOTTOM,borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph(label==="NRIC/Passport No."?[new TextRun({text:label,scale:80})]:label,{spacing:{before:rowBefore,after:80,line:260}})]}),
    new TableCell({width:{size:colonWidth,type:WidthType.DXA},verticalAlign:VerticalAlign.BOTTOM,borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph(":",{spacing:{before:rowBefore,after:80,line:260}})]}),
    new TableCell({width:{size:width-labelWidth-colonWidth,type:WidthType.DXA},verticalAlign:VerticalAlign.BOTTOM,margins:{top:0,bottom:0,left:valueLeft,right:20},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph(value,{spacing:{before:rowBefore,after:80,line:260}})]}),
  ]}))
});

const hovpAcknowledgementTable=(leftRows:[string,string][],rightRows:[string,string][])=>new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:[
    new TableRow({children:[
      new TableCell({width:{size:49,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:0,bottom:0,left:0,right:80},children:[exactParagraph([new TextRun({text:"Purchaser",underline:{type:UnderlineType.SINGLE}})],{spacing:{before:0,after:140,line:260}})]}),
      new TableCell({width:{size:49,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:0,bottom:0,left:80,right:0},children:[exactParagraph([new TextRun({text:"For Selangor Properties Sdn Bhd",underline:{type:UnderlineType.SINGLE}})],{spacing:{before:0,after:140,line:260}})]}),
    ]}),
    ...leftRows.map((leftRow,index)=>new TableRow({children:[
      new TableCell({width:{size:49,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.BOTTOM,borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:0,bottom:0,left:0,right:80},children:[hovpFieldTable([leftRow],4600,1650,180,true,20,index===0?560:0)]}),
      new TableCell({width:{size:49,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.BOTTOM,borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:0,bottom:0,left:80,right:0},children:[hovpFieldTable([rightRows[index]],4600,1650,180,true,20,index===0?560:0)]}),
    ]})),
  ],
});

async function createHovpWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const airaLogo=new Uint8Array(await readFile(path.join(process.cwd(),"public","aira-residence-logo.png")));
  const purchaser=text(content,"customer_name");
  const addressLines=noticeAddressLines(text(content,"customer_address",""));
  const unit=text(content,"unit_number");
  const handover=text(content,"hovp_date","")||currentLetterDate();
  const salesperson=text(content,"salesperson_name","");
  const salespersonDesignation=text(content,"salesperson_designation","");
  const salespersonMobile=text(content,"salesperson_mobile","");
  const salespersonEmail=text(content,"salesperson_email","");
  const paragraph=(children:string|TextRun[],options:any={})=>exactParagraph(children,{spacing:{before:0,after:180,line:250},...options});
  const heading=(number:number,value:string)=>paragraph([new TextRun(`${number}.    `),new TextRun({text:value,underline:{type:UnderlineType.SINGLE}})],{spacing:{before:0,after:75,line:250}});
  const term=(value:string,after=120)=>paragraph(value,{alignment:AlignmentType.JUSTIFIED,indent:{left:430},spacing:{before:0,after,line:250}});
  const children:(Paragraph|Table)[]=[
    paragraph(currentLetterDate()),
    paragraph([new TextRun({text:purchaser.toUpperCase(),bold:true}),...addressLines.map((address)=>new TextRun({text:address,break:1}))]),
    paragraph(purchaserGreeting(content)),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[new TableCell({margins:{top:0,bottom:60,left:0,right:0},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:"Re:  AIRA Residence – Handover of Vacant Possession",bold:true})],{spacing:{before:90,after:0,line:250}})]})]})]}),
    paragraph([new TextRun("We refer to your purchase of Unit "),new TextRun({text:unit,bold:true}),new TextRun(", AIRA Residence (“Unit”).")],{spacing:{before:210,after:180,line:250}}),
    paragraph([new TextRun("We are pleased to inform you that vacant possession of the Unit is available for handover on "),new TextRun({text:handover,bold:true}),new TextRun(".")]),
    paragraph("The handover of the Unit shall be on the following basis:"),
    heading(1,"As-Is, Where-Is Basis and No Defect Liability Period"),
    term("The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an “as-is, where-is” basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (“SPA”)."),
    heading(2,"Handover Items"),term("The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon the completion of procedures and documentation required for the handover of vacant possession of the Unit, including the signing of the relevant handover documents, delivery of keys, access cards and remotes, and fulfilment of the applicable handover requirements imposed by SPSB."),
    heading(3,"Building Management"),term("Following handover, matters relating to the building, common areas, facilities and services should be referred to AIRA Building Management."),
    paragraph([new TextRun({text:"AIRA Building Management",bold:true}),new TextRun({text:"AIRA Residence Lobby (Ground Floor)",break:1}),new TextRun({text:"Tel: 03-2011 5908",break:1}),new TextRun({text:"Email: airaresidencemgmt@gmail.com",break:1,underline:{type:UnderlineType.SINGLE}})],{indent:{left:430},spacing:{before:75,after:180,line:250}}),
    heading(4,"Handover Coordination"),
    term("For matters relating to the HOVP and handover arrangements, please contact:",75),
    paragraph([new TextRun(`Name: ${salesperson}`),new TextRun({text:`Designation: ${salespersonDesignation}`,break:1}),new TextRun({text:`Mobile: ${salespersonMobile}`,break:1}),new TextRun({text:`Email: ${salespersonEmail}`,break:1})],{indent:{left:430},spacing:{before:0,after:120,line:250}}),
    paragraph("Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession."),paragraph("Thank you."),
    exactParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"For and behalf SELANGOR PROPERTIES SDN. BHD.",break:1})],{spacing:{before:0,after:900,line:260}}),templateSignature(content),
    new Paragraph({children:[new PageBreak()]}),
    exactParagraph("",{spacing:{before:0,after:0,line:300}}),
    exactParagraph("",{spacing:{before:0,after:0,line:300}}),
    exactParagraph([new TextRun({text:"HOVP HANDOVER ACKNOWLEDGEMENT",bold:true,size:24})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:120,line:300}}),
    exactParagraph([new TextRun({text:"AIRA Residence",bold:true,size:24})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:720,line:300}}),
    hovpFieldTable([["Tower",towerFromUnit(unit)],["Unit No.",unit],["HOVP Date",handover]],4600,1650,180,true,20),
    exactParagraph("I/We acknowledge receipt of the keys, access cards, remote controls and other applicable handover items for the above Unit and confirm that vacant possession has been handed over and accepted on an “as-is, where-is” basis.",{alignment:AlignmentType.JUSTIFIED,spacing:{before:320,after:420,line:341}}),
    hovpAcknowledgementTable(
      [["Signature",""],["Purchaser’s Name",purchaser],["NRIC/Passport No.",text(content,"customer_ic","")],["Date",""]],
      [["Signature",""],["Name",""],["Designation",""],["Date",""]],
    ),
  ];
  return new Uint8Array(await Packer.toBuffer(hovpDocument(children,fullLogo,airaLogo)));
}

const popMoney=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{maximumFractionDigits:2}).format(value):"0";
const popCell=(value:string,bold=false)=>new TableCell({children:[new Paragraph({children:[new TextRun({text:value,bold})]})]});

async function createPopWord(content:Record<string,unknown>){
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const approved=typeof content.approved_selling_price==="number"?content.approved_selling_price:price;
  const discount=typeof content.repeat_buyer_discount==="number"?content.repeat_buyer_discount:0;
  const rebate=typeof content.rebate_amount==="number"?content.rebate_amount:0;
  const additional=typeof content.additional_revenue==="number"?content.additional_revenue:0;
  const spa=price, net=Math.max(0,spa-rebate), total=discount+rebate;
  const size=typeof content.floor_area==="number"?content.floor_area:0;
  const psf=(value:number)=>size?`(RM${popMoney(value/size)} psf)`:"";
  const fields:[string,string][]=[
    ["Introduction By - Agent",text(content,"pop_introduction_agent","NOT APPLICABLE")],
    ["SPSB",text(content,"pop_introduction_spsb","DIRECT SALES")],["Team Member Assisting",[text(content,"salesperson_name",""),text(content,"pop_assisting_member_2","")].filter(Boolean).join(" / ")],["Purchaser's Name",text(content,"customer_name","")],
    ["Unit No.",text(content,"unit_number","")],["Unit Type",text(content,"unit_type","")],["Size",`${popMoney(size)} ft²`],
    ["Approved Selling Price",`RM ${popMoney(approved)} ${psf(approved)}`],["Actual Proposed Selling Price",`RM ${popMoney(price)} ${psf(price)}`],["Additional Revenue",`RM ${popMoney(additional)}`],["Repeat Buyer Discount Offered",`RM ${popMoney(discount)}`],["SPA Price",`RM ${popMoney(spa)} ${psf(spa)}`],
    ["Value of any Rebate being proposed for the Purchaser",`RM ${popMoney(rebate)}`],["Hence, PROPOSED NET SELLING PRICE",`RM ${popMoney(net)} ${psf(net)}`],
    ["Hence: Total Value of Incentives",`RM ${popMoney(total)} = A + B`]
  ];
  const border={style:BorderStyle.SINGLE,size:4,color:"000000"};
  const details=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:fields.map(([label,value])=>new TableRow({children:[popCell(label,label.startsWith("Hence")),popCell(value,label.startsWith("Hence"))]})),borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border}});
  const approvals=["1. SBDM/BDM's Proposal:","Conditions of Sale:","2. Comments/Approval:"];
  const document=new Document({sections:[{children:[
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"SALES",bold:true,size:22})]}),
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"PROSPECT OFFER PROPOSAL FORM",bold:true,size:26})]}),details,
    new Paragraph({children:[new TextRun({text:"INCENTIVES",bold:true,color:"C00000"})]}),
    ...approvals.flatMap((heading,index)=>[new Paragraph({children:[new TextRun({text:heading,bold:true})]}),new Paragraph({children:[new TextRun({text:index===0?text(content,"pop_proposal_note",""):index===1?text(content,"pop_conditions_note",""):text(content,"pop_comments_note","")})]}),new Paragraph({children:[new TextRun({text:index===0?`SBDM/BDM: ${text(content,"salesperson_name","")} / ${text(content,"pop_assisting_member_2","")}    Date: ${text(content,"sale_date","")}`:index===2?"Director of Property    Date:":""})]})])
  ]}]});
  return new Uint8Array(await Packer.toBuffer(document));
}

export async function createWordLetter(type:DocumentType,content:Record<string,unknown>){
  if(type==="pre_booking_form")return createPopWord(content);
  const [fullLogo,emblemLogo]=await Promise.all([
    readFile(path.join(process.cwd(),"public","selangor-properties-berhad-letterhead.png")),
    readFile(path.join(process.cwd(),"public","selangor-properties-emblem.png")),
  ]);
  if(type==="acceptance_letter")return createAcceptanceWord(content,fullLogo,emblemLogo);
  const exactLetterGenerators:Partial<Record<DocumentType,(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array)=>Promise<Uint8Array>>>={
    agency_appointment_letter:createAgencyAppointmentWord,
    agent_commission_letter:createAgentCommissionWord,
    rebate_letter:createRebateWord,
    inventory_confirmation_letter:createInventoryWord,
    hovp_letter:createHovpWord,
  };
  const exactGenerator=exactLetterGenerators[type];
  if(exactGenerator)return exactGenerator(content,fullLogo,emblemLogo);
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const signer=text(content,"authorised_signatory_name","");
  const designation=text(content,"authorised_signatory_position","");
  const common=[
    new Paragraph({children:[new TextRun(type==="booking_form"?date(content.sale_date):currentLetterDate())]}),
    line(purchaser),line(text(content,"customer_address")),
  ];
  let title="";let body:string[]=[];
  if(type==="rebate_letter"){title=`AIRA RESIDENCE : UNIT ${unit} — CONFIRMATION OF REBATE OFFER`;body=[`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`,`Greetings from AIRA Residence.`,`Thank you for taking the next step towards culminating your purchase of the abovementioned unit.`,`As agreed, a rebate of ${amount(content.rebate_amount)} has been approved and will be offset directly from the payment of your Balance Purchase Price that follows the signing of the Sale and Purchase Agreement (SPA) and payment of Balance Deposit under the Sixth Schedule.`,`Once again, congratulations for becoming part of the AIRA family.`];}
  if(type==="inventory_confirmation_letter"){title=`AIRA RESIDENCE — CONFIRMATION OF INVENTORIES FOR UNIT ${unit}`;body=[`Dear ${text(content,"customer_salutation","Purchaser")} ${purchaser.split(" ")[0]},`,`Greetings from AIRA Residence.`,`Thank you for taking the next step towards culminating your purchase of the abovementioned unit.`,`As agreed, Unit ${unit} comes with a Schedule of Inventories (refer Attachment) which are included in the sale on an “as is where is” basis at a selling price of ${amount(content.quoted_id_net_selling_price)}.`,`As a result, we make no express or implied warranties or representations about the working condition, durability, fitness for purpose, or merchantability of the inventories on an “as is where is” basis. Furthermore, from the date of deemed delivery of vacant possession of the abovementioned unit, we will not be accountable to you for any incidental or indirect losses or damages arising from the use of the mentioned inventories.`,`We kindly ask that you sign the acknowledgement and acceptance below.`,`Once again, congratulations for becoming part of the AIRA family.`,`ACKNOWLEDGEMENT & ACCEPTANCE`,`I, ${purchaser}, ${text(content,"customer_ic","")} hereby acknowledge receipt of this letter, and confirm my understanding of, and agreement to the contents of this letter.`,`______________________________`,`Name:`,`IC / Passport No.:`,`Date:`];}
  if(type==="hovp_letter"){const handover=text(content,"hovp_date","To be confirmed");title="AIRA Residence — Handover of Vacant Possession";body=[`Dear Sir or Madam,`,`We refer to your purchase of Unit ${unit}, AIRA Residence (“Unit”).`,`We are pleased to inform you that vacant possession of the Unit is available for handover on ${handover}.`,`The handover of the Unit shall be on the following basis:`,`As-Is, Where-Is Basis and No Defect Liability Period`,`The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an “as-is, where-is” basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (“SPA”).`,`Handover Items`,`The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon the completion of procedures and documentation required for the handover of vacant possession of the Unit, including the signing of the relevant handover documents, delivery of keys, access cards and remotes, and fulfilment of the applicable handover requirements imposed by SPSB.`,`Building Management`,`Following handover, matters relating to the building, common areas, facilities and services should be referred to AIRA Building Management.`,`AIRA Building Management`,`AIRA Residence Lobby (Ground Floor)`,`Tel: 03-2011 5908`,`Email: airaresidencemgmt@gmail.com`,`For matters relating to the HOVP and handover arrangements, please contact:`,`Name: ${text(content,"salesperson_name","")}`,`Designation: ${text(content,"salesperson_designation","")}`,`Mobile: ${text(content,"salesperson_mobile","")}`,`Email: ${text(content,"salesperson_email","")}`,`Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession.`,`Thank you.`];}
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
      children:[...common,new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:title,bold:true})]}),...body.map(line),line(""),line("Yours faithfully,"),line("For and on behalf of Selangor Properties Sdn. Bhd."),line(""),line(""),line("__________________________________"),line(signer||"__________________________________"),line(designation||"____________________________")]
    }]
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
