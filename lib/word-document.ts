import { readFile } from "node:fs/promises";
import path from "node:path";
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, VerticalAlign, WidthType } from "docx";
import type { DocumentType } from "@/lib/types";
import { noticeAddressLines } from "@/lib/notice-address";
import { purchaserGreeting } from "@/lib/purchaser-greeting";
import { designationForSalesPersonnel } from "@/lib/sales-personnel";

const text=(content:Record<string,unknown>,key:string,fallback="—")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const amount=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(value):"—";
const date=(value:unknown)=>{if(typeof value!=="string"||!value)return "—";return new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));};
const currentLetterDate=()=>new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kuala_Lumpur"}).format(new Date());
const issuedLetterDate=(content:Record<string,unknown>)=>{const value=text(content,"letter_issued_at","");if(!value)return currentLetterDate();const parsed=new Date(value);return Number.isNaN(parsed.getTime())?currentLetterDate():new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kuala_Lumpur"}).format(parsed);};
const towerFromUnit=(unit:string)=>{const tower=unit.split("-")[0]?.toUpperCase();return tower==="A"||tower==="B"?tower:"";};
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
        new TextRun({text:"Malaysia. (P.O. Box 12267, 50772 Kuala Lumpur, Malaysia)        t +603 2094 1122        f +603 2095 0150",break:1,size:14}),
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
    ["Developer","Selangor Properties Sdn. Bhd."],
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

async function createAcceptanceWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const isCompany=text(content,"purchaser_type","individual")==="company";
  const salutation=text(content,"customer_salutation","Purchaser");
  const contact=text(content,"salesperson_name","Booking contact");
  const salespersonDesignation=designationForSalesPersonnel(contact);
  const agency=text(content,"agent_company","");
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const deposit=price*.1;
  const addressLines=noticeAddressLines(text(content,"customer_address",""));
  const pageOne=[
    acceptanceParagraph(currentLetterDate(),{alignment:AlignmentType.LEFT,spacing:{before:220,after:200,line:341}}),
    acceptanceParagraph([new TextRun({text:purchaser,bold:true}),...addressLines.map((address)=>new TextRun({text:address,break:1}))],{alignment:AlignmentType.LEFT,spacing:{before:0,after:240,line:300}}),
    acceptanceParagraph(purchaserGreeting(content),{alignment:AlignmentType.LEFT,spacing:{before:0,after:240,line:300}}),
    acceptanceParagraph([new TextRun({text:"RE:      NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE",bold:true,underline:{type:UnderlineType.SINGLE}})],{alignment:AlignmentType.LEFT,spacing:{before:120,after:220,line:300}}),
    acceptanceFactTable(content),
    acceptanceParagraph("Greetings from Selangor Properties and the AIRA Residence team.",{alignment:AlignmentType.LEFT,spacing:{before:180,after:200,line:341}}),
    acceptanceParagraph([new TextRun(`We thank you for your Offer to Purchase the Property described above which is dated ${date(content.sale_date)} (“`),new TextRun({text:"Offer",bold:true}),new TextRun("”). We are pleased that you have made such a discerning decision to purchase a unit in AIRA Residence – Kuala Lumpur’s best kept secret. With your selection, we welcome you to the beginning of AIRA Residence’s story and we encourage you to discover more of the hidden treasures which only living in the exclusive enclave of Damansara Heights can offer.")]),
    acceptanceParagraph([new TextRun("You are just a few steps away from owning the Property and to help you move along the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (“"),new TextRun({text:"SPA",bold:true}),new TextRun("”), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively “"),new TextRun({text:"Sale Documents",bold:true}),new TextRun("”) in the manner described below.")]),
    acceptanceParagraph(`Firstly we ask that you kindly contact our ${salespersonDesignation||"sales and marketing agent"}${salespersonDesignation?`, ${contact},`:` ${contact}${agency?` from ${agency}`:""}`} to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter.`),
  ];
  const pageTwo=[
    new Paragraph({children:[new PageBreak()]}),
    acceptanceParagraph("Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:",{alignment:AlignmentType.JUSTIFIED,spacing:{before:560,after:200,line:341}}),
    acceptanceParagraph([new TextRun("1.   a cheque or bank draft made in favour of “"),new TextRun({text:"Selangor Properties Sdn. Bhd.",bold:true}),new TextRun("” for a sum equivalent to "),new TextRun({text:amount(deposit),bold:true}),new TextRun(", being payment of the first ten per centum (10%) of the Purchase Price as prescribed in the Third Schedule of the SPA; and")],{indent:{left:420,hanging:420}}),
    ...(isCompany?[
      acceptanceParagraph([new TextRun("2.   "),new TextRun({text:"if you are a corporation",italics:true}),new TextRun(":")],{indent:{left:420,hanging:420}}),
      acceptanceParagraph("(a)   a certified true copy of your company’s board of directors’ and shareholders’ (if applicable) resolution authorizing (i) the purchase of the Property, and (ii) the execution of the Sale Documents, the memorandum of transfer in respect of the Property together with all relevant documents thereto and in respect of the sale and purchase of the Property, by way of affixation of your company’s common seal and execution by your company’s authorized signatories;",{indent:{left:900,hanging:450}}),
      acceptanceParagraph("(b)   a certified true copy of the latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49; and",{indent:{left:900,hanging:450}}),
      acceptanceParagraph("(c)   the company’s rubber stamp.",{indent:{left:900,hanging:450}}),
    ]:[acceptanceParagraph([new TextRun("2.   "),new TextRun({text:"if you are an individual",italics:true}),new TextRun(", your identity card / passport;")],{indent:{left:420,hanging:420}})]),
    acceptanceParagraph("Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase.",{spacing:{before:120,after:120,line:341}}),
    acceptanceParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"On behalf of Selangor Properties Sdn. Bhd.",bold:true,break:1})],{alignment:AlignmentType.LEFT,spacing:{before:240,after:1100,line:300}}),
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

