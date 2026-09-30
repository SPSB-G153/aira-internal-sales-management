import type { DocumentType } from "@/lib/types";
import type { ReactNode } from "react";
import { documentSteps } from "@/lib/templates";

const money=(v:unknown)=>typeof v==="number"?new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(v):"—";
const value=(c:Record<string,unknown>,k:string)=>String(c[k]??"—");
const optional=(c:Record<string,unknown>,k:string,fallback="—")=>c[k]==null||c[k]===""?fallback:String(c[k]);
const date=(v:unknown)=>{if(typeof v!=="string"||!v)return "—";const parsed=new Date(`${v}T00:00:00`);return Number.isNaN(parsed.valueOf())?v:new Intl.DateTimeFormat("en-MY",{day:"numeric",month:"long",year:"numeric"}).format(parsed)};
const number=(v:unknown)=>typeof v==="number"?v:0;

export function DocumentPreview({type,content}:{type:DocumentType;content:Record<string,unknown>}){
  if(type==="pre_booking_form")return <BookingForm content={content}/>;
  if(type==="acceptance_letter")return <AcceptanceLetter content={content}/>;
  if(type==="rebate_letter")return <RebateLetter content={content}/>;
  return <HovpLetter content={content}/>;
}

function SourceBand({type,label}:{type:DocumentType;label:string}){return <div className="source-band"><span>Step {documentSteps[type]}</span><b>{label}</b><small>Source-aligned template</small></div>}
function CompanyHead(){return <header className="source-letter-head"><div className="source-mark">AIRA</div><div><b>SELANGOR PROPERTIES SDN. BHD.</b><small>Registration No. 196301000340 (5199-X)</small></div></header>}
function LabelValue({label,children}:{label:string;children:ReactNode}){return <div><dt>{label}</dt><dd>{children}</dd></div>}
function Signature({name,role,dateText}:{name:string;role:string;dateText?:string}){return <div className="source-signatures"><div><span/><b>{name}</b><small>{role}</small></div>{dateText&&<div><span/><b>{dateText}</b><small>Date</small></div>}</div>}

