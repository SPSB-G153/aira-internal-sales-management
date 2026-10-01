import Link from "next/link";
import { notFound } from "next/navigation";
import { getSale } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { documentNames } from "@/lib/types";
import { ConfirmSaleForm } from "@/components/confirm-sale-form";
import { SaleStageActions } from "@/components/sale-stage-actions";
import { scoreSale, scoreTone } from "@/lib/operations";

export const dynamic = "force-dynamic";
const money = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);

export default async function SaleDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ confirmed?: string }> }) {
  const { id } = await params;
  let sale;
  try { sale = await getSale(id); } catch { return notFound(); }
  const [docs, query] = await Promise.all([getDocuments(id), searchParams]);
  const score = scoreSale(sale, docs);
  const expectedDocuments = sale.rebate_amount && sale.rebate_amount > 0 ? 5 : 4;
  const missing = [!sale.customer_ic && "IC / Passport", !sale.customer_phone && !sale.customer_email && "phone or email", !sale.unit_number && "unit number", !sale.salesperson_name && "salesperson", !sale.sale_date && "proposal date"].filter(Boolean) as string[];
  const heading = sale.status === "draft" ? "POP details" : "Booking details";
  const statusLabel = sale.status === "draft" ? "POP" : sale.status.replace("_", " ");
  const letterSummary = sale.rebate_amount && sale.rebate_amount > 0 ? "Notice of Acceptance and Rebate Letter" : "Notice of Acceptance";

  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">{sale.sale_reference}</p><h1>{sale.customer_name}</h1><p className="subtle">{sale.project_name} · {sale.unit_number || "Unit pending"}</p></div><div className="form-actions"><Link href={`/sales/${id}/edit`} className="button secondary">Edit POP</Link>{sale.status === "draft" && <ConfirmSaleForm saleId={id} />}{sale.status === "confirmed" && <SaleStageActions saleId={id} status="confirmed" />}{sale.status === "spa_signed" && <SaleStageActions saleId={id} status="spa_signed" />}</div></div>
    {query.confirmed && <div className="alert success" role="status">Booking confirmed. {letterSummary} is ready to print.</div>}
    {sale.status === "draft" && <div className="readiness"><div><strong>POP is editable and may be withdrawn before booking</strong><p>{missing.length ? `Complete ${missing.join(", ")} before the booking is created.` : "When the purchaser proceeds and the 2% deposit is paid, create the booking and issue the letters."}</p></div><Link href={`/sales/${id}/edit`} className="button secondary">Edit POP</Link></div>}
    {sale.status === "confirmed" && <div className="readiness"><div><strong>Booking confirmed and 2% deposit recorded</strong><p>Proceed with the SPA process. Mark the SPA as signed when completed.</p></div></div>}
    {sale.status === "spa_signed" && <div className="readiness"><div><strong>SPA signed</strong><p>When the 90% balance is paid and/or foreign consent is completed, issue the HOVP letter.</p></div></div>}
    {sale.status === "hovp_ready" && <div className="alert success">HOVP letter issued after SPA completion requirements were confirmed.</div>}
    <div className="detail-grid"><div className="stack"><section className="card detail-card"><div className="page-header" style={{ marginBottom: 0 }}><h2>{heading}</h2><span className={`badge ${sale.status}`}>{statusLabel}</span></div><dl className="kv"><div><dt>IC / Passport</dt><dd>{sale.customer_ic || "—"}</dd></div><div><dt>Contact</dt><dd>{sale.customer_phone || sale.customer_email || "—"}</dd></div><div><dt>Unit type</dt><dd>{sale.unit_type || "—"}</dd></div><div><dt>Floor area</dt><dd>{sale.floor_area ? `${sale.floor_area} sq ft` : "—"}</dd></div><div><dt>Salesperson</dt><dd>{sale.salesperson_name || "—"}</dd></div><div><dt>Proposal date</dt><dd>{sale.sale_date || "—"}</dd></div></dl></section>
      <section><div className="page-header"><div><p className="eyebrow">Generated letters</p><h2>{docs.length}/{expectedDocuments} generated</h2></div>{docs.length > 0 && <span className="completion-label">{docs.filter(d => d.status === "reviewed").length}/{expectedDocuments} reviewed</span>}</div>{docs.length ? <div className="doc-grid">{docs.map(d => <Link className="card doc-card" href={`/documents/${d.id}`} key={d.id}><span className="doc-icon">▤</span><div><h3>{documentNames[d.document_type]}</h3><p className="subtle" style={{ margin: "6px 0" }}>Ready to print</p><span className={`badge ${d.status}`}>{d.status}</span></div></Link>)}</div> : <div className="card empty"><h3>No letters generated yet</h3><p className="subtle">Create the booking to issue Notice of Acceptance{sale.rebate_amount && sale.rebate_amount > 0 ? " and Rebate Letter" : ""}. HOVP is issued after SPA completion.</p></div>}</section></div>
      <aside className="stack"><section className="card detail-card score-card"><div className="score-card-head"><div><p className="eyebrow">Readiness score</p><strong className={scoreTone(score.total)}>{score.total}<small>/100</small></strong></div><span className="stage-pill">{score.stageLabel}</span></div><div className="score-meter large"><span style={{ width: `${score.total}%` }} className={scoreTone(score.total)} /></div><p className="next-step"><small>Next action</small><b>{score.nextAction}</b></p><div className="score-breakdown"><span>Data <b>{score.dataQuality}/40</b></span><span>Finance <b>{score.financialIntegrity}/25</b></span><span>Docs <b>{score.documentControl}/25</b></span><span>Governance <b>{score.governance}/10</b></span></div>{score.blockers.length > 0 && <ul className="blocker-list">{score.blockers.slice(0, 4).map(item => <li key={item}>{item}</li>)}</ul>}<Link href="/operations" className="text-link">Open playbook →</Link></section><section className="card detail-card"><p className="eyebrow">Offer summary</p><dl className="kv" style={{ gridTemplateColumns: "1fr" }}><div><dt>Purchase price</dt><dd>{money(sale.purchase_price)}</dd></div><div><dt>Earnest deposit</dt><dd>{money(sale.booking_fee)}</dd></div><div><dt>Rebate</dt><dd>{money(sale.rebate_amount)}</dd></div></dl></section></aside>
    </div>
  </div>;
}
