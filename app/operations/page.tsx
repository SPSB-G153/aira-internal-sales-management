import Link from "next/link";
import { processStages } from "@/lib/operations";

export default function OperationsPage() {
  return <div className="page operations-page">
    <div className="page-header"><div><p className="eyebrow">Sales process</p><h1>One process. Clear steps.</h1><p className="subtle">A brief guide from the POP through booking, documentation, SPA and handover.</p></div><Link href="/sales/new" className="button accent">＋ Start a sale</Link></div>

    <section className="operations-section"><div className="section-heading"><div><p className="eyebrow">Process</p><h2>Five stages</h2></div></div><div className="process-track">{processStages.map((stage) => <article className="card process-card" key={stage.key}><span className="process-number">{stage.number}</span><h3>{stage.title}</h3><p>{stage.outcome}</p><dl><div><dt>Owner</dt><dd>{stage.owner}</dd></div><div><dt>Evidence</dt><dd>{stage.evidence}</dd></div><div><dt>Timing</dt><dd>{stage.sla}</dd></div></dl></article>)}</div></section>
  </div>;
}