function BookingForm({content}:{content:Record<string,unknown>}){
  const purchase=number(content.purchase_price),earnest=number(content.booking_fee),deposit=purchase*.10,balanceDeposit=Math.max(deposit-earnest,0),balancePrice=purchase*.90;
  const secondName=optional(content,"customer_name_2","");
  return <article className="letter source-letter booking-letter">
    <SourceBand type="pre_booking_form" label="Aira Booking Form"/><CompanyHead/>
    <h1 className="source-title">BOOKING FORM</h1>
    <dl className="source-grid two-col">
      <LabelValue label="Purchaser 1">{value(content,"customer_name")}</LabelValue><LabelValue label="NRIC / Passport / Company No.">{value(content,"customer_ic")}</LabelValue>
      <LabelValue label="Purchaser 2">{secondName||"Not applicable"}</LabelValue><LabelValue label="NRIC / Passport">{secondName?optional(content,"customer_ic_2"):"Not applicable"}</LabelValue>
      <LabelValue label="Correspondence address">{value(content,"customer_address")}</LabelValue><LabelValue label="Offer date">{date(content.sale_date)}</LabelValue>
    </dl>
    <p className="letter-address"><b>To:</b> Selangor Properties Sdn. Bhd.<br/>Level 3, Block D, The Five @ KPD<br/>Kompleks Pejabat Damansara, Jalan Dungun, Damansara Heights, 50490 Kuala Lumpur</p>
    <p>Dear Sirs,</p><h2 className="source-subject">OFFER TO PURCHASE</h2>
    <p>I/We, the undersigned, irrevocably and unconditionally offer to purchase the Property at the Purchase Price stated in the Appendix, subject to the Sale and Purchase Agreement, Deed of Mutual Covenants and the other sale documents.</p>
    <ol className="legal-list">
      <li>The purchase is on an as-is-where-is basis, free from encumbrances and subject to the title conditions and restrictions.</li>
      <li>The purchase price is final unless the Sale Documents expressly provide otherwise. I/We confirm that the Property has been inspected and accepted in its present state and condition.</li>
      <li>A deposit equal to 10% of the Purchase Price is required. The earnest deposit recorded for this offer is <b>{money(content.booking_fee)}</b>.</li>
      <li>Upon written acceptance, I/We will execute the Sale Documents within fourteen (14) days and pay the balance deposit of <b>{money(balanceDeposit)}</b>.</li>
      <li>If the Sale Documents are not executed or the balance deposit is not paid within that period, the earnest deposit may be forfeited as agreed liquidated damages.</li>
      <li>The balance purchase price of <b>{money(balancePrice)}</b> is payable in accordance with the Sale Documents and any applicable State Authority approval requirements.</li>
      <li>I/We consent to the collection, use and disclosure of the personal data supplied for the purchase, preparation of sale documents, financing and related lawful purposes.</li>
    </ol>
    <p>Yours faithfully,</p><Signature name={value(content,"customer_name")} role="Purchaser" dateText={date(content.sale_date)}/>
    <section className="appendix-section"><h2 className="source-title compact">APPENDIX</h2><h3>Property details</h3>
      <table className="source-table"><tbody>
        <tr><th>Project</th><td>{value(content,"project_name")}</td><th>Parcel No.</th><td>{value(content,"unit_number")}</td></tr>
        <tr><th>Storey No.</th><td>{optional(content,"storey_number")}</td><th>Type</th><td>{value(content,"unit_type")}</td></tr>
        <tr><th>Area</th><td>{optional(content,"floor_area_sqm")} sq m / {value(content,"floor_area")} sq ft</td><th>Parking bay</th><td>{optional(content,"car_parking_bay")}</td></tr>
        <tr><th>Purchase price</th><td>{money(content.purchase_price)}</td><th>10% deposit</th><td>{money(deposit)}</td></tr>
      </tbody></table>
      <h3>Purchaser particulars</h3><table className="source-table"><tbody>
        <tr><th>Salutation</th><td>{optional(content,"customer_salutation")}</td><th>TIN No.</th><td>{optional(content,"customer_tin")}</td></tr>
        <tr><th>Nationality</th><td>{optional(content,"customer_nationality")}</td><th>Sex / Race</th><td>{optional(content,"customer_sex")} / {optional(content,"customer_race")}</td></tr>
        <tr><th>Bumiputera status</th><td>{content.bumi_status==null?"—":content.bumi_status?"Yes":"No"}</td><th>Occupation</th><td>{optional(content,"customer_occupation")}</td></tr>
        <tr><th>Contact person</th><td>{optional(content,"contact_person",value(content,"customer_name"))}</td><th>Mobile</th><td>{value(content,"customer_phone")}</td></tr>
        <tr><th>Email</th><td colSpan={3}>{value(content,"customer_email")}</td></tr><tr><th>Address</th><td colSpan={3}>{value(content,"customer_address")}</td></tr>
      </tbody></table>
    </section>
  </article>
}

