import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { governanceRules, processStages, scoreSale, scoreTone } from "@/lib/operations";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [sales, documents] = await Promise.all([getSales(), getDocuments()]);
  const scorecards = sales.map((sale) => ({ sale, score: scoreSale(sale, documents.filter((doc) => doc.sale_id === sale.id)) }));
  const ready = scorecards.filter(({ score }) => score.total >= 90).length;
  const exceptions = scorecards.filter(({ score }) => score.total < 75).length;
  const average = scorecards.length ? Math.round(scorecards.reduce((sum, item) => sum + item.score.total, 0) / scorecards.length) : 0;

  return <div className="page operations-page">
    <div className="page-header"><div><p className="eyebrow">Sales operating system</p><h1>One process. Clear controls.</h1><p className="subtle">A practical playbook from first capture to an audit-ready document pack.</p></div><Link href="/sales/new" className="button accent">＋ Start a sale</Link></div>

    <div className="stats operations-stats"><div className="card stat"><span className="subtle">Portfolio score</span><b>{average}<small> / 100</small></b></div><div className="card stat"><span className="subtle">Strong files</span><b>{ready}</b></div><div className="card stat"><span className="subtle">Exceptions</span><b>{exceptions}</b></div><div className="card stat"><span className="subtle">Governance rules</span><b>{governanceRules.length}</b></div></div>

    <section className="operations-section"><div className="section-heading"><div><p className="eyebrow">Process</p><h2>Five controlled stages</h2></div><span className="legend">Target: ≥90</span></div><div className="process-track">{processStages.map((stage) => <article className="card process-card" key={stage.key}><span className="process-number">{stage.number}</span><h3>{stage.title}</h3><p>{stage.outcome}</p><dl><div><dt>Owner</dt><dd>{stage.owner}</dd></div><div><dt>Evidence</dt><dd>{stage.evidence}</dd></div><div><dt>SLA</dt><dd>{stage.sla}</dd></div></dl></article>)}</div></section>

    <section className="operations-section"><div className="section-heading"><div><p className="eyebrow">Live scoring</p><h2>Work queue</h2></div><span className="legend">Data 40 · Finance 25 · Docs 25 · Governance 10</span></div><div className="card score-table">{scorecards.length ? scorecards.sort((a,b)=>a.score.total-b.score.total).map(({sale,score}) => <Link className="score-row" href={`/sales/${sale.id}`} key={sale.id}><div><strong>{sale.customer_name}</strong><small>{sale.sale_reference} · {sale.project_name}</small></div><span className="stage-pill">{score.stageLabel}</span><div className="score-meter"><span style={{width:`${score.total}%`}} className={scoreTone(score.total)} /></div><strong className={`score-value ${scoreTone(score.total)}`}>{score.total}</strong><div className="next-action"><small>Next action</small><span>{score.nextAction}</span></div><span>›</span></Link>) : <div className="empty"><h3>No sales to score</h3><p className="subtle">Create a sale to start the governed workflow.</p></div>}</div></section>

    <div className="operations-split"><section className="operations-section"><p className="eyebrow">Governance</p><h2>Control matrix</h2><div className="card governance-list">{governanceRules.map((item) => <article key={item.control}><div><h3>{item.control}</h3><p>{item.rule}</p></div><dl><div><dt>Accountable</dt><dd>{item.accountable}</dd></div><div><dt>Proof</dt><dd>{item.proof}</dd></div></dl></article>)}</div></section><section className="operations-section"><p className="eyebrow">Playbook</p><h2>Decision rules</h2><div className="card playbook-list"><article><span className="playbook-icon">✓</span><div><h3>90–100 · Strong</h3><p>Proceed to final review or archive. All critical evidence should be present.</p></div></article><article><span className="playbook-icon amber">!</span><div><h3>75–89 · Watch</h3><p>Continue work, but close the listed gaps before the pack is completed.</p></div></article><article><span className="playbook-icon red">×</span><div><h3>Below 75 · Escalate</h3><p>Do not treat the file as complete. Correct missing evidence or financial exceptions.</p></div></article><article><span className="playbook-icon">→</span><div><h3>Always follow the next action</h3><p>The scorecard identifies the highest-priority step for each transaction.</p></div></article></div></section></div>
  </div>;
}
