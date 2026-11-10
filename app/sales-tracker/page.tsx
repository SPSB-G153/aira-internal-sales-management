import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { formatRinggit, formatTrackerDate, SALES_TARGET, salesTargetMetrics, trackerRows, trackerSummary } from "@/lib/sales-tracker";

export default async function SalesTrackerPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const sales = await getSales();
  const rows = trackerRows(sales);
  const q = (params.q || "").trim().toLowerCase();
  const status = params.status || "";
  const visible = rows.filter((row) => (!q || `${row.unit} ${row.purchaser} ${row.currentStage} ${row.nextAction}`.toLowerCase().includes(q)) && (!status || row.tone === status));
  const summary = trackerSummary(rows);
  const target = salesTargetMetrics(sales);
  const progress = Math.min(target.progress * 100, 100);
  return <div className="page tracker-page">
    <div className="page-header tracker-header"><div><p className="eyebrow">Management view</p><h1>Sales Tracker</h1><p className="subtle">Live progress from booking through SPA, settlement and handover.</p></div><div className="form-actions tracker-export-actions"><a className="button secondary" href="/api/sales-tracker/excel">Export Excel</a><a className="button accent" href="/api/sales-tracker/pdf">Export PDF</a></div></div>
    <section className="tracker-kpis" aria-label="Sales tracker summary">
      <article><span>Total units</span><strong>{summary.total}</strong><small>Sales records</small></article>
      <article><span>Action required</span><strong>{summary.action}</strong><small>Items needing follow-up</small></article>
      <article><span>SPA scheduled</span><strong>{summary.scheduled}</strong><small>Upcoming appointments</small></article>
      <article><span>Overdue</span><strong>{summary.overdue}</strong><small>Past the recorded timeline</small></article>
    </section>
    <section className="card sales-target-panel" aria-labelledby="sales-target-title">
      <div className="sales-target-heading"><div><p className="eyebrow">Approved sales campaign</p><h2 id="sales-target-title">Sales Target Achievement</h2></div><strong>{progress.toFixed(1)}%</strong></div>
      <div className="sales-target-progress" aria-label={`${progress.toFixed(1)}% of target achieved`}><span style={{ width: `${progress}%` }} /></div>
      <div className="sales-target-values">
        <div><span>Approved value</span><strong>{formatRinggit(SALES_TARGET.grossApproved)}</strong></div>
        <div><span>Less 3%</span><strong>{formatRinggit(SALES_TARGET.rebateAmount)}</strong></div>
        <div><span>Net approved value</span><strong>{formatRinggit(SALES_TARGET.netApproved)}</strong></div>
        <div className="target-highlight"><span>Management target</span><strong>{formatRinggit(SALES_TARGET.managementTarget)}</strong></div>
        <div><span>Confirmed sales</span><strong>{formatRinggit(target.confirmedValue)}</strong></div>
        <div><span>Balance to target</span><strong>{formatRinggit(target.remaining)}</strong></div>
      </div>
      <div className="sales-target-towers"><span>Tower A confirmed <b>{formatRinggit(target.towerAValue)}</b></span><span>Tower B confirmed <b>{formatRinggit(target.towerBValue)}</b></span>{target.pendingValue > 0 && <span>Pending payment <b>{formatRinggit(target.pendingValue)}</b></span>}</div>
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
