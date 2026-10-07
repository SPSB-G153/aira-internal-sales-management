import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

type Content=Record<string,unknown>;

const value=(content:Content,key:string)=>String(content[key]??"").trim();
const amount=(content:Content,key:string)=>typeof content[key]==="number"?content[key] as number:Number(content[key]??0)||0;
const escapeXml=(text:string)=>text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const money=(amount:number)=>amount.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2});
const towerFromUnit=(unit:string)=>{const tower=unit.split("-")[0]?.toUpperCase();return tower==="A"||tower==="B"?tower:"";};

function amountInWords(amount:number){
  const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const underThousand=(value:number):string=>{
    const parts:string[]=[];
    if(value>=100)parts.push(`${ones[Math.floor(value/100)]} Hundred`);
    const rest=value%100;
    if(rest>=20)parts.push(`${tens[Math.floor(rest/10)]}${rest%10?` ${ones[rest%10]}`:""}`);
    else if(rest)parts.push(ones[rest]);
    return parts.join(" ");
  };
  const whole=Math.floor(Math.max(0,amount));
  const parts:string[]=[];
  if(whole>=1_000_000)parts.push(`${underThousand(Math.floor(whole/1_000_000))} Million`);
  if(whole%1_000_000>=1_000)parts.push(`${underThousand(Math.floor(whole%1_000_000/1_000))} Thousand`);
  if(whole%1_000)parts.push(underThousand(whole%1_000));
  return `${parts.join(" ")||"Zero"} Only`;
}

function updateParagraph(xml:string,paraId:string,update:(paragraph:string)=>string){
  const pattern=new RegExp(`(<w:p(?=[^>]*w14:paraId=\"${paraId}\")[\\s\\S]*?</w:p>)`);
  return xml.replace(pattern,(_match,paragraph:string)=>update(paragraph));
}

function setParagraphText(xml:string,paraId:string,text:string){
  return updateParagraph(xml,paraId,paragraph=>{
    let written=false;
    const next=paragraph.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g,match=>{
      if(written)return match.replace(/>([\s\S]*?)<\/w:t>/,`></w:t>`);
      written=true;
      return match.replace(/>([\s\S]*?)<\/w:t>/,`>${escapeXml(text)}</w:t>`);
    });
    return written?next:next.replace("</w:p>",`<w:r><w:t xml:space=\"preserve\">${escapeXml(text)}</w:t></w:r></w:p>`);
  });
}

function setDottedLine(xml:string,paraId:string,left:number){
  const dotted="……………………………………………";
  const withText=setParagraphText(xml,paraId,dotted);
  return updateParagraph(withText,paraId,paragraph=>paragraph.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/,(_match,properties:string)=>{
    const indent=/<w:ind\b[^>]*\/>/.test(properties)
      ? properties.replace(/<w:ind\b[^>]*\/>/,`<w:ind w:left="${left}"/>`)
      : `${properties}<w:ind w:left="${left}"/>`;
    return `<w:pPr>${indent}</w:pPr>`;
  }));
}

function underlineFieldRun(xml:string,paraId:string,text:string,pad:number){
  if(!text)return xml;
  const escaped=escapeXml(text);
  return updateParagraph(xml,paraId,paragraph=>{
    const token=`>${escaped}</w:t>`;
    const textAt=paragraph.indexOf(token);
    if(textAt<0)return paragraph;
    const runStart=paragraph.lastIndexOf("<w:r ",textAt);
    const runClose=paragraph.indexOf("</w:r>",textAt);
    if(runStart<0||runClose<0)return paragraph;
    const runEnd=runClose+6;
    let run=paragraph.slice(runStart,runEnd).replace(token,`>${escaped}${"&#160;".repeat(pad)}</w:t>`);
    run=run.includes("</w:rPr>")
      ? run.replace("</w:rPr>",'<w:u w:val="dotted"/><w:position w:val="2"/></w:rPr>')
      : run.replace(/^(<w:r\b[^>]*>)/,'$1<w:rPr><w:u w:val="dotted"/><w:position w:val="2"/></w:rPr>');
    return `${paragraph.slice(0,runStart)}${run}${paragraph.slice(runEnd)}`;
  });
}

function breakBeforeText(xml:string,paraId:string,text:string){
  if(!text)return xml;
  const escaped=escapeXml(text);
  return updateParagraph(xml,paraId,paragraph=>{
    const plain=paragraph.indexOf(escaped);
    if(plain<0)return paragraph;
    const textStart=paragraph.lastIndexOf("<w:t",plain);
    const openEnd=paragraph.indexOf(">",textStart);
    if(textStart<0||openEnd<0)return paragraph;
    const before=paragraph.slice(openEnd+1,plain);
    return `${paragraph.slice(0,openEnd+1)}${before}</w:t><w:br/><w:t>${paragraph.slice(plain)}`;
  });
}

function addSpaceBeforeText(xml:string,paraId:string,text:string){
  if(!text)return xml;
  const escaped=escapeXml(text);
  return updateParagraph(xml,paraId,paragraph=>paragraph.replace(`>${escaped}`,`>&#160;${escaped}`));
}

