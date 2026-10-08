import { readFile } from "node:fs/promises";
import path from "node:path";
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, WidthType } from "docx";
import type { DocumentType } from "@/lib/types";

const text=(content:Record<string,unknown>,key:string,fallback="—")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const amount=(value:unknown)=>typeof value==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(value):"—";
const date=(value:unknown)=>{if(typeof value!=="string"||!value)return "—";return new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));};
const currentLetterDate=()=>new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kuala_Lumpur"}).format(new Date());
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
  children:[new ImageRun({type:"png",data:image,transformation:emblem?{width:40,height:31}:{width:195,height:58},altText:{title:emblem?"SPB emblem":"Selangor Properties Berhad",description:"Selangor Properties Berhad",name:emblem?"SPB emblem":"Selangor Properties Berhad"}})]
})]});

const hovpAcknowledgementHeader=(image:Uint8Array)=>new Header({children:[new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:[new TableRow({children:[
    new TableCell({width:{size:55,type:WidthType.PERCENTAGE},margins:{top:0,bottom:0,left:0,right:0},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[new Paragraph({spacing:{before:0,after:0,line:210},children:[
      new TextRun({text:"AIRA",color:"D89A9A",size:42}),
      new TextRun({text:"RESIDENCE",color:"D89A9A",size:18,break:1,characterSpacing:30}),
    ]})]}),
    new TableCell({width:{size:45,type:WidthType.PERCENTAGE},margins:{top:0,bottom:0,left:0,right:0},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new ImageRun({type:"png",data:image,transformation:{width:158,height:47},altText:{title:"Selangor Properties Berhad",description:"Selangor Properties Berhad",name:"Selangor Properties Berhad"}})]})]})
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
  spacing:{before:0,after:200,line:341},
  alignment:AlignmentType.JUSTIFIED,
  ...options,
  children:typeof children==="string"?[new TextRun(children)]:children,
});

const acceptanceFactTable=(content:Record<string,unknown>)=>{
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const tower=unit.split("-")[0]?.toUpperCase();
  const property=`Parcel No. ${unit}${tower==="A"||tower==="B"?`, Tower ${tower}`:""}`;
  const rows:[string,string][]=[
    ["Project",text(content,"project_name")],
    ["Property",property],
    ["Developer","Selangor Properties Berhad"],
    ["Proprietor",text(content,"proprietor_name","Bangsar Hill Holdings Sdn. Bhd.")],
    ["Purchaser",`1. ${purchaser}`],
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
      new TextRun({text:`Name : ${text(content,"authorised_signatory_name","")}`,break:1}),
      new TextRun({text:`Position : ${text(content,"authorised_signatory_position","")}`,break:1}),
    ]})]
  })]})]
});