function AcceptanceLetter({content}:{content:Record<string,unknown>}){
  const deposit=number(content.purchase_price)*.10,earnest=number(content.booking_fee),balance=Math.max(deposit-earnest,0),salutation=optional(content,"customer_salutation","Purchaser");
  return <article className="letter source-letter"><SourceBand type="acceptance_letter" label="Notice of Acceptance"/><CompanyHead/>
    <p>{date(content.sale_date)}</p><p><b>{value(content,"customer_name").toUpperCase()}</b><br/>{value(content,"customer_address")}</p><p>Dear {salutation} {value(content,"customer_name").split(" ")[0]},</p>
    <h1 className="source-subject">NOTICE OF ACCEPTANCE OF OFFER TO PURCHASE</h1>
    <dl className="source-grid letter-facts"><LabelValue label="Project">{value(content,"project_name")}</LabelValue><LabelValue label="Property">Parcel No. {value(content,"unit_number")}{content.storey_number?`, Storey ${content.storey_number}`:""}</LabelValue><LabelValue label="Vendor">Selangor Properties Sdn. Bhd.</LabelValue><LabelValue label="Proprietor">{optional(content,"proprietor_name","Bungsar Hill Holdings Sdn. Bhd.")}</LabelValue><LabelValue label="Purchaser">{value(content,"customer_name")}</LabelValue><LabelValue label="Purchase price">{money(content.purchase_price)}</LabelValue></dl>
    <p>Greetings from Selangor Properties and the AIRA Residence team.</p><p>We thank you for your Offer to Purchase the Property described above. We are pleased to inform you that your offer is accepted, subject to your execution of the Sale and Purchase Agreement, Deed of Mutual Covenants and the other relevant sale documents.</p>
    <p>Please contact {optional(content,"salesperson_name","our Head of Sales")}{content.agent_company?` from ${content.agent_company}`:""} to arrange execution of the Sale Documents within fourteen (14) days from receipt of this letter.</p>
    <p>For your appointment, please bring:</p><ol className="legal-list compact-list"><li>A cheque or bank draft in favour of “Selangor Properties Sdn Bhd” for <b>{money(balance)}</b>, being the balance deposit.</li><li>Your original NRIC or passport and the supporting purchaser documents requested by the sales administrator.</li></ol>
    <p>Once again, welcome to the AIRA Residence family.</p><p>Yours faithfully,<br/>For and on behalf of Selangor Properties Sdn. Bhd.</p><Signature name={optional(content,"authorised_signatory_name","Authorised Signatory")} role={optional(content,"authorised_signatory_position","Authorised signatory")}/>{typeof content.solicitor_name==="string"&&content.solicitor_name?<p className="copy-line">c.c. {content.solicitor_name}</p>:null}
  </article>
}

function RebateLetter({content}:{content:Record<string,unknown>}){return <article className="letter source-letter"><SourceBand type="rebate_letter" label="Rebate Letter"/><CompanyHead/>
  <p>{date(content.sale_date)}</p><p><b>{value(content,"customer_name").toUpperCase()}</b><br/>{value(content,"customer_address")}</p><p>Dear {optional(content,"customer_salutation","Purchaser")} {value(content,"customer_name").split(" ")[0]},</p>
  <h1 className="source-subject">AIRA RESIDENCE UNIT {value(content,"unit_number")}<br/>CONFIRMATION OF REBATE OFFER</h1><p>Greetings from AIRA Residence.</p><p>Thank you for taking the next step towards completing your purchase of the above unit.</p>
  <p>As agreed, a rebate of <b>{money(content.rebate_amount)}</b>{typeof content.rebate_percentage==="number"?` (${content.rebate_percentage}% of the purchase price)`:""} has been approved and will be offset directly from the Balance Purchase Price after the Sale and Purchase Agreement is signed and the Balance Deposit is paid.</p>
  <p>Once again, congratulations on becoming part of the AIRA family.</p><p>Yours sincerely,<br/>For and on behalf of Selangor Properties Sdn. Bhd.</p><Signature name={optional(content,"authorised_signatory_name","Authorised Signatory")} role={optional(content,"authorised_signatory_position","Authorised signatory")}/>
  <footer className="source-footer">Selangor Properties Sdn. Bhd. · Level 2, Block D, Kompleks Pejabat Damansara, Jalan Dungun, Damansara Heights, 50490 Kuala Lumpur</footer>
  </article>}

function HovpLetter({content}:{content:Record<string,unknown>}){return <article className="letter source-letter"><SourceBand type="hovp_letter" label="HOVP Letter"/><CompanyHead/><p>{date(content.sale_date)}</p><p>To: <b>{value(content,"customer_name")}</b></p><h1 className="source-subject">HOUSING LOAN VALUE PARTICULARS</h1><p>Re: <b>Unit {value(content,"unit_number")}, {value(content,"project_name")}</b></p><p>We confirm the housing loan particulars recorded for the above purchase. The financing amount is <b>{money(content.loan_amount)}</b>, representing <b>{value(content,"loan_percentage")}%</b> of the purchase price.</p><p>Please retain this letter with your transaction records.</p><Signature name="For Selangor Properties Sdn. Bhd." role="Authorised signatory"/></article>}