function setPlaceholder(xml:string,paraId:string,index:number,text:string){
  let seen=0;
  return updateParagraph(xml,paraId,paragraph=>paragraph.replace(/(?:…|�|&#65533;|\.){2,}/g,match=>{
    if(seen++!==index)return match;
    return escapeXml(text);
  }));
}

// Keep the original leader after a value. Replacing it outright shortens the
// clause and changes its wrapping; retaining the remaining dots keeps Word's
// line geometry aligned with the approved PDF template.
function setDottedPlaceholder(xml:string,paraId:string,index:number,text:string,leadingDots=0){
  if(!text)return xml;
  let seen=0;
  return updateParagraph(xml,paraId,paragraph=>paragraph.replace(/(?:…|�|&#65533;|\.){2,}/g,match=>{
    if(seen++!==index)return match;
    const originalWidth=[...match].reduce((width,char)=>width+(char==="."?1:3),0);
    const remaining=Math.max(3,originalWidth-leadingDots-text.length*2);
    return `${".".repeat(leadingDots)}${escapeXml(text)}${".".repeat(remaining)}`;
  }));
}

// The approved form places typed values just above the printed dotted leader.
// Keep the surrounding template run geometry, but split the value into its own
// raised, dotted-underlined run so Word cannot pull the dots onto the text
// baseline or reflow the rest of the legal clause around the value.
function raiseDottedValue(xml:string,paraId:string,text:string){
  if(!text)return xml;
  const escaped=escapeXml(text);
  return updateParagraph(xml,paraId,paragraph=>paragraph.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g,(run,attrs:string,body:string)=>{
    const textMatch=body.match(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/);
    if(!textMatch||!textMatch[2].includes(escaped))return run;
    const [prefix,suffix]=textMatch[2].split(escaped,2);
    const baseProps=body.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0]??"";
    const plain=(value:string)=>value?`<w:r${attrs}>${baseProps}<w:t xml:space="preserve">${value}</w:t></w:r>`:"";
    const raisedProps=baseProps
      ? baseProps.replace("</w:rPr>",'<w:u w:val="dotted"/><w:position w:val="2"/></w:rPr>')
      : '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:u w:val="dotted"/><w:position w:val="2"/></w:rPr>';
    return `${plain(prefix)}<w:r${attrs}>${raisedProps}<w:t xml:space="preserve">${escaped}</w:t></w:r>${plain(suffix)}`;
  }));
}

function appendParagraphText(xml:string,paraId:string,text:string){
  return updateParagraph(xml,paraId,paragraph=>paragraph.replace("</w:p>",`<w:r><w:t xml:space=\"preserve\"> ${escapeXml(text)}</w:t></w:r></w:p>`));
}

const firstAddressLines=(address:string)=>address.split(/\r?\n|,/).map(part=>part.trim()).filter(Boolean).slice(0,4);

