import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { formatTrackerDate, trackerRows, trackerSummary } from "@/lib/sales-tracker";

export default async function SalesTrackerPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const rows = trackerRows(await getSales());
  const q = (params.q || "").trim().toLowerCase();
  const status = params.status || "";
  const visible = rows.filter((row) => (!q || `${row.unit} ${row.purchaser} ${row.currentStage} ${row.nextAction}`.toLowerCase().includes(q)) && (!status || row.tone === status));
  const summary = trackerSummary(rows);
  return <div className="page tracker-page">
    <div className="page-header tracker-header"><div><p className="eyebrow">Management view</p><h1>Sales Tracker</h1><p className="subtle">Live progress from booking through SPA, settlement and handover.</p></div><div className="form-actions tracker-export-actions"><a className="button secondary" href="/api/sales-tracker/excel">Export Excel</a><a className="button accent" href="/api/sales-tracker/pdf">Export PDF</a></div></div>
    <section className="tracker-kpis" aria-label="Sales tracker summary">
      <article><span>Total units</span><strong>{summary.total}</strong><small>Sales records</small></article>
      <article><span>Action required</span><strong>{summary.action}</strong><small>Items needing follow-up</small></article>
      <article><span>SPA scheduled</span><strong>{summary.scheduled}</strong><small>Upcoming appointments</small></article>
      <article><span>Overdue</span><strong>{summary.overdue}</strong><small>Past the recorded timeline</small></article>
    </section>
    <form className="card tracker-filters">
      <label><span>Search</span><input name="q" defaultValue={params.q || ""} placeholder="Unit, purchaser or next action" /></label>
      <label><span>Status</span><select name="status" defaultValue={status}><option value="">All statuses</option><option value="action">Action Needed</option><option value="pending">Pending</option><option value="on-track">On Track</option><option value="overdue">Overdue</option><option value="completed">Completed</option></select></label>
      <button className="button secondary" type="submit">Apply</button>
      {(q || status) && <Link className="text-link" href="/sales-tracker">Clear</Link>}
    </form>
    <section className="card tracker-register">
      <div className="tracker-table-head"><span>Unit</span><span>Purchaser</span><span>Current stage</span><span>Key date</span><span>Next action</span><span>Status</span></div>
      {visible.map((row) => <Link href={`/sales/${row.id}`} className="tracker-table-row" key={row.id}><strong>{row.unit}</strong><span>{row.purchaser}</span><span>{row.currentStage}</span><time>{formatTrackerDate(row.keyDate)}</time><span>{row.nextAction}</span><span className={`tracker-status ${row.tone}`}>{row.status}</span></Link>)}
      {!visible.length && <div className="empty"><h3>No matching sales</h3><p className="subtle">Adjust the search or status filter.</p></div>}
    </section>
  </div>;
}
