import type { CSSProperties, ReactNode } from "react";
import { documentSteps } from "@/lib/templates";
import type { DocumentType } from "@/lib/types";
import { CurrentLetterDate } from "@/components/current-letter-date";
import { noticeAddressLines } from "@/lib/notice-address";
import { purchaserGreeting } from "@/lib/purchaser-greeting";
import { designationForSalesPersonnel } from "@/lib/sales-personnel";
import { agencyLetterDetails } from "@/lib/agency-details";

type Content=Record<string,unknown>;
function LetterPageNumber({page}:{page:number}){return <div className="notice-page-number"><span>{page}</span></div>}
function NoticePageFooter({page}:{page:number}){return <>{page===1&&<CompanyFooter/>}<LetterPageNumber page={page}/></>}
function NoticeAddress({address}:{address:string}){return <>{noticeAddressLines(address).map((line,index)=><span key={`${line}-${index}`}>{index>0&&<br/>}{line}</span>)}</>}
function AcceptanceLetterExact({content}:{content:Content}){
  const price=number(content,"purchase_price");
  const deposit=price*.1;
  const purchaser=value(content,"customer_name");
  const purchaser2=value(content,"customer_name_2","");
  const salutation=value(content,"customer_salutation","Purchaser");
  const isCompany=value(content,"purchaser_type","individual")==="company";
  const contact=value(content,"salesperson_name","Booking contact");
  const designation=designationForSalesPersonnel(contact);
  const agency=value(content,"agent_company","");
  return <>
    <article className="letter source-letter acceptance-exact notice-sheet">
    <section className="notice-page">
      <CompanyHead/>
      <p className="notice-date"><CurrentLetterDate/></p>
      <p className="notice-recipient"><b>{purchaser}</b><br/><NoticeAddress address={value(content,"customer_address")}/></p>
      <p className="notice-greeting">{purchaserGreeting(content)}</p>
      <p className="notice-subject"><b>RE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE</b></p>
      <dl className="notice-facts"><Fact label="Project"><b>{value(content,"project_name")}</b></Fact><Fact label="Property"><b>Parcel No. {value(content,"unit_number")}{towerFromUnit(value(content,"unit_number",""))?`, Tower ${towerFromUnit(value(content,"unit_number",""))}`:""}</b></Fact><Fact label="Developer"><b>Selangor Properties Sdn. Bhd.</b></Fact><Fact label="Proprietor"><b>{value(content,"proprietor_name","Bungsar Hill Holdings Sdn. Bhd.")}</b></Fact><Fact label="Purchaser"><b>{purchaser2?<>1. {purchaser}<br/>2. {purchaser2}</>:purchaser}</b></Fact><Fact label="Purchase Price"><b>{money(price)}</b></Fact></dl>
      <p>Greetings from Selangor Properties and the AIRA Residence team.</p>
      <p>We thank you for your Offer to Purchase the Property described above by way of the Booking Form dated {formattedOrdinalDate(content.sale_date)} (&ldquo;<b>Offer</b>&rdquo;). We are pleased that you have made such a discerning decision to purchase a unit in AIRA Residence &ndash; Kuala Lumpur&rsquo;s best kept secret. With your selection, we welcome you to the beginning of AIRA Residence&rsquo;s story and we encourage you to discover more of the hidden treasures which only living in the exclusive enclave of Damansara Heights can offer.</p>
      <p>You are just a few steps away from owning the Property and to help you move along the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (&ldquo;<b>SPA</b>&rdquo;), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively &ldquo;<b>Sale Documents</b>&rdquo;) in the manner described below.</p>
      <p>Firstly we ask that you kindly contact our {designation||"sales and marketing agent"}{designation?`, ${contact},`:` ${contact}${agency?` from ${agency}`:""}`} to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter.</p>
      <NoticePageFooter page={1}/>
    </section>
    </article>
    <article className="letter source-letter acceptance-exact notice-sheet">
    <section className="notice-page">
      <CompanyEmblem/>
      <p>Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:</p>
      <ol className="notice-requirements"><li>a cheque or bank draft made in favour of &ldquo;<b>Selangor Properties Sdn. Bhd.</b>&rdquo; for a sum equivalent to <b>{money(deposit)}</b>, being payment of the first ten per centum (10%) of the Purchase Price as prescribed in the Third Schedule of the SPA; and</li>{isCompany?<li><i>For a corporation</i>:<ol type="a"><li>a certified true copy of your company&rsquo;s board of directors&rsquo; and shareholders&rsquo; (if applicable) resolution authorizing (i) the purchase of the Property, and (ii) the execution of the Sale Documents, the memorandum of transfer in respect of the Property together with all relevant documents thereto and in respect of the sale and purchase of the Property, by way of affixation of your company&rsquo;s common seal and execution by your company&rsquo;s authorized signatories;</li><li>a certified true copy of the latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49; and</li><li>the company&rsquo;s rubber stamp.</li></ol></li>:<li><i>For an individual</i>: your identity card / passport;</li>}</ol>
      <p>Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase.</p>
      <p className="notice-closing">Yours faithfully,<br/><b>On behalf of Selangor Properties Sdn. Bhd.</b></p>
      <ApprovalSignature content={content} solicitorOnly/>
      <NoticePageFooter page={2}/>
    </section>
    </article>
  </>
}
function AcceptanceLetterSource({content}:{content:Content}){
  const price=number(content,"purchase_price");
  const deposit=price*.1;
  const purchaser=value(content,"customer_name");
  const purchaser2=value(content,"customer_name_2","");
  const salutation=value(content,"customer_salutation","Purchaser");
  const isCompany=value(content,"purchaser_type","individual")==="company";
  const salesperson=value(content,"salesperson_name","your sales and marketing agent");
  const agency=value(content,"agent_company","");
  return <article className="letter source-letter acceptance-letter">
    <CompanyHead/>
    <p><CurrentLetterDate/></p>
    <p><b>{purchaser.toUpperCase()}</b><br/><NoticeAddress address={value(content,"customer_address")}/></p>
    <p className="notice-greeting">{purchaserGreeting(content)}</p>
    <p className="notice-subject"><b>RE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE</b></p>
    <dl className="acceptance-facts">
      <Fact label="Project"><b>{value(content,"project_name")}</b></Fact>
      <Fact label="Property"><b>Parcel No. {value(content,"unit_number")}{towerFromUnit(value(content,"unit_number",""))?`, Tower ${towerFromUnit(value(content,"unit_number",""))}`:""}</b></Fact>
      <Fact label="Developer"><b>Selangor Properties Sdn. Bhd.</b></Fact>
      <Fact label="Proprietor"><b>{value(content,"proprietor_name","Bungsar Hill Holdings Sdn. Bhd.")}</b></Fact>
      <Fact label="Purchaser"><b>{purchaser2?<>1. {purchaser}<br/>2. {purchaser2}</>:purchaser}</b></Fact>
      <Fact label="Purchase Price"><b>{money(price)}</b></Fact>
    </dl>
    <p>Greetings from Selangor Properties and the AIRA Residence team.</p>
    <p>We thank you for your Offer to Purchase the Property described above by way of the Booking Form dated {formattedOrdinalDate(content.sale_date)} (&ldquo;<b>Offer</b>&rdquo;). We are pleased that you have made such a discerning decision to purchase a unit in AIRA Residence &ndash; Kuala Lumpur&rsquo;s best kept secret. With your selection, we welcome you to the beginning of AIRA Residence&rsquo;s story and we encourage you to discover more of the hidden treasures which only living in the exclusive enclave of Damansara Heights can offer.</p>
    <p>You are just a few steps away from owning the Property and to help you move along the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (&ldquo;<b>SPA</b>&rdquo;), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively &ldquo;<b>Sale Documents</b>&rdquo;) in the manner described below.</p>
    <p>Firstly we ask that you kindly contact our sales and marketing agent {salesperson}{agency?` from ${agency}`:""} to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter.</p>
    <section className="acceptance-requirements">
      <p>Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:</p>
      <ol><li>a cheque or bank draft made in favour of &ldquo;<b>Selangor Properties Sdn. Bhd.</b>&rdquo; for a sum equivalent to <b>{money(deposit)}</b>, being payment of the first ten per centum (10%) of the Purchase Price as prescribed in the Third Schedule of the SPA; and</li>{isCompany?<li><i>For a corporation</i>:<ol type="a"><li>a certified true copy of your company&rsquo;s board of directors&rsquo; and shareholders&rsquo; (if applicable) resolution authorizing (i) the purchase of the Property, and (ii) the execution of the Sale Documents, the memorandum of transfer in respect of the Property together with all relevant documents thereto and in respect of the sale and purchase of the Property, by way of affixation of your company&rsquo;s common seal and execution by your company&rsquo;s authorized signatories;</li><li>a certified true copy of the latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49; and</li><li>the company&rsquo;s rubber stamp.</li></ol></li>:<li><i>For an individual</i>: your identity card / passport;</li>}</ol>
      <p>Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase.</p>
      <p className="notice-closing">Yours faithfully,<br/><b>On behalf of Selangor Properties Sdn. Bhd.</b></p>
      <ApprovalSignature content={content} solicitorOnly/>
    </section>
    <CompanyFooter/>
  </article>
}
const value=(content:Content,key:string,fallback="—")=>content[key]==null||content[key]===""?fallback:String(content[key]);
const towerFromUnit=(unit:string)=>{const tower=unit.split("-")[0]?.toUpperCase();return tower==="A"||tower==="B"?tower:"";};
const number=(content:Content,key:string)=>typeof content[key]==="number"?content[key] as number:0;
const money=(amount:unknown)=>typeof amount==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(amount):"—";
const formattedDate=(input:unknown,key?:string)=>{const value=key&&input&&typeof input==="object"?(input as Content)[key]:input;return typeof value==="string"&&value?new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`)):"—";};
const formattedOrdinalDate=(input:unknown)=>{if(typeof input!=="string"||!input)return "—";const parsed=new Date(`${input}T00:00:00`);if(Number.isNaN(parsed.getTime()))return "—";const day=parsed.getDate();const suffix=day%100>=11&&day%100<=13?"th":day%10===1?"st":day%10===2?"nd":day%10===3?"rd":"th";return <>{day}<sup className="ordinal-suffix">{suffix}</sup> {new Intl.DateTimeFormat("en-MY",{month:"long",year:"numeric"}).format(parsed)}</>;};
const approvalDate=(input:unknown)=>typeof input==="string"&&input?input.split("-").reverse().map((part,index)=>index===2?part.slice(-2):part).join("."):"";

export function DocumentPreview({type,content}:{type:DocumentType;content:Content}){
  if(type==="pre_booking_form")return <ProspectOfferForm content={content}/>;
  if(type==="booking_form")return <BookingFormExact content={content}/>;
  if(type==="acceptance_letter")return <AcceptanceLetterExact content={content}/>;
  if(type==="agency_appointment_letter")return <AgencyAppointmentLetter content={content}/>;
  if(type==="agent_commission_letter")return <AgentCommissionLetter content={content}/>;
  if(type==="rebate_letter")return <RebateLetter content={content}/>;
  if(type==="inventory_confirmation_letter")return <InventoryConfirmationLetter content={content}/>;
  return <HovpLetterExact content={content}/>;
}

function AgencyAppointmentLetter({content}:{content:Content}){
  const agency=value(content,"agent_company","");
  const details=agencyLetterDetails(agency,{company:agency,address:value(content,"agent_address",""),agent_name:value(content,"agent_name",""),agent_designation:value(content,"agent_designation",""),agent_mobile:value(content,"agent_mobile",""),agent_email:value(content,"agent_email","")});
  const address=value(content,"agent_address","").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const letterIssuedAt=value(content,"letter_issued_at","");
  const recipient=<p className="notice-recipient agent-recipient">{details.contactName&&<><b>{details.contactName}</b><br/></>}{details.contactPosition&&<><b>{details.contactPosition}</b><br/></>}<b>{agency}</b><br/>{address.map((line,index)=><span key={line}>{line}{index<address.length-1&&<br/>}</span>)}</p>;
  return <div className="agent-commission-letter agency-appointment-letter">
    <article className="letter source-letter acceptance-exact notice-sheet agent-commission-sheet"><section className="notice-page agent-commission-page"><CompanyHead/><p className="notice-date"><CurrentLetterDate date={letterIssuedAt}/></p>{recipient}<p className="notice-greeting">{details.greeting}</p><p className="notice-subject"><b>RE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; AGENCY APPOINTMENT TO THE AIRA RESIDENCE DEVELOPMENT<br/><span className="agent-subject-address">No. 8, Jalan Batai, Bukit Damansara, Kuala Lumpur</span></b></p><p>We would like to thank you for introducing a prospect for the AIRA Residence project and wish to take this opportunity to formalize your agency appointment.</p><p>AIRA Residence is a distinctive low-density development created for owner-occupiers and a mature community of residents. Our target market includes discerning local and international purchasers.</p><p>As an Appointed Agent for AIRA Residence, each prospect must first be registered with SPSB through the approved CRM process. The agent&apos;s representative is required to escort the prospect through the show unit and lead the sales presentation, supported by our Relationship Managers when required.</p><p>We welcome your initiative to introduce both local and foreign buyers, subject to the policies and sales procedures set out in this appointment.</p><CompanyFooter/><LetterPageNumber page={1}/></section></article>
    <article className="letter source-letter acceptance-exact notice-sheet agent-commission-sheet"><section className="notice-page agent-commission-page"><CompanyEmblem/><h2>SALES COMMISSION STRUCTURE</h2><p>As an Appointed Agent, the applicable commission for an approved sale is based on the Net Purchase Price and the written terms approved by Selangor Properties Sdn. Bhd.</p><p><b>Domestic Sales:</b> 2.00% of the Net Purchase Price, unless a separate fee arrangement is issued for a particular unit.</p><p><b>International Sales (Towers A &amp; B):</b> 2.00% of the Net Purchase Price.</p><p><i>Net Purchase Price means the approved selling price less any discounts or rebates offered to the buyer with SPSB&apos;s approval.</i></p><p>The Sales Commission will be paid in Ringgit Malaysia within 30 days after receipt of the required supporting documents, including the stamped Sale and Purchase Agreement and the Agent&apos;s Tax Invoice.</p><p>Units must be marketed only at prices approved by SPSB. No selling price or approved marketing material may be changed without prior written consent.</p><LetterPageNumber page={2}/></section></article>
    <article className="letter source-letter acceptance-exact notice-sheet agent-commission-sheet"><section className="notice-page agent-commission-page"><CompanyEmblem/><p>The sale of units is on a first-come-first-served basis. The Appointed Agent must confirm unit availability and current list prices with SPSB.</p><p>The Appointed Agent must not advertise AIRA Residence on any media platform without SPSB&apos;s prior approval.</p><p>For clarification, please contact the assigned Sales Personnel:</p><p><b>{value(content,"salesperson_name","")}</b><br/>{value(content,"salesperson_designation","")}<br/>{value(content,"salesperson_mobile","")}<br/>{value(content,"salesperson_email","")}</p><p>We look forward to working with you and your team and trust that our collaboration on AIRA Residence will be productive and successful.</p><p className="agent-commission-closing">Yours faithfully,<br/>For and on behalf of <b>SELANGOR PROPERTIES SDN BHD</b></p><ApprovalSignature content={content} hideCopy/><LetterPageNumber page={3}/></section></article>
    <article className="letter source-letter acceptance-exact notice-sheet agent-commission-sheet"><section className="notice-page agent-commission-page agent-commission-acceptance"><CompanyEmblem/><h2>ACCEPTANCE</h2><div className="agent-acceptance-subject"><b>AGENCY APPOINTMENT TO THE AIRA RESIDENCE DEVELOPMENT</b><br/>No. 8, Jalan Batai, Bukit Damansara, Kuala Lumpur</div><p>We, <b>{agency||"____________________"}</b>, agree to become an Appointed Agent for AIRA Residence on the terms and conditions contained in this letter and to comply with the policies and sales procedures of Selangor Properties Sdn Bhd.</p><div className="agent-acceptance-signature"><span/><p>Signature and Company Rubber Stamp:</p><p><b>Name:</b><i/></p><p><b>I/C No.:</b><i/></p><p><b>Date:</b><i/></p></div><LetterPageNumber page={4}/></section></article>
  </div>;
}

function AgentCommissionLetter({content}:{content:Content}){
  const agency=value(content,"agent_company","");
  const agencyDetails=agencyLetterDetails(agency,{company:agency,address:value(content,"agent_address",""),agent_name:value(content,"agent_name",""),agent_designation:value(content,"agent_designation",""),agent_mobile:value(content,"agent_mobile",""),agent_email:value(content,"agent_email","")});
  const enteredAgencyAddress=value(content,"agent_address","");
  const agencyAddress=enteredAgencyAddress
    ? enteredAgencyAddress.split(/\r?\n/).map((line)=>line.trim()).filter(Boolean)
    : /\bIQI\b/i.test(agency)?["9-3, 3rd Floor, Medan Klang Lama 28,","Jalan Klang Lama,","58000 Kuala Lumpur."]:[];
  const purchaser=value(content,"customer_name").toUpperCase();
  const unit=value(content,"unit_number");
  const price=number(content,"purchase_price");
  const netPurchasePrice=Math.max(price-number(content,"rebate_amount"),0);
  const priceText=`RM${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(price)}`;
  const netPriceText=`RM${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(netPurchasePrice)}`;
  const salesperson=value(content,"salesperson_name","");
  const letterIssuedAt=value(content,"letter_issued_at","");
  return <div className="agent-commission-letter">
    <article className="letter source-letter acceptance-exact notice-sheet agent-commission-sheet agent-commission-page-one">
      <section className="notice-page agent-commission-page">
        <CompanyHead/>
        <p className="notice-date"><CurrentLetterDate date={letterIssuedAt}/></p>
        <p className="notice-recipient agent-recipient">{agencyDetails.contactName&&<><b>{agencyDetails.contactName}</b><br/></>}{agencyDetails.contactPosition&&<><b>{agencyDetails.contactPosition}</b><br/></>}<b>{agency}</b><br/>{agencyAddress.map((line,index)=><span key={line}>{line}{index<agencyAddress.length-1&&<br/>}</span>)}</p>
        <p className="notice-greeting">{agencyDetails.greeting}</p>
        <p className="notice-subject"><b>RE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; AGENT&apos;S FEE ARRANGEMENT<br/><span className="agent-subject-address">UNIT {unit}<br/>PURCHASER: {purchaser}<br/>PURCHASE PRICE: {priceText}</span></b></p>
        <dl className="agent-commission-facts">
        </dl>
        <p>We refer to your letter of appointment{agencyDetails.appointmentDate?<> dated {agencyDetails.appointmentDate}</>:null} and the recent sale of Unit {unit} to the abovementioned purchaser.</p>
        <p>We are pleased to advise that in the case of this sale only, the agent&apos;s commission will be increased from 2.00% to <b>3.00%</b> of the Net Purchase Price of <b>{netPriceText}</b>.</p>
        <p>The Sales Commission will be paid in Ringgit Malaysia within 30 days of our receipt of the following:</p>
        <ul className="agent-commission-list"><li>a stamped copy of the Sales &amp; Purchase Agreement (SPA);</li><li>the Agent&apos;s Tax Invoice.</li></ul>
        <p>We look forward to continuing our working collaboration and wish you every success in supporting our sales efforts during the year ahead.</p>
        <p className="agent-commission-closing">Yours faithfully,<br/>For and behalf SELANGOR PROPERTIES SDN. BHD.</p>
        <ApprovalSignature content={content} hideCopy/>
        {salesperson&&<p className="agent-commission-cc">c.c. &nbsp; {salesperson}</p>}
        <CompanyFooter/><LetterPageNumber page={1}/>
      </section>
    </article>
    <article className="letter source-letter acceptance-exact notice-sheet agent-commission-sheet">
      <section className="notice-page agent-commission-page agent-commission-acceptance">
        <CompanyEmblem/>
        <h2>ACCEPTANCE</h2>
        <div className="agent-acceptance-subject"><b>AGENT&apos;S FEE ARRANGEMENT TO THE SALES OF UNIT {unit},<br/>{value(content,"project_name","AIRA RESIDENCE").toUpperCase()} DEVELOPMENT</b><br/>No. 8, Jalan Batai, Bukit Damansara, Kuala Lumpur</div>
        <p>We, <b>{agency||"____________________"}</b> acknowledge receipt of this Letter dated <CurrentLetterDate date={letterIssuedAt}/> from SELANGOR PROPERTIES SDN. BHD. and agree to the terms and conditions contained herein.</p>
        <div className="agent-acceptance-signature"><span/><p>Signature and Company Rubber Stamp:</p><p><b>Name:</b><i/></p><p><b>I/C No.:</b><i/></p><p><b>Date:</b><i/></p></div>
        <LetterPageNumber page={2}/>
      </section>
    </article>
  </div>;
}

function BookingFormExact({content}:{content:Content}){
  const purchaser=value(content,"customer_name","");const purchaser2=value(content,"customer_name_2","");const price=number(content,"purchase_price");const earnest=price*.02;const balance=price*.08;
  const address=value(content,"customer_address","").split(/\r?\n|,/).map(line=>line.trim()).filter(Boolean).slice(0,4);
  const page=(number:number,children?:ReactNode)=><figure className="booking-template-page" key={number}><img src={`/templates/booking-form-page-${number}.png`} alt={`Booking Form template page ${number}`}/>{children}</figure>;
  const field=(text:string,left:number,top:number,size=14,weight=400)=><span className="booking-template-field" style={{left:`${left/11.9}%`,top:`${top/16.84}%`,fontSize:`${size/11.9}cqw`,fontWeight:weight} as CSSProperties}>{text}</span>;
  const details=[
    [purchaser,144,698],[value(content,"customer_salutation","").toString(),366,698],[value(content,"customer_tin","").toString(),544,698],[value(content,"customer_nationality","").toString(),730,698],[value(content,"customer_sex","").toString(),880,698],[value(content,"customer_race","").toString(),990,698],
    [purchaser2,144,744],[value(content,"customer_salutation_2","").toString(),366,744],[value(content,"customer_tin_2","").toString(),544,744],[value(content,"customer_nationality_2","").toString(),730,744],[value(content,"customer_sex_2","").toString(),880,744],[value(content,"customer_race_2","").toString(),990,744],
    [value(content,"customer_ic","").toString(),144,934],[value(content,"customer_ic_2","").toString(),144,980],
    [value(content,"customer_occupation","").toString(),810,934],[value(content,"customer_occupation_2","").toString(),810,980],
    [value(content,"contact_person","").toString(),150,1218],[value(content,"contact_person_2","").toString(),150,1264],[value(content,"customer_phone","").toString(),500,1218],[value(content,"customer_phone_2","").toString(),500,1264],[value(content,"customer_email","").toString(),790,1218],[value(content,"customer_email_2","").toString(),790,1264],
  ] as [string,number,number][];
  return <section className="booking-template-document">
    {page(1,<>{field(purchaser,176,510)}{field(purchaser2,176,558)}{field(value(content,"customer_ic",""),176,668)}{field(value(content,"customer_ic_2",""),176,716)}{address.map((line,index)=>field(line,104,832+index*48))}{field(formattedDate(content.sale_date),176,1032)}{field(value(content,"project_name","Residensi Aira Damansara (Aira Residence Damansara)"),356,1340,13,700)}{field(value(content,"unit_number",""),470,1388,13,700)}{field(value(content,"storey_number",""),704,1388,13,700)}{field(purchaser,360,1456,13,700)}{field(purchaser2,360,1504,13,700)}</>)}
    {page(2,<>{field(`RM ${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(earnest)}`,176,772,13)}{field(new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(earnest),630,772,13)}{field(`RM ${new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(balance)}`,616,954,13)}{field(new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(balance),616,1000,13)}</>)}
    {page(3)}{page(4)}
    {page(5,<>{field(value(content,"unit_number",""),388,202,12)}{field(value(content,"storey_number",""),388,250,12)}{field(value(content,"unit_type",""),388,298,12)}{field(value(content,"floor_area_sqm",""),532,348,12)}{field(value(content,"floor_area",""),840,348,12)}{field(new Intl.NumberFormat("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2}).format(price),430,398,12)}{field(value(content,"car_parking_bay",""),388,446,12)}{details.map(([text,left,top])=>text?field(text,left,top,11):null)}{address.map((line,index)=>field(line,150,1380+index*44,11))}</>)}
  </section>
}

function InventoryConfirmationLetter({content}:{content:Content}){
  const purchaser=value(content,"customer_name");
  const salutation=value(content,"customer_salutation","Purchaser");
  const unit=value(content,"unit_number");
  const idPrice=number(content,"quoted_id_net_selling_price");
  return <div className="inventory-letter-exact">
    <article className="letter source-letter acceptance-exact notice-sheet">
      <section className="notice-page inventory-page">
        <CompanyHead/>
        <p className="notice-date"><CurrentLetterDate/></p>
        <p className="notice-recipient"><b>{purchaser.toUpperCase()}</b><br/><NoticeAddress address={value(content,"customer_address")}/></p>
        <p>Dear {salutation} {purchaser.split(" ")[0]},</p>
        <p className="notice-subject"><b>RE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; AIRA RESIDENCE<br/>CONFIRMATION OF INVENTORIES FOR UNIT {unit}</b></p>
        <p>Greetings from AIRA Residence.</p>
        <p>Thank you for taking the next step towards culminating your purchase of the abovementioned unit.</p>
        <p>As agreed, Unit {unit} comes with a Schedule of Inventories (refer Attachment) which are included in the sale on an &ldquo;as is where is&rdquo; basis at a selling price of <b>{money(idPrice)}</b>.</p>
        <p>As a result, we make no express or implied warranties or representations about the working condition, durability, fitness for purpose, or merchantability of the inventories on an &ldquo;as is where is&rdquo; basis. Furthermore, from the date of deemed delivery of vacant possession of the abovementioned unit, we will not be accountable to you for any incidental or indirect losses or damages arising from the use of the mentioned inventories.</p>
        <p>We kindly ask that you sign the acknowledgement and acceptance below.</p>
        <p>Once again, congratulations for becoming part of the AIRA family.</p>
        <p className="inventory-closing">Yours sincerely,<br/>For and on behalf of Selangor Properties Sdn. Bhd.</p>
        <ApprovalSignature content={content} hideCopy/>
        <CompanyFooter/>
        <LetterPageNumber page={1}/>
      </section>
    </article>
    <article className="letter source-letter acceptance-exact notice-sheet">
      <section className="notice-page inventory-page inventory-ack-page">
        <CompanyEmblem/>
        <h2>ACKNOWLEDGEMENT &amp; ACCEPTANCE</h2>
        <p>I, {purchaser}, {value(content,"customer_ic","")} hereby acknowledge receipt of this letter, and confirm my understanding of, and agreement to the contents of this letter.</p>
        <div className="inventory-ack-signature"><span/><p>Name:</p><p>IC / Passport No.:</p><p>Date:</p></div>
        <LetterPageNumber page={2}/>
      </section>
    </article>
  </div>
}

function HovpLetterExact({content}:{content:Content}){
  const purchaser=value(content,"customer_name");
  const unit=value(content,"unit_number");
  const tower=towerFromUnit(unit);
  const salesperson=value(content,"salesperson_name","");
  const salespersonDesignation=value(content,"salesperson_designation","");
  const salespersonMobile=value(content,"salesperson_mobile","");
  const salespersonEmail=value(content,"salesperson_email","");
  return <div className="hovp-exact">
    <article className="letter source-letter hovp-letter hovp-sheet">
      <CompanyHead/>
      <p className="notice-date"><CurrentLetterDate/></p>
      <p className="notice-recipient"><b>{purchaser.toUpperCase()}</b><br/><NoticeAddress address={value(content,"customer_address")}/></p>
      <p className="notice-greeting">{purchaserGreeting(content)}</p>
      <h1 className="source-subject">Re: &nbsp; AIRA Residence &ndash; Handover of Vacant Possession</h1>
      <p>We refer to your purchase of Unit <b>{unit}</b>, AIRA Residence (&ldquo;Unit&rdquo;).</p>
      <p>We are pleased to inform you that vacant possession of the Unit is available for handover on <b><CurrentLetterDate/></b>.</p>
      <p>The handover of the Unit shall be on the following basis:</p>
      <ol className="hovp-terms">
        <li><span>As-Is, Where-Is Basis and No Defect Liability Period</span><p>The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an &ldquo;as-is, where-is&rdquo; basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (&ldquo;SPA&rdquo;).</p></li>
        <li><span>Handover Items</span><p>The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon the completion of procedures and documentation required for the handover of vacant possession of the Unit, including the signing of the relevant handover documents, delivery of keys, access cards and remotes, and fulfilment of the applicable handover requirements imposed by SPSB.</p></li>
        <li><span>Building Management</span><p>Following handover, matters relating to the building, common areas, facilities and services should be referred to AIRA Building Management.</p></li>
      </ol>
      <p className="management-contact"><b>AIRA Building Management</b><br/>AIRA Residence Lobby (Ground Floor)<br/>Tel: 03-2011 5908<br/>Email: <a href="mailto:airaresidencemgmt@gmail.com">airaresidencemgmt@gmail.com</a></p>
      <ol className="hovp-terms hovp-contact-term" start={4}>
        <li><span>Handover Coordination</span><p>For matters relating to the HOVP and handover arrangements, please contact:</p><p className="hovp-contact">Name: {salesperson}<br/>Designation: {salespersonDesignation}<br/>Mobile: {salespersonMobile}<br/>Email: {salespersonEmail}</p></li>
      </ol>
      <p>Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession.</p>
      <p>Thank you.</p>
      <p>Yours faithfully,<br/>For and behalf SELANGOR PROPERTIES SDN. BHD.</p>
      <ApprovalSignature content={content} hideCopy/>
      <CompanyFooter/><LetterPageNumber page={1}/>
    </article>
    <article className="letter source-letter hovp-sheet hovp-ack-sheet">
      <CompanyEmblem/>
      <h2 className="hovp-ack-title">HOVP HANDOVER ACKNOWLEDGEMENT</h2>
      <p className="hovp-ack-project"><b>AIRA Residence</b></p>
      <dl className="hovp-ack-fields"><div><dt>Tower</dt><i>:</i><dd>{tower}</dd></div><div><dt>Unit No.</dt><i>:</i><dd>{unit}</dd></div><div><dt>HOVP Date</dt><i>:</i><dd><CurrentLetterDate/></dd></div></dl>
      <p className="hovp-ack-text">I/We acknowledge receipt of the keys, access cards, remote controls and other applicable handover items for the above Unit and confirm that vacant possession has been handed over and accepted on an &ldquo;as-is, where-is&rdquo; basis.</p>
      <div className="hovp-ack-signatures">
        <p className="hovp-ack-column-title">Purchaser</p><p className="hovp-ack-column-title">For Selangor Properties Sdn Bhd</p>
        <div className="hovp-ack-signature-row"><div className="hovp-ack-field"><dt>Signature</dt><i>:</i><dd/></div><div className="hovp-ack-field"><dt>Signature</dt><i>:</i><dd/></div></div>
        <div className="hovp-ack-signature-row"><div className="hovp-ack-field"><dt>Purchaser&rsquo;s Name</dt><i>:</i><dd>{purchaser}</dd></div><div className="hovp-ack-field"><dt>Name</dt><i>:</i><dd/></div></div>
        <div className="hovp-ack-signature-row"><div className="hovp-ack-field"><dt>NRIC/Passport No.</dt><i>:</i><dd>{value(content,"customer_ic","")}</dd></div><div className="hovp-ack-field"><dt>Designation</dt><i>:</i><dd/></div></div>
        <div className="hovp-ack-signature-row"><div className="hovp-ack-field"><dt>Date</dt><i>:</i><dd/></div><div className="hovp-ack-field"><dt>Date</dt><i>:</i><dd/></div></div>
      </div>
      <LetterPageNumber page={2}/>
    </article>
  </div>;
}

function Letter({content,title,children}:{content:Content;title:string;children:ReactNode}){return <article className="letter source-letter"><div className="source-band"><span>Step {documentSteps[content.document_type as DocumentType]||""}</span><b>{title}</b><small>Generated from approved record</small></div><CompanyHead/><p><CurrentLetterDate/></p><p><b>{value(content,"customer_name").toUpperCase()}</b><br/>{value(content,"customer_address")}</p>{children}<CompanyFooter/></article>}

function ProspectOfferForm({content}:{content:Content}){
  const approved=number(content,"approved_selling_price")||number(content,"purchase_price");
  const proposed=number(content,"purchase_price");
  const additional=number(content,"additional_revenue");
  const discount=number(content,"repeat_buyer_discount");
  const rebate=number(content,"rebate_amount");
  const floorArea=number(content,"floor_area");
  const net=Math.max(proposed-rebate,0);
  const total=discount+rebate;
  const psf=(amount:number)=>floorArea>0?` (RM${new Intl.NumberFormat("en-MY",{maximumFractionDigits:0}).format(amount/floorArea)} psf)`:"";
  const pct=(amount:number)=>approved>0?`${((amount/approved)*100).toFixed(2)}%`:"0.00%";
  const assistants=[value(content,"salesperson_name",""),value(content,"pop_assisting_member_2","")].filter(Boolean).join(" / ");
  return <article className="letter source-letter pop-form"><div className="source-band"><span>Step {documentSteps.pre_booking_form}</span><b>Prospect Offer Proposal Form</b><small>Editable POP record</small></div><div className="pop-title"><div>SALES<br/><b>PROSPECT OFFER PROPOSAL FORM</b></div><strong>AIRA<br/><small>RESIDENCE</small></strong></div><dl className="pop-grid"><Fact label="Introduction By - Agent">{value(content,"pop_introduction_agent","NOT APPLICABLE")}</Fact><Fact label="SPSB">{value(content,"pop_introduction_spsb","DIRECT SALES")}</Fact><Fact label="Team Member Assisting">{assistants}</Fact><Fact label="Purchaser's Name">{value(content,"customer_name")}</Fact><Fact label="Unit No.">{value(content,"unit_number")}</Fact><Fact label="Unit Type">{value(content,"unit_type").toUpperCase()}</Fact><Fact label="Size">{value(content,"floor_area")} ft²</Fact><Fact label="Approved Selling Price">{money(approved)}{psf(approved)}</Fact><Fact label="Actual Proposed Selling Price">{money(proposed)}{psf(proposed)}</Fact><Fact label="Additional Revenue">{money(additional)}</Fact><Fact label="Repeat Buyer Discount Offered">{money(discount)} &nbsp; &apos;A&apos; &nbsp; {pct(discount)}</Fact><Fact label="SPA Price">{money(proposed)}{psf(proposed)}</Fact><Fact label="INCENTIVES - ID Value of any Rebate being proposed for the Purchaser">{money(rebate)} &nbsp; &apos;B&apos; &nbsp; {pct(rebate)}</Fact><Fact label="Hence, PROPOSED NET SELLING PRICE">{money(net)}{psf(net)}</Fact><Fact label="Hence: Total Value of Incentives">{money(total)} = A + B</Fact></dl><PopApproval content={content}/></article>
}

function PopApproval({content}:{content:Content}){const date=approvalDate(content.sale_date);const salesperson=value(content,"salesperson_name","N/A");const assistant=value(content,"pop_assisting_member_2","");return <section className="pop-approvals"><div className="pop-approval-row"><section><h3>1. SBDM/BDM&apos;s Proposal:</h3><div className="pop-approval-line"/><div className="pop-approval-meta"><span><b>{salesperson}</b><br/>Business Development Manager{assistant&&<><br/><b>{assistant}</b><br/>Senior Relationship Manager</>}</span><span>Date<br/><b>{date}</b></span></div></section><div className="pop-approval-input"><b>Notes:</b><br/>{value(content,"pop_proposal_note","")}<br/><br/><b>Conditions of Sale:</b><br/>{value(content,"pop_conditions_note","")}</div></div><div className="pop-approval-row"><section><h3>2. Comments/Approval:</h3><div className="pop-approval-line"/><div className="pop-approval-meta"><span>Director of Property</span><span>Date<br/><b>{date}</b></span></div></section><div className="pop-approval-input">{value(content,"pop_comments_note","")}</div></div></section>}

function BookingForm({content}:{content:Content}){const price=number(content,"purchase_price");const earnest=number(content,"booking_fee");const balanceDeposit=Math.max(price*.08,0);const purchaser=value(content,"customer_name");const purchaser2=value(content,"customer_name_2","");return <article className="letter source-letter booking-letter"><CompanyHead/><h1 className="source-subject">BOOKING FORM</h1><p><b>Purchaser's Name:</b><br/>1. {purchaser}<br/>{purchaser2?`2. ${purchaser2}`:"2. "}</p><p><b>Purchaser's NRIC / Passport / Company No.:</b><br/>1. {value(content,"customer_ic")}<br/>{purchaser2?`2. ${value(content,"customer_ic_2")}`:"2. "}</p><p><b>Purchaser's Address:</b><br/>{value(content,"customer_address")}</p><p>Date : {formattedDate(content,"sale_date")}</p><p>To : <b>SELANGOR PROPERTIES SDN. BHD.</b><br/>Level 3, Block D, The FIVE @ KPD<br/>Kompleks Pejabat Damansara, Jalan Dungun, Damansara Heights, 50490 Kuala Lumpur, Malaysia</p><p>Dear Sirs,</p><h2 className="source-subject">OFFER TO PURCHASE</h2><p>I/We, the undersigned, hereby irrevocably and unconditionally offer to purchase (&ldquo;Offer&rdquo;) from you the Property at the Purchase Price based on the terms hereinafter appearing and subject to the terms and conditions stipulated in the Sale and Purchase Agreement (&ldquo;SPA&rdquo;), the Deed of Mutual Covenants and all other documents in relation to the sale of the Property to be executed by me/us in accordance with paragraph 3 below (&ldquo;Sale Documents&rdquo;). I/we hereby agree and confirm that the sale and purchase of the Property shall be on the following basis:</p><ol><li>on an as is where is basis;</li><li>free from all encumbrances;</li><li>subject to the existing category of land use and all restrictions in interest and conditions, whether express or implied, endorsed on and contained in the document of title;</li><li>the Purchase Price shall be final and conclusive, and not subject to any adjustment or variation unless expressly provided in the Sale Documents; and</li><li>I/we have examined and inspected, or is deemed to have examined and inspected the Property as a whole and conducted the necessary due diligence, and is satisfied with the state, nature, boundaries, positions, area, measurements, status and condition of the Property and accepts the Property in such state, nature, boundaries, positions, area, measurements, status and condition in every respect, and I/we shall be deemed to have notice and full knowledge of the same and effect thereof.</li></ol><p>I/We acknowledge and agree that I/we am/are required to pay you ten per centum (10%) of the Purchase Price (&ldquo;Deposit&rdquo;). I/We hereby deposit with you a non-refundable sum of Ringgit Malaysia {money(earnest)}, being the sum equivalent to two per centum (2%) of the Purchase Price (&ldquo;Earnest Deposit&rdquo;) only by way of my/our cheque made in your favor towards part payment of the Deposit.</p><p>Subject to you accepting the Offer by issuing to me/us a written notice (&ldquo;Acceptance Notice&rdquo;) on such date as you may notify me/us, I/we agree and undertake to execute the Sale Documents within fourteen (14) days from the date of my/our receipt of the Acceptance Notice (&ldquo;Execution Period&rdquo;) and to pay the balance of the Deposit of Ringgit Malaysia {money(balanceDeposit)}, being the sum equivalent to eight per centum (8%) of the Purchase Price (&ldquo;Balance Deposit&rdquo;) in accordance with the SPA upon my/our execution of the Sale Documents.</p><p>If I/we fail to execute the Sale Documents or pay the Balance Deposit within the Execution Period for any reason whatsoever, we acknowledge and agree that the Earnest Deposit shall be forfeited by you as agreed liquidated damages and shall not be refundable to me/us. In such event, the Offer shall be deemed to have lapsed and treated as withdrawn and cancelled, and have no further force and effect whatsoever. You shall then be at liberty to deal with and/or dispose the Property in any manner as you shall deem fit without any further notice to or reference to me/us and I/we shall have no claim whatsoever and howsoever against you and/or the Property arising from or in connection with this Offer.</p><p>I/We acknowledge and agree that I/we am/are required to pay you ninety per centum (90%) of the Purchase Price (&ldquo;Balance Purchase Price&rdquo;) within three (3) months from the date of the Sale Documents / six (6) weeks from the date on which I/we have obtained the State Authority Approval pursuant to Section 433B of the National Land Code (if applicable). The Purchaser shall execute the necessary documents and submit the application for State Authority Approval within 14 days from the date of the Sale Documents, and obtain such approval within 2 months from the date of the Sale Documents.</p><p>All payments shall be deemed paid only upon your receipt of such monies in cleared funds and in the event my/our cheque is stopped, dishonoured, rejected or bounced by the relevant financial institution for any reason whatsoever, the Offer shall be deemed to have lapsed and treated as withdrawn and cancelled, and have no further force and effect whatsoever. You shall then be at liberty to deal with the Property in any manner as you shall deem fit without any further reference to me/us and I/we shall have no claim whatsoever and howsoever against you and/or the Property.</p><p>The Acceptance Notice shall be deemed sufficiently served on me/us (i) if it is sent by registered post addressed to my/our address stated herein and the Acceptance Notice shall be deemed received by me/us upon the expiry of a period of three (3) days of posting of the Acceptance Notice, or (ii) if it is delivered by hand to me/us, it shall be deemed received by me/us upon delivery.</p><p>I/We further agree that I/we shall not howsoever assign, transfer, novate or nominate the Offer to any other party without your prior written consent, which consent shall be at your sole discretion and you shall have the right to refuse consent without assigning any reason whatsoever. I/We agree and acknowledge that in the event you grant such consent, you shall be entitled to impose any requirements, terms and conditions as you shall deem fit and I/we shall forthwith comply with the same at my/our own costs.</p><p>I/We further undertake that I/we shall not hold you responsible in any way, and I/we shall keep you fully indemnified against all claims, demands, suits, actions, prosecutions, fines, losses, damages, costs and expenses which may be instituted against or otherwise incurred or suffered by you in connection with or howsoever arising from my/our instructions or requests herein or the Offer.</p><p>Meanwhile, the following documents are enclosed herewith for your attention and further action:</p><ol><li>the duly completed Appendix setting out the Property details and Purchaser's particulars; and</li><li>(for individual) a photocopy of my/our identity card / passport; or (for company) a certified true copy of the latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49.</li></ol><p>I/We further agree and give my/our consent to you to:</p><ol><li>collect, obtain, store, use, keep, use and process my/our Personal Data which have been provided to you herein and any other forms or documents, and/or howsoever by me/us as necessary or required for you to communicate with me/us, to prepare the Sale Documents and any other related documentation (if any), for any other matters or purposes pertaining to the Offer and/or my/our purchase of the Property, to provide services or carry out transactions which I/we have requested or authorized, and to send to me/us notifications and marketing materials on your projects or developments;</li><li>disclose my/our Personal Data to any appropriate authorities or third parties where required or permitted by law, or for legal purposes; and</li><li>release, furnish, disclose and provide my/our Personal Data and this Letter to the banks or financial institutions agreed by me/us for my/our application for financial facility in respect of my/our purchase of the Property.</li></ol><p>&ldquo;Personal Data&rdquo; includes all data defined in the Personal Data Protection Act 2010, and all data disclosed by me/us to you for the Offer, my/our purchase of the Property and other purposes as may be prescribed by you and consented to by me/us.</p><p>Yours faithfully,</p><Signature name={purchaser} role="Name and NRIC / Passport No."/>{purchaser2&&<Signature name={purchaser2} role="Name and NRIC / Passport No."/>}<section className="appendix-section"><h2 className="source-title compact">APPENDIX</h2><Facts content={content}/><h3>PROPERTY DETAILS</h3><Facts content={content}/><h3>PURCHASER'S PARTICULARS</h3><Facts content={content}/></section><CompanyFooter/></article>}

function AcceptanceLetter({content}:{content:Content}){const balance=Math.max(number(content,"purchase_price")*.1-number(content,"booking_fee"),0);const purchaser=value(content,"customer_name");const salutation=value(content,"customer_salutation","Purchaser");const salesperson=value(content,"salesperson_name","your sales and marketing agent");const agency=value(content,"agent_company","");const tower=towerFromUnit(value(content,"unit_number",""));return <article className="letter source-letter acceptance-letter"><CompanyHead/><p><CurrentLetterDate/></p><p><b>{purchaser.toUpperCase()}</b><br/>{value(content,"customer_address")}</p><p>Dear {salutation} {purchaser.split(" ")[0]},</p><h1 className="source-subject">RE: &nbsp; NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE</h1><dl className="acceptance-facts"><Fact label="Project">{value(content,"project_name")}</Fact><Fact label="Property">Parcel No. {value(content,"unit_number")}{tower?`, Tower ${tower}`:""}</Fact><Fact label="Developer">Selangor Properties Sdn Bhd</Fact><Fact label="Proprietor">{value(content,"proprietor_name","Bangsar Hill Holdings Sdn. Bhd.")}</Fact><Fact label="Purchaser">{purchaser}</Fact><Fact label="Purchase Price">{money(content.purchase_price)}</Fact></dl><p>Greetings from the AIRA Residence team.</p><p>We thank you for your Offer to Purchase the Property described above, dated {formattedDate(content.sale_date)} (&ldquo;Offer&rdquo;). We are pleased that you have made such a discerning decision to purchase a unit in this award-winning development. We encourage you to discover more of the hidden treasures that only living in the exclusive enclave of Damansara Heights can offer.</p><p>You are just a few steps away from owning the Property and to help you to progress the path to completing the sale and purchase documentation, we are pleased to inform you that your Offer is accepted subject to your execution of the Sale and Purchase Agreement (&ldquo;SPA&rdquo;), the Deed of Mutual Covenants and all other relevant documents in relation to the sale and purchase of the Property (collectively &ldquo;Sale Documents&rdquo;) in the manner described below.</p><p>As a first step, we kindly ask that you to contact your sales and marketing agents, {salesperson}{agency?` from ${agency}`:""}, to fix an appointment to execute the Sale Documents within fourteen (14) days from the date of your receipt of this Letter.</p><section className="acceptance-page-two"><p>Secondly, to complete the sales process, please bring along the following documents during your appointment to execute the Sale Documents:</p><ol><li>a cheque or bank draft made in favour of &ldquo;Selangor Properties Sdn Bhd&rdquo; for a sum equivalent to <b>{money(balance)}</b>, being payment of the Balance Deposit of the Purchase Price as prescribed in the Sixth Schedule of the SPA; and</li><li>if you are an individual, your identity card or passport; or, if you are a corporation:<ol type="a"><li>a certified true copy of your company&rsquo;s board of directors&rsquo; and shareholders&rsquo; (if applicable) resolution authorizing (i) the purchase of the Property, and (ii) the execution of the Sale Documents, the memorandum of transfer in respect of the Property together with all relevant documents thereto and in respect of the sale and purchase of the Property, by way of affixation of your company&rsquo;s common seal and execution by your company&rsquo;s authorized signatories;</li><li>a certified true copy of the Authorised Signatory(ies)&rsquo;s NRIC, latest Certificate of Incorporation, Change of Name Form (if applicable), Memorandum and Articles of Association, and Forms 24, 44 and 49; and</li><li>the company&rsquo;s rubber stamp.</li></ol></li></ol><p>Once again, welcome to the AIRA Residence family - we look forward to the culmination of your purchase.</p><p>Yours faithfully,<br/>On behalf of Selangor Properties Sdn Bhd</p><ApprovalSignature content={content}/></section><CompanyFooter/></article>}

function RebateLetter({content}:{content:Content}){const purchaser=value(content,"customer_name");return <article className="letter source-letter rebate-letter rebate-exact"><CompanyHead/><p className="rebate-date"><CurrentLetterDate/></p><p className="rebate-recipient"><b>{purchaser.toUpperCase()}</b><br/>{value(content,"customer_address")}</p><p>Dear {value(content,"customer_salutation","Purchaser")} {purchaser.split(" ")[0]},</p><div className="rebate-subject"><span>Re:</span><b>AIRA RESIDENCE<br/>UNIT {value(content,"unit_number")} &ndash; CONFIRMATION OF REBATE OFFER</b></div><p>Greetings from AIRA Residence&hellip;</p><p>Thank you for taking the next step towards culminating your purchase of the abovementioned unit.</p><p>As agreed, a rebate of <b>{money(content.rebate_amount)}</b> has been approved and will be offset directly from the payment of your Balance Purchase Price that follows the signing of the Sale and Purchase Agreement (SPA) and payment of Balance Deposit under the Sixth Schedule.</p><p>Once again, congratulations for becoming part of the AIRA family.</p><p className="rebate-closing">Yours sincerely,<br/><i>For and on behalf of <b>SELANGOR PROPERTIES SDN BHD</b></i></p><ApprovalSignature content={content} hideCopy/><CompanyFooter/><LetterPageNumber page={1}/></article>}

function HovpLetter({content}:{content:Content}){const handover=value(content,"hovp_date","To be confirmed");const purchaser=value(content,"customer_name");const salesperson=value(content,"salesperson_name","");return <article className="letter source-letter hovp-letter"><CompanyHead/><p><CurrentLetterDate/></p><p><b>{purchaser.toUpperCase()}</b><br/>{value(content,"customer_address")}</p><p>Dear Sir or Madam,</p><h1 className="source-subject">RE: &nbsp; AIRA RESIDENCE - HANDOVER OF VACANT POSSESSION</h1><p>We refer to your purchase of Unit <b>{value(content,"unit_number")}</b>, AIRA Residence (&ldquo;Unit&rdquo;).</p><p>We are pleased to inform you that vacant possession of the Unit is available for handover on <b>{handover}</b>.</p><p>The handover of the Unit shall be on the following basis:</p><h3>As-Is, Where-Is Basis and No DLP</h3><p>The Unit, including all fixtures, fittings, furniture, appliances and other items within the Unit, is handed over and accepted on an &ldquo;as-is, where-is&rdquo; basis in its existing condition at the time of handover, in accordance with the terms of the Sale and Purchase Agreement (&ldquo;SPA&rdquo;).</p><h3>Handover Items</h3><p>The applicable keys, access cards, remote controls and other handover items relating to the Unit will be handed over upon completion of the handover formalities.</p><h3>Renovation and Alteration</h3><p>Following handover, any renovation, alteration or modification carried out within the Unit shall be at your own cost and responsibility.</p><h3>Building Management</h3><p>Following handover, matters relating to the building, common areas, facilities and building management shall be referred to AIRA Building Management.</p><p className="management-contact">AIRA Building Management<br/>Tel: 03-2011 5908<br/>Email: <a href="mailto:airaresidencemgmt@gmail.com">airaresidencemgmt@gmail.com</a></p><p>For matters relating to the HOVP and handover arrangements, please contact:</p><p className="hovp-contact">Name: {salesperson}<br/>Designation: <br/>Mobile: <br/>Email: </p><p>Please sign the HOVP Handover Acknowledgement below as confirmation of receipt and acceptance of vacant possession.</p><p>Thank you.</p><p>Yours faithfully,<br/>For and behalf SELANGOR PROPERTIES SDN. BHD.</p><ApprovalSignature content={content}/><section className="appendix-section hovp-acknowledgement"><h2 className="source-title compact">HOVP HANDOVER ACKNOWLEDGEMENT</h2><p><b>AIRA Residence</b></p><p>I/We acknowledge receipt of the keys, access cards, remote controls and other applicable handover items for the above Unit and confirm that vacant possession has been handed over and accepted on an &ldquo;as-is, where-is&rdquo; basis.</p><dl className="acceptance-facts"><Fact label="Tower">{value(content,"storey_number")}</Fact><Fact label="Unit No.">{value(content,"unit_number")}</Fact><Fact label="HOVP Date">{handover}</Fact></dl><div className="source-signatures"><Signature name={purchaser} role="Purchaser's name, NRIC / Passport No. and date"/><ApprovalSignature content={content}/></div></section><CompanyFooter/></article>}

function CompanyHead(){return <header className="source-letter-head"><img src="/selangor-properties-berhad-letterhead.png" alt="Selangor Properties Berhad"/></header>}
function CompanyEmblem(){return <header className="source-letter-head source-letter-head-emblem"><img src="/selangor-properties-emblem.png" alt="Selangor Properties Berhad emblem"/></header>}
function RebateSignatory({content}:{content:Content}){return <div className="rebate-signatory"><div className="rebate-signature-space"/><div className="rebate-signature-rule"/><b>{value(content,"authorised_signatory_name","")}</b><span>{value(content,"authorised_signatory_position","")}</span></div>}
function CompanyFooter(){return <footer className="source-footer"><div><b>SELANGOR PROPERTIES SDN. BHD.</b><span>Registration No. 196301000340 (5199-X)</span></div><div>Level 3, Block D, The FIVE @ KPD, Kompleks Pejabat Damansara, Jalan Dungun, Damansara Heights, 50490 Kuala Lumpur,<br/>Malaysia. (P.O. Box 12267, 50772 Kuala Lumpur, Malaysia) <span className="footer-contact">t +603 2094 1122</span><span className="footer-contact">f +603 2095 0150</span></div></footer>}
function Facts({content}:{content:Content}){return <dl className="source-grid letter-facts"><Fact label="Project">{value(content,"project_name")}</Fact><Fact label="Property">Parcel No. {value(content,"unit_number")}</Fact><Fact label="Purchaser">{value(content,"customer_name")}</Fact><Fact label="Purchase price">{money(content.purchase_price)}</Fact></dl>}
function Fact({label,children}:{label:string;children:ReactNode}){return <div><dt>{label}</dt><dd>{children}</dd></div>}
function Signature({name,role}:{name:string;role:string}){return <div><span/><b>{name}</b><small>{role}</small></div>}
function ApprovalSignature({content,hideCopy=false,solicitorOnly=false}:{content:Content;hideCopy?:boolean;solicitorOnly?:boolean}){const name=value(content,"authorised_signatory_name","");const designation=value(content,"authorised_signatory_position","");const solicitor=value(content,"solicitor_name","");const agency=value(content,"agent_company","");return <div className="approval-signature"><div className="signature-space"/><div className="signature-rule"/><div>Authorized Signatory</div><div><b>{name}</b></div><div><b>{designation}</b></div>{!hideCopy&&<><div className="copy-line">c.c. &nbsp; {solicitor}</div>{!solicitorOnly&&agency&&<div className="copy-line agent-copy">c.c. &nbsp; {value(content,"salesperson_name","")}{value(content,"salesperson_name","")&&", "}{agency}</div>}</>}</div>}