/** Creates a DOCX by changing only data slots inside the user-approved Booking Form template. */
export async function createBookingFormWord(content:Content){
  const template=await readFile(path.join(process.cwd(),"public","templates","booking-form-template.docx"));
  const zip=await JSZip.loadAsync(template);
  const documentFile=zip.file("word/document.xml");
  if(!documentFile)throw new Error("Booking form template is missing its document XML.");
  let xml=await documentFile.async("string");
  const price=amount(content,"purchase_price");
  const earnest=Math.round(price*2)/100;
  const balance=Math.round(price*8)/100;
  const purchaser=value(content,"customer_name");
  const purchaser2=value(content,"customer_name_2");
  const addresses=firstAddressLines(value(content,"customer_address"));

  // Cover page fields and the two calculated deposit clauses.
  xml=setPlaceholder(xml,"2723075B",0,purchaser);
  xml=underlineFieldRun(xml,"2723075B",purchaser,12);
  xml=setParagraphText(xml,"05DDE296","");
  xml=setPlaceholder(xml,"2C4A54A2",0,purchaser2);
  xml=underlineFieldRun(xml,"2C4A54A2",purchaser2,18);
  xml=setParagraphText(xml,"3A9D90E9","");
  xml=setPlaceholder(xml,"190CE0CA",0,value(content,"customer_ic"));
  xml=underlineFieldRun(xml,"190CE0CA",value(content,"customer_ic"),24);
  xml=setParagraphText(xml,"1E186992","");
  xml=setPlaceholder(xml,"2996C4C1",0,value(content,"customer_ic_2"));
  xml=underlineFieldRun(xml,"2996C4C1",value(content,"customer_ic_2"),24);
  xml=setParagraphText(xml,"1806FB3B","");
  const addressSlots=[["15C5D840","6205DD40"],["1605BD77","75423034"],["07404104","470AEF53"],["5EB91CC6","3826AFAD"]] as const;
  addressSlots.forEach(([slot,line],index)=>{const address=addresses[index]??"";xml=setPlaceholder(xml,slot,0,address);xml=underlineFieldRun(xml,slot,address,20);xml=setParagraphText(xml,line,"");});
  xml=appendParagraphText(xml,"098C17D3",value(content,"sale_date"));
  xml=setDottedPlaceholder(xml,"47A166A2",0,amountInWords(earnest));
  // Dotted leaders remain in place after their values, therefore later
  // approved blanks retain their original positions in the paragraph.
  xml=setDottedPlaceholder(xml,"47A166A2",1,money(earnest),6);
  xml=setDottedPlaceholder(xml,"47A166A2",4,value(content,"payment_reference"));
  xml=setDottedPlaceholder(xml,"7B9320A6",0,amountInWords(balance));
  xml=setDottedPlaceholder(xml,"7B9320A6",1,money(balance),6);
  xml=raiseDottedValue(xml,"47A166A2",amountInWords(earnest));
  xml=raiseDottedValue(xml,"47A166A2",money(earnest));
  xml=raiseDottedValue(xml,"47A166A2",value(content,"payment_reference"));
  xml=raiseDottedValue(xml,"7B9320A6",amountInWords(balance));
  xml=raiseDottedValue(xml,"7B9320A6",money(balance));
  xml=breakBeforeText(xml,"47A166A2",amountInWords(earnest));
  xml=breakBeforeText(xml,"47A166A2","per centum (2%)");
  xml=breakBeforeText(xml,"47A166A2","....................................");
  xml=addSpaceBeforeText(xml,"7B9320A6",amountInWords(balance));
  xml=breakBeforeText(xml,"7B9320A6","(RM");

  // Appendix overview and property details.
  xml=setParagraphText(xml,"41CAA764",value(content,"project_name")||"Residensi Aira Damansara (Aira Residence Damansara)");
  const unitNumber=value(content,"unit_number"),tower=towerFromUnit(unitNumber);
  xml=setParagraphText(xml,"1A9E0EF9",`Parcel No. ${unitNumber}${tower?`, Tower ${tower}`:""}, Residensi Aira Damansara`);
  xml=appendParagraphText(xml,"326B72B1",purchaser);
  xml=appendParagraphText(xml,"7BCD07FC",purchaser2);
  xml=appendParagraphText(xml,"38D7146D",value(content,"unit_number"));
  xml=appendParagraphText(xml,"34783BAC",value(content,"storey_number"));
  xml=appendParagraphText(xml,"3F6D2D7F",value(content,"unit_type"));
  xml=setParagraphText(xml,"2F912A77",`${value(content,"floor_area_sqm")} square metres / ${value(content,"floor_area")} square feet`);
  xml=setParagraphText(xml,"528CAA50",`RM ${money(price)}`);
  xml=appendParagraphText(xml,"22A46ABA",value(content,"car_parking_bay"));

  // Purchaser 1 and Purchaser 2 rows in the existing Appendix table. Blank slots remain blank.
  const rows=[
    {name:purchaser,salutation:value(content,"customer_salutation"),tin:value(content,"customer_tin"),nationality:value(content,"customer_nationality"),sex:value(content,"customer_sex"),race:value(content,"customer_race"),ic:value(content,"customer_ic"),bumi:value(content,"bumi_status")==="true"?"Yes":value(content,"bumi_status")==="false"?"No":"",occupation:value(content,"customer_occupation"),contact:value(content,"contact_person"),phone:value(content,"customer_phone"),email:value(content,"customer_email"),address:value(content,"customer_address"),ids:{name:"0656C9C0",salutation:"4A8690F5",tin:"2773E86A",nationality:"24A7E315",sex:"637B35D4",race:"57BF556C",ic:"5E1E1474",bumi:"73FAC868",occupation:"214472A8",contact:"173C1AE5",phone:"77E09037",email:"710E04ED",address:"4F402883"}},
    {name:purchaser2,salutation:value(content,"customer_salutation_2"),tin:value(content,"customer_tin_2"),nationality:value(content,"customer_nationality_2"),sex:value(content,"customer_sex_2"),race:value(content,"customer_race_2"),ic:value(content,"customer_ic_2"),bumi:value(content,"bumi_status_2")==="true"?"Yes":value(content,"bumi_status_2")==="false"?"No":"",occupation:value(content,"customer_occupation_2"),contact:value(content,"contact_person_2"),phone:value(content,"customer_phone_2"),email:value(content,"customer_email_2"),address:value(content,"customer_address_2"),ids:{name:"37EA2286",salutation:"2C3B4CF1",tin:"7A03805B",nationality:"736015D9",sex:"16C4BA9A",race:"48330A29",ic:"173AC7E5",bumi:"73FAC868",occupation:"214472A8",contact:"24561E60",phone:"16D81514",email:"7D0983B0",address:"50582536"}},
  ];
  for(const row of rows){for(const [key,id] of Object.entries(row.ids)){const field=key as keyof typeof row;const entry=row[field];if(typeof entry==="string"&&entry)xml=appendParagraphText(xml,id,entry);}}

  zip.file("word/document.xml",xml);
  return zip.generateAsync({type:"uint8array",compression:"DEFLATE"});
}
