import Link from "next/link";
import { notFound } from "next/navigation";
import { getSale } from "@/lib/data/sales";
import { ensureAgentCommissionDocument, getDocuments } from "@/lib/data/documents";
import { documentNames } from "@/lib/types";
import { ConfirmSaleForm } from "@/components/confirm-sale-form";
import { scoreSale, scoreTone } from "@/lib/operations";
import { getTeamContext } from "@/lib/tenancy";
import { DeleteSaleForm } from "@/components/delete-sale-form";
import { ClearanceLetterUpload } from "@/components/clearance-letter-upload";
import { agencyCompanyForSale, agencyDetailsForSale, hasExternalAgent } from "@/lib/agency-details";
import { hasRecordedBookingPayment, saleDisplayStatus } from "@/lib/sale-state";

export const dynamic = "force-dynamic";
const money = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);

export default async function SaleDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ confirmed?: string }> }) {
  const { id } = await params;
  let sale;
  try { sale = await getSale(id); } catch { return notFound(); }
  const query = await searchParams;
  sale.unit_type = sale.unit_type?.toUpperCase() ?? null;
  const { role, isDemo } = await getTeamContext();
  const canAccessAgentLetter = role === "owner" || isDemo;
  const paymentRecorded = hasRecordedBookingPayment(sale);
  await ensureAgentCommissionDocument(sale);
  const allDocs = await getDocuments(id);
  const docs = allDocs.filter((document) =>
    document.document_type !== "pre_booking_form" &&
    (document.document_type !== "acceptance_letter" || paymentRecorded) &&
    (document.document_type !== "hovp_letter" || sale.status === "hovp_ready") &&
    (document.document_type !== "booking_form" || document.content.booking_source === "manual")
  );
  const score = scoreSale(sale, docs);
  const isPop = sale.status === "draft";
  const isBookingDraft = sale.status === "booking_draft";
  const hasAgent = hasExternalAgent(sale);
  const agentCompany = agencyCompanyForSale(sale);
  const agentDetails = agencyDetailsForSale(sale);
  const expectedDocuments = (!isPop && paymentRecorded ? 1 : 0) + (canAccessAgentLetter && hasAgent ? 2 : 0) + (docs.some((document) => document.document_type === "booking_form") ? 1 : 0) + (sale.status === "hovp_ready" ? 1 : 0) + (sale.rebate_amount && sale.rebate_amount > 0 ? 1 : 0) + (sale.quoted_id_net_selling_price && sale.quoted_id_net_selling_price > 0 ? 1 : 0);
  const missing = [!sale.customer_ic && "IC / Passport", !sale.customer_phone && !sale.customer_email && "phone or email", !sale.unit_number && "unit number", !sale.salesperson_name && "salesperson", !sale.sale_date && "proposal date"].filter(Boolean) as string[];
  const heading = isPop ? "POP details" : "Booking details";
  const displayStatus = saleDisplayStatus(sale);
  const letterSummary = [...(paymentRecorded ? ["Notice of Acceptance"] : []), ...(canAccessAgentLetter && hasAgent ? ["Agency Appointment Letter", "Agent's Fee Arrangement"] : []), ...(sale.rebate_amount && sale.rebate_amount > 0 ? ["Rebate Letter"] : []), ...(sale.quoted_id_net_selling_price && sale.quoted_id_net_selling_price > 0 ? ["Confirmation of Inventories"] : [])].join(", ");

  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">{sale.sale_reference}</p><h1>{sale.customer_name}</h1><p className="subtle">{sale.project_name} · {sale.unit_number || "Unit pending"}</p></div><div className="form-actions"><Link href={`/sales/${id}/edit`} className="button secondary">{isPop ? "Edit POP" : "Edit booking"}</Link>{(isPop || isBookingDraft) && <ConfirmSaleForm saleId={id} />}{paymentRecorded && (sale.status === "confirmed" || sale.status === "spa_signed") && <ClearanceLetterUpload saleId={id} unitNumber={sale.unit_number || sale.sale_reference} />}</div></div>
    {query.confirmed && <div className="alert success" role="status">{paymentRecorded ? `Booking confirmed. ${letterSummary} is ready to print.` : "Booking saved — 2% payment is pending. The Notice of Acceptance will be available after payment is recorded."}</div>}
    {sale.status === "draft" && <div className="readiness"><div><strong>{hasAgent ? "POP saved — agent letters are available below" : "POP saved"}</strong><p>{missing.length ? `Complete ${missing.join(", ")} when the Booking Form is received.` : "Upload the Booking Form next; it will update this same unit record."}</p></div><div className="form-actions"><Link href={`/sales/${id}/edit`} className="button secondary">Edit POP</Link><Link href={`/sales/new?continue=${id}`} className="button accent">Upload Booking Form</Link></div></div>}
    {isBookingDraft && <div className="readiness"><div><strong>Booking saved as draft</strong><p>Review and edit any uploaded details, then confirm the booking when everything is correct.</p></div><Link href={`/sales/${id}/edit`} className="button secondary">Edit booking</Link></div>}
    {sale.status === "confirmed" && <div className="readiness"><div><strong>{paymentRecorded ? "Booking confirmed and 2% deposit recorded" : "Booking received — 2% payment pending"}</strong><p>{paymentRecorded ? "Upload the clearance letter when received. The HOVP Letter will only be issued after that local upload succeeds." : "Upload the cheque, bank-transfer receipt or cash receipt to confirm the booking and prepare the Notice of Acceptance."}</p></div></div>}
    {sale.status === "spa_signed" && <div className="readiness"><div><strong>Booking confirmed — clearance letter required</strong><p>Upload the received clearance letter locally. The HOVP Letter will only be issued after the local upload succeeds.</p></div></div>}
    {sale.status === "hovp_ready" && <div className="alert success">HOVP letter issued after SPA completion requirements were confirmed.</div>}
    <div className="detail-grid"><div className="stack"><section className="card detail-card"><div className="page-header" style={{ marginBottom: 0 }}><h2>{heading}</h2><span className={`badge ${displayStatus.className}`}>{displayStatus.label}</span></div><dl className="kv"><div><dt>IC / Passport</dt><dd>{sale.customer_ic || "—"}</dd></div><div><dt>Contact</dt><dd>{sale.customer_phone || sale.customer_email || "—"}</dd></div><div><dt>Unit type</dt><dd>{sale.unit_type || "—"}</dd></div><div><dt>Floor area</dt><dd>{sale.floor_area ? `${sale.floor_area} sq ft` : "—"}</dd></div><div><dt>Salesperson</dt><dd>{sale.salesperson_name || "—"}</dd></div><div><dt>{isPop ? "Proposal date" : "Booking date"}</dt><dd>{sale.sale_date || "—"}</dd></div></dl></section>
      {hasAgent && <section className="card detail-card"><div className="page-header" style={{ marginBottom: 0 }}><h2>Agent details</h2><span className="badge generated">Saved</span></div><dl className="kv"><div><dt>Agency / company</dt><dd>{agentCompany}</dd></div><div><dt>Agent name</dt><dd>{agentDetails.agent_name}</dd></div><div><dt>Designation</dt><dd>{agentDetails.agent_designation || "—"}</dd></div><div><dt>Mobile number</dt><dd>{agentDetails.agent_mobile || "—"}</dd></div><div><dt>Email</dt><dd>{agentDetails.agent_email || "—"}</dd></div><div><dt>Agency address</dt><dd>{agentDetails.address || "—"}</dd></div></dl></section>}
      <section id="generated-letters"><div className="page-header"><div><p className="eyebrow">Generated letters</p><h2>{docs.length}/{expectedDocuments} generated</h2></div><div className="form-actions">{docs.length > 0 && <span className="completion-label">{docs.filter(d => d.status === "reviewed").length}/{expectedDocuments} reviewed</span>}</div></div>{docs.length ? <div className="doc-grid">{docs.map(d => <Link className="card doc-card" href={`/documents/${d.id}`} key={d.id}><span className="doc-icon">▤</span><div><h3>{documentNames[d.document_type]}</h3><p className="subtle" style={{ margin: "6px 0" }}>Ready to print</p><span className={`badge ${d.status}`}>{d.status}</span></div></Link>)}</div> : <div className="card empty"><h3>No letters generated yet</h3><p className="subtle">Agent letters are generated only when agent details are included in the POP or Booking Form.</p></div>}</section></div>
      <aside className="stack"><section className="card detail-card score-card"><div className="score-card-head"><div><p className="eyebrow">Readiness score</p><strong className={scoreTone(score.total)}>{score.total}<small>/100</small></strong></div><span className="stage-pill">{score.stageLabel}</span></div><div className="score-meter large"><span style={{ width: `${score.total}%` }} className={scoreTone(score.total)} /></div><p className="next-step"><small>Next action</small><b>{score.nextAction}</b></p><div className="score-breakdown"><span>Data <b>{score.dataQuality}/40</b></span><span>Finance <b>{score.financialIntegrity}/25</b></span><span>Docs <b>{score.documentControl}/25</b></span><span>Governance <b>{score.governance}/10</b></span></div>{score.blockers.length > 0 && <ul className="blocker-list">{score.blockers.slice(0, 4).map(item => <li key={item}>{item}</li>)}</ul>}<Link href="/operations" className="text-link">Open playbook →</Link></section><section className="card detail-card"><p className="eyebrow">Offer summary</p><dl className="kv" style={{ gridTemplateColumns: "1fr" }}><div><dt>Purchase price</dt><dd>{money(sale.purchase_price)}</dd></div><div><dt>Earnest deposit</dt><dd>{money(sale.booking_fee)}</dd></div><div><dt>Rebate</dt><dd>{money(sale.rebate_amount)}</dd></div></dl></section>{role === "owner" && <section className="card detail-card danger-zone"><p className="eyebrow">Owner controls</p><h3>Delete this booking</h3><p className="subtle">Use only when a booking was uploaded by mistake.</p><DeleteSaleForm saleId={sale.id} saleReference={sale.sale_reference} /></section>}</aside>
    </div>
  </div>;
}