async function createAcceptanceWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const salutation=text(content,"customer_salutation","Purchaser");
  const contact=text(content,"salesperson_name","Booking contact");
  const agency=text(content,"agent_company","");
  const price=typeof content.purchase_price==="number"?content.purchase_price:0;
  const deposit=price*.1;
  const pageOne=[
    acceptanceParagraph(currentLetterDate(),{alignment:AlignmentType.LEFT,spacing:{before:220,after:200,line:341}}),
    acceptanceParagraph([new TextRun({text:purchaser,bold:true}),new TextRun({text:text(content,"customer_address"),break:1})],{alignment:AlignmentType.LEFT,spacing:{before:0,after:760,line:300}}),
    acceptanceParagraph(`Dear ${salutation} ${purchaser.split(" ")[0]},`,{alignment:AlignmentType.LEFT}),
    acceptanceParagraph([new TextRun({text:"RE:      NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE",bold:true,underline:{type:UnderlineType.SINGLE}})],{alignment:AlignmentType.LEFT,spacing:{before:600,after:240,line:300}}),
    acceptanceFactTable(content),
    acceptanceParagraph("Greetings from Selangor Properties and the AIRA Residence team.",{alignment:AlignmentType.LEFT,spacing:{before:600,after:200,line:341}}),
    acceptanceParagraph([new TextRun(`We thank you for your Offer to Purchase the Property described above which is dated ${date(content.sale_date)} (“`),new TextRun({text:"Offer",bold:true}),new TextRun("”). We are pleased that you have made such a discerning decision to purchase a unit in AIRA Residence – Kuala Lumpur’s best kept secret. With your selection, we welcome you to the beginning of AIRA Residence’s story and we encourage you to discover more of the hidden treasures which only living in the exclusive enclave of Damansara Heights can offer.")]),
    acceptanceParagraph([new TextRun("You are just a few steps away from owning the Property and to help you move along the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (“"),new TextRun({text:"SPA",bold:true}),new TextRun("”), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively “"),new TextRun({text:"Sale Documents",bold:true}),new TextRun("”) in the manner described below.")]),
    acceptanceParagraph(`Firstly we ask that you kindly contact our sales and marketing agent ${contact}${agency?` from ${agency}`:""} to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter. In doing so, you will also gain entitlement to a very Special Offer – your choice of the installation of either: (i) the barbeque displayed on the living room balcony of the AIRA Residence Show Apartment; or (ii) a free Miele coffee machine as displayed in the Show Apartment.`),
  ];
  const pageTwo=[
    new Paragraph({children:[new PageBreak()]}),
    acceptanceParagraph("Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:",{alignment:AlignmentType.JUSTIFIED,spacing:{before:320,after:200,line:341}}),
    acceptanceParagraph([new TextRun("1.   a cheque or bank draft made in favour of “"),new TextRun({text:"Selangor Properties Berhad",bold:true}),new TextRun("” for a sum equivalent to "),new TextRun({text:amount(deposit),bold:true}),new TextRun(", being payment of the first ten per centum (10%) of the Purchase Price as prescribed in the Third Schedule of the SPA; and")],{indent:{left:420,hanging:420}}),
    acceptanceParagraph([new TextRun("2.   "),new TextRun({text:"if you are an individual",italics:true}),new TextRun(", your identity card / passport;")],{indent:{left:420,hanging:420}}),
    acceptanceParagraph("or",{alignment:AlignmentType.LEFT,indent:{left:420}}),
    acceptanceParagraph([new TextRun({text:"if you are a corporation",italics:true}),new TextRun(":")],{alignment:AlignmentType.LEFT,indent:{left:420}}),
    acceptanceParagraph("(a)   a certified true copy of your company’s board of directors’ and shareholders’ (if applicable) resolution authorizing (i) the purchase of the Property, and (ii) the execution of the Sale Documents, the memorandum of transfer in respect of the Property together with all relevant documents thereto and in respect of the sale and purchase of the Property, by way of affixation of your company’s common seal and execution by your company’s authorized signatories;",{indent:{left:900,hanging:450}}),
    acceptanceParagraph("(b)   a certified true copy of the latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49; and",{indent:{left:900,hanging:450}}),
    acceptanceParagraph("(c)   the company’s rubber stamp.",{indent:{left:900,hanging:450}}),
    acceptanceParagraph("Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase and henceforth keeping you apprised of the construction progress of your new home in the months and years ahead.",{spacing:{before:120,after:120,line:341}}),
    acceptanceParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"On behalf of Selangor Properties Berhad",bold:true,break:1})],{alignment:AlignmentType.LEFT,spacing:{before:240,after:620,line:300}}),
    acceptanceSignature(content),
    acceptanceParagraph(`c.c.   ${text(content,"solicitor_name","")}`,{alignment:AlignmentType.LEFT,spacing:{before:420,after:0,line:240}}),
  ];
  const document=new Document({
    features:{updateFields:true},
    styles:{default:{document:{run:{font:"Arial",size:18},paragraph:{spacing:{line:341,after:0}}}}},
    sections:[{
      properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1600,right:1134,bottom:1000,left:1134,header:876,footer:360}}},
      headers:{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)},
      footers:{first:acceptanceFirstFooter(),default:pageNumberFooter()},
      children:[...pageOne,...pageTwo],
    }]
  });
  return new Uint8Array(await Packer.toBuffer(document));
}