const letterDocument=(children:(Paragraph|Table)[],fullLogo:Uint8Array,emblemLogo:Uint8Array,twoPages=false,footerDistance=360,topMargin=1600,headerDistance=876)=>new Document({
  features:{updateFields:true},
  styles:{default:{document:{run:{font:"Arial",size:18},paragraph:{spacing:{line:300,after:0}}}}},
  sections:[{
    properties:{titlePage:twoPages,page:{size:{width:11906,height:16838},margin:{top:topMargin,right:1134,bottom:1000,left:1134,header:headerDistance,footer:footerDistance}}},
    headers:twoPages?{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)}:{default:letterHeader(fullLogo)},
    footers:twoPages?{first:acceptanceFirstFooter(),default:pageNumberFooter()}:{default:acceptanceFirstFooter()},
    children,
  }]
});

const hovpDocument=(children:(Paragraph|Table)[],fullLogo:Uint8Array,emblemLogo:Uint8Array)=>new Document({
  features:{updateFields:true},
  styles:{default:{document:{run:{font:"Helvetica",size:20},paragraph:{spacing:{line:260,after:0}}}}},
  sections:[{
    properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1220,right:1440,bottom:700,left:1440,header:720,footer:360}}},
    headers:{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)},
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

async function createAgentCommissionWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const agency=text(content,"agent_company","");
  const enteredAgencyAddress=text(content,"agent_address","");
  const agencyAddress=enteredAgencyAddress
    ? enteredAgencyAddress.split(/\r?\n/).map((line)=>line.trim()).filter(Boolean)
    : /\bIQI\b/i.test(agency)?["9-3, 3rd Floor, Medan Klang Lama 28,","Jalan Klang Lama,","58000 Kuala Lumpur."]:[];
  const unit=text(content,"unit_number");
  const tower=towerFromUnit(unit);
  const purchaser=text(content,"customer_name").toUpperCase();
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const priceText=`RM${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(price)}`;
  const salesperson=text(content,"salesperson_name","");
  const letterDate=issuedLetterDate(content);
  const rows:[string,string][]=[
    ["Project",text(content,"project_name")],
    ["Property",`Parcel No. ${unit}${tower?`, Tower ${tower}`:""}`],
    ["Purchaser",purchaser],
    ["Purchase Price",priceText],
  ];
  const facts=new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:6,color:"333333"},left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
    rows:rows.map(([label,value],index)=>new TableRow({children:[
      new TableCell({width:{size:18,type:WidthType.PERCENTAGE},margins:{top:0,bottom:index===rows.length-1?70:0,left:0,right:0},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:label,bold:true})],{spacing:{before:0,after:35,line:280}})]}),
      new TableCell({width:{size:2,type:WidthType.PERCENTAGE},margins:{top:0,bottom:index===rows.length-1?70:0,left:0,right:0},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:":",bold:true})],{spacing:{before:0,after:35,line:280}})]}),
      new TableCell({width:{size:80,type:WidthType.PERCENTAGE},margins:{top:0,bottom:index===rows.length-1?70:0,left:0,right:0},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:value,bold:true})],{spacing:{before:0,after:35,line:280}})]}),
    ]}))
  });
  const pageOne:(Paragraph|Table)[]=[
    exactParagraph(letterDate,{spacing:{before:220,after:420,line:300}}),
    exactParagraph([new TextRun(agency),...agencyAddress.map(address=>new TextRun({text:address,break:1}))],{spacing:{before:0,after:420,line:300}}),
    exactParagraph("Dear Sir or Madam,",{spacing:{before:0,after:320,line:300}}),
    exactParagraph([new TextRun({text:"AGENT'S FEE ARRANGEMENT",bold:true,size:20})],{spacing:{before:0,after:0,line:300}}),
    facts,
    exactParagraph("We refer to your letter of appointment dated 4th April, 2023 to the abovementioned purchaser.",{spacing:{before:300,after:200,line:300}}),
    exactParagraph([new TextRun("We are pleased to advise that in the case of this sale only, the agents commission will be "),new TextRun({text:"2%",bold:true}),new TextRun(" of the Net Purchase Price of "),new TextRun({text:priceText,bold:true}),new TextRun(".")],{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("The Sales Commission will be paid in Ringgit Malaysia within 30 days of our receipt of the following:",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph("•    a stamped copy of the Sales & Purchase Agreement (SPA);",{indent:{left:420,hanging:240},spacing:{before:0,after:100,line:300}}),
    exactParagraph("•    a copy of the relevant State Authority's Consent Approval for Foreigners; and",{indent:{left:420,hanging:240},spacing:{before:0,after:100,line:300}}),
    exactParagraph("•    the Agent's Tax Invoice.",{indent:{left:420,hanging:240},spacing:{before:0,after:260,line:300}}),
    exactParagraph("We look forward to continuing our working collaboration and wish you every success in supporting our sales efforts during the year ahead.",{alignment:AlignmentType.JUSTIFIED}),
    exactParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"For and behalf SELANGOR PROPERTIES SDN. BHD.",break:1})],{spacing:{before:300,after:620,line:300}}),
    acceptanceSignature(content),
    exactParagraph(salesperson?`c.c.   ${salesperson}`:"",{spacing:{before:220,after:0,line:260}}),
  ];
  const pageTwo:(Paragraph|Table)[]=[
    new Paragraph({children:[new PageBreak()]}),
    exactParagraph([new TextRun({text:"ACCEPTANCE",bold:true,size:22})],{alignment:AlignmentType.CENTER,spacing:{before:320,after:380,line:300}}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[new TableCell({borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:6,color:"333333"},left:noBorder,right:noBorder},margins:{top:0,bottom:130,left:0,right:0},children:[
      exactParagraph([new TextRun({text:`AGENT'S FEE ARRANGEMENT TO THE SALES OF UNIT ${unit},`,bold:true}),new TextRun({text:`${text(content,"project_name","AIRA RESIDENCE").toUpperCase()} DEVELOPMENT`,bold:true,break:1}),new TextRun({text:"No. 8, Jalan Batai, Bukit Damansara, Kuala Lumpur",break:1})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:341}})
    ]})]})]}),
    exactParagraph(`I/We, ${agency||"____________________"} acknowledge receipt of this Letter dated ${letterDate} from SELANGOR PROPERTIES SDN. BHD. and agree to the terms and conditions contained herein.`,{alignment:AlignmentType.JUSTIFIED,spacing:{before:130,after:2100,line:341}}),
    new Table({width:{size:4500,type:WidthType.DXA},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[new TableCell({borders:{top:{style:BorderStyle.DOTTED,size:5,color:"333333"},bottom:noBorder,left:noBorder,right:noBorder},margins:{top:70,bottom:0,left:0,right:0},children:[
      exactParagraph("Signature and Company Rubber Stamp:",{spacing:{before:0,after:140,line:300}}),
      new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:["Name:","I/C No.:","Date:"].map(label=>new TableRow({children:[
        new TableCell({width:{size:950,type:WidthType.DXA},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph(label,{spacing:{before:100,after:130,line:300}})]}),
        new TableCell({width:{size:3550,type:WidthType.DXA},borders:{top:noBorder,bottom:{style:BorderStyle.DOTTED,size:5,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph("\u00A0",{spacing:{before:100,after:130,line:300}})]}),
      ]}))}),
    ]})]})]}),
  ];
  return new Uint8Array(await Packer.toBuffer(letterDocument([...pageOne,...pageTwo],fullLogo,emblemLogo,true,360,1360,760)));
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
  const purchaser=text(content,"customer_name");
  const addressLines=noticeAddressLines(text(content,"customer_address",""));
  const unit=text(content,"unit_number");
  const handover=currentLetterDate();
  const salesperson=text(content,"salesperson_name","");
  const salespersonDesignation=text(content,"salesperson_designation","");
  const salespersonMobile=text(content,"salesperson_mobile","");
  const salespersonEmail=text(content,"salesperson_email","");
  const approver=text(content,"authorised_signatory_name","");
  const designation=text(content,"authorised_signatory_position","");
  const paragraph=(children:string|TextRun[],options:any={})=>exactParagraph(children,{spacing:{before:0,after:180,line:250},...options});
  const heading=(number:number,value:string)=>paragraph([new TextRun(`${number}.    `),new TextRun({text:value,underline:{type:UnderlineType.SINGLE}})],{spacing:{before:0,after:75,line:250}});
  const term=(value:string,after=120)=>paragraph(value,{alignment:AlignmentType.JUSTIFIED,indent:{left:430},spacing:{before:0,after,line:250}});
  const children:(Paragraph|Table)[]=[
    paragraph(currentLetterDate()),
    paragraph([new TextRun({text:purchaser.toUpperCase(),bold:true}),...addressLines.map((address)=>new TextRun({text:address,break:1}))]),
    paragraph(purchaserGreeting(content)),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[new TableCell({margins:{top:0,bottom:60,left:0,right:0},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:"RE:  AIRA RESIDENCE – HANDOVER OF VACANT POSSESSION",bold:true})],{spacing:{before:90,after:0,line:250}})]})]})]}),
    paragraph([new TextRun("We refer to your purchase of Unit "),new TextRun({text:unit,bold:true}),new TextRun(", AIRA Residence (“Unit”).")],{spacing:{before:210,after:180,line:250}}),
    paragraph([new TextRun("We are pleased to inform you that vacant possession of the Unit is available for handover on "),new TextRun({text:handover,bold:true}),new TextRun(".")]),
    paragraph("The handover of the Unit shall be on the following basis:"),
    heading(1,"As-Is, Where-Is Basis and No DLP"),
    term("The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an “as-is, where-is” basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (“SPA”)."),
    heading(2,"Handover Items"),term("The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon completion of the handover formalities."),
    heading(3,"Renovation and Alteration"),term("Following handover, any renovation, alteration or modification carried out within the Unit shall be at your own cost and responsibility."),
    heading(4,"Building Management"),term("Following handover, matters relating to the building, common areas, facilities and building management shall be referred to AIRA Building Management."),
    paragraph([new TextRun({text:"AIRA Building Management",bold:true}),new TextRun({text:"Tel: 03-2011 5908",break:1}),new TextRun({text:"Email: airaresidencemgmt@gmail.com",break:1,underline:{type:UnderlineType.SINGLE}})],{indent:{left:430},spacing:{before:75,after:180,line:250}}),
    heading(5,"Handover Coordination"),
    term("For matters relating to the HOVP and handover arrangements, please contact:",75),
    paragraph([new TextRun(`Name: ${salesperson}`),new TextRun({text:`Designation: ${salespersonDesignation}`,break:1}),new TextRun({text:`Mobile: ${salespersonMobile}`,break:1}),new TextRun({text:`Email: ${salespersonEmail}`,break:1})],{indent:{left:430},spacing:{before:0,after:120,line:250}}),
    paragraph("Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession."),paragraph("Thank you."),
    exactParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"For and behalf SELANGOR PROPERTIES SDN. BHD.",break:1})],{spacing:{before:0,after:900,line:260}}),acceptanceSignature(content),
    new Paragraph({children:[new PageBreak()]}),
    exactParagraph("",{spacing:{before:0,after:0,line:300}}),
    exactParagraph("",{spacing:{before:0,after:0,line:300}}),
    exactParagraph([new TextRun({text:"HOVP HANDOVER ACKNOWLEDGEMENT",bold:true,size:24})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:120,line:300}}),
    exactParagraph([new TextRun({text:"AIRA Residence",bold:true,size:24})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:720,line:300}}),
    hovpFieldTable([["Tower",towerFromUnit(unit)],["Unit No.",unit],["HOVP Date",handover]],4600,1650,180,true,20),
    exactParagraph("I/We acknowledge receipt of the keys, access cards, remote controls and other applicable handover items for the above Unit and confirm that vacant possession has been handed over and accepted on an “as-is, where-is” basis.",{alignment:AlignmentType.JUSTIFIED,spacing:{before:320,after:420,line:341}}),
    hovpAcknowledgementTable(
      [["Signature",""],["Purchaser’s Name",purchaser],["NRIC/Passport No.",text(content,"customer_ic","")],["Date",""]],
      [["Signature",""],["Name",approver],["Designation",designation],["Date",""]],
    ),
  ];
  return new Uint8Array(await Packer.toBuffer(hovpDocument(children,fullLogo,emblemLogo)));
}

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
  if(type==="acceptance_letter")return createAcceptanceWord(content,fullLogo,emblemLogo);
  const exactLetterGenerators:Partial<Record<DocumentType,(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array)=>Promise<Uint8Array>>>={
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
      children:[...common,new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:title,bold:true})]}),...body.map(line),line(""),line("Yours faithfully,"),line("For and on behalf of Selangor Properties Sdn. Bhd."),line(""),line(""),line("__________________________________"),line(signer||"__________________________________"),line(designation||"____________________________")]
    }]
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