const letterDocument=(children:(Paragraph|Table)[],fullLogo:Uint8Array,emblemLogo:Uint8Array,twoPages=false,footerDistance=360)=>new Document({
  features:{updateFields:true},
  styles:{default:{document:{run:{font:"Arial",size:18},paragraph:{spacing:{line:300,after:0}}}}},
  sections:[{
    properties:{titlePage:twoPages,page:{size:{width:11906,height:16838},margin:{top:1600,right:1134,bottom:1000,left:1134,header:876,footer:footerDistance}}},
    headers:twoPages?{first:letterHeader(fullLogo),default:letterHeader(emblemLogo,true)}:{default:letterHeader(fullLogo)},
    footers:twoPages?{first:acceptanceFirstFooter(),default:pageNumberFooter()}:{default:acceptanceFirstFooter()},
    children,
  }]
});

const hovpDocument=(children:(Paragraph|Table)[],fullLogo:Uint8Array)=>new Document({
  features:{updateFields:true},
  styles:{default:{document:{run:{font:"Helvetica",size:20},paragraph:{spacing:{line:260,after:0}}}}},
  sections:[{
    properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:700,left:1440,header:720,footer:360}}},
    headers:{first:letterHeader(fullLogo),default:hovpAcknowledgementHeader(fullLogo)},
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
  new TextRun({text:text(content,"customer_address"),break:1}),
],{spacing:{before:0,after:300,line:300}});

async function createRebateWord(content:Record<string,unknown>,fullLogo:Uint8Array,emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const children:(Paragraph|Table)[]=[
    exactParagraph(currentLetterDate(),{spacing:{before:420,after:540,line:300}}),
    exactParagraph([
      new TextRun({text:text(content,"customer_name").toUpperCase(),bold:true}),
      new TextRun({text:text(content,"customer_address"),break:1}),
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

const hovpFieldTable=(rows:[string,string][],width=4300,labelWidth=1650)=>new Table({
  width:{size:width,type:WidthType.DXA},
  borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},
  rows:rows.map(([label,value])=>new TableRow({children:[
    new TableCell({width:{size:labelWidth,type:WidthType.DXA},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph(label,{spacing:{before:0,after:80,line:260}})]}),
    new TableCell({width:{size:180,type:WidthType.DXA},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},children:[exactParagraph(":",{spacing:{before:0,after:80,line:260}})]}),
    new TableCell({width:{size:width-labelWidth-180,type:WidthType.DXA},margins:{top:0,bottom:0,left:45,right:20},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph(value,{spacing:{before:0,after:80,line:260}})]}),
  ]}))
});

async function createHovpWord(content:Record<string,unknown>,fullLogo:Uint8Array,_emblemLogo:Uint8Array){
  const purchaser=text(content,"customer_name");
  const unit=text(content,"unit_number");
  const handover=currentLetterDate();
  const salesperson=text(content,"salesperson_name","");
  const approver=text(content,"authorised_signatory_name","");
  const designation=text(content,"authorised_signatory_position","");
  const heading=(number:number,value:string)=>exactParagraph(`${number}.    ${value}`,{spacing:{before:60,after:30,line:260}});
  const term=(value:string)=>exactParagraph(value,{alignment:AlignmentType.JUSTIFIED,indent:{left:430},spacing:{before:0,after:90,line:260}});
  const children:(Paragraph|Table)[]=[
    exactParagraph(currentLetterDate(),{spacing:{before:120,after:200,line:260}}),exactRecipient(content),exactParagraph("Dear Sir or Madam,",{spacing:{before:0,after:180,line:260}}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[new TableCell({margins:{top:0,bottom:50,left:0,right:0},borders:{top:noBorder,bottom:{style:BorderStyle.SINGLE,size:5,color:"333333"},left:noBorder,right:noBorder},children:[exactParagraph([new TextRun({text:"RE:  AIRA RESIDENCE – HANDOVER OF VACANT POSSESSION",bold:true})],{spacing:{before:0,after:0,line:260}})]})]})]}),
    exactParagraph([new TextRun("We refer to your purchase of Unit "),new TextRun({text:unit,bold:true}),new TextRun(", AIRA Residence (“Unit”).")]),
    exactParagraph([new TextRun("We are pleased to inform you that vacant possession of the Unit is available for handover on "),new TextRun({text:handover,bold:true}),new TextRun(".")]),
    exactParagraph("The handover of the Unit shall be on the following basis:"),
    heading(1,"As-Is, Where-Is Basis and No DLP"),
    term("The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an “as-is, where-is” basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (“SPA”)."),
    heading(2,"Handover Items"),term("The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon completion of the handover formalities."),
    heading(3,"Renovation and Alteration"),term("Following handover, any renovation, alteration or modification carried out within the Unit shall be at your own cost and responsibility."),
    heading(4,"Building Management"),term("Following handover, matters relating to the building, common areas, facilities and building management shall be referred to AIRA Building Management."),
    exactParagraph([new TextRun({text:"AIRA Building Management",bold:true}),new TextRun({text:"Tel: 03-2011 5908",break:1}),new TextRun({text:"Email: airaresidencemgmt@gmail.com",break:1,underline:{type:UnderlineType.SINGLE}})],{indent:{left:430},spacing:{before:0,after:100,line:240}}),
    exactParagraph("For matters relating to the HOVP and handover arrangements, please contact:"),
    exactParagraph([new TextRun(`Name: ${salesperson}`),new TextRun({text:"Designation: ",break:1}),new TextRun({text:"Mobile: ",break:1}),new TextRun({text:"Email: ",break:1})],{spacing:{before:0,after:100,line:240}}),
    exactParagraph("Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession."),exactParagraph("Thank you."),
    exactParagraph([new TextRun("Yours faithfully,"),new TextRun({text:"For and behalf SELANGOR PROPERTIES SDN. BHD.",break:1})],{spacing:{before:0,after:240,line:260}}),acceptanceSignature(content),
    new Paragraph({children:[new PageBreak()]}),
    exactParagraph([new TextRun({text:"HOVP HANDOVER ACKNOWLEDGEMENT",bold:true,size:24})],{alignment:AlignmentType.CENTER,spacing:{before:240,after:120,line:300}}),
    exactParagraph([new TextRun({text:"AIRA Residence",bold:true,size:24})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:720,line:300}}),
    hovpFieldTable([["Tower",towerFromUnit(unit)],["Unit No.",unit],["HOVP Date",handover]],5000),
    exactParagraph("I/We acknowledge receipt of the keys, access cards, remote controls and other applicable handover items for the above Unit and confirm that vacant possession has been handed over and accepted on an “as-is, where-is” basis.",{alignment:AlignmentType.JUSTIFIED,spacing:{before:320,after:420,line:341}}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[
      new TableCell({width:{size:48,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:0,bottom:0,left:0,right:160},children:[exactParagraph([new TextRun({text:"Purchaser",underline:{type:UnderlineType.SINGLE}})],{spacing:{before:0,after:140,line:260}}),hovpFieldTable([["Signature",""],["Purchaser’s Name",purchaser],["NRIC/Passport No.",text(content,"customer_ic","")],["Date",""]],3900,1700)]}),
      new TableCell({width:{size:48,type:WidthType.PERCENTAGE},borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},margins:{top:0,bottom:0,left:160,right:0},children:[exactParagraph([new TextRun({text:"For Selangor Properties Sdn Bhd",underline:{type:UnderlineType.SINGLE}})],{spacing:{before:0,after:140,line:260}}),hovpFieldTable([["Signature",""],["Name",approver],["Designation",designation],["Date",""]],3900,1700)]}),
    ]})]}),
  ];
  return new Uint8Array(await Packer.toBuffer(hovpDocument(children,fullLogo)));
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
      children:[...common,new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:title,bold:true})]}),...body.map(line),line(""),line("Yours faithfully,"),line("For and on behalf of Selangor Properties Sdn. Bhd."),line(""),line(""),line("__________________________________"),line(`Name: ${signer||"__________________________________"}`),line(`Designation: ${designation||"____________________________"}`)]
    }]
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
