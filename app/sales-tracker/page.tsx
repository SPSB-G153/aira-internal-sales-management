import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { formatRinggit, formatTrackerDate, formatTrackerMonth, monthlySalesPerformance, SALES_TARGET, salesTargetMetrics, trackerRows, trackerSummary } from "@/lib/sales-tracker";

export default async function SalesTrackerPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; view?: string }> }) {
  const params = await searchParams;
  const [sales, documents] = await Promise.all([getSales(), getDocuments()]);
  const rows = trackerRows(sales);
  const q = (params.q || "").trim().toLowerCase();
  const status = params.status || "";
  const view = params.view || "all";
  const registerTitle = view === "action" ? "Action required" : view === "scheduled" ? "SPA scheduled" : view === "overdue" ? "Overdue" : "Sales records";
  const matchesView = (row: (typeof rows)[number]) => view === "action" ? ["action", "pending", "overdue"].includes(row.tone) : view === "scheduled" ? row.currentStage === "SPA signing scheduled" : view === "overdue" ? row.tone === "overdue" : true;
  const visible = rows.filter((row) => matchesView(row) && (!q || `${row.unit} ${row.purchaser} ${row.currentStage} ${row.nextAction}`.toLowerCase().includes(q)) && (!status || row.tone === status));
  const summary = trackerSummary(rows);
  const target = salesTargetMetrics(sales);
  const monthly = monthlySalesPerformance(sales, documents);
  const progress = Math.min(target.progress * 100, 100);
  return <div className="page tracker-page">
    <div className="page-header tracker-header"><div><p className="eyebrow">Management view</p><h1>Sales Tracker</h1><p className="subtle">Live progress from booking through SPA, settlement and handover.</p></div><div className="form-actions tracker-export-actions"><a className="button secondary" href="/api/sales-tracker/excel">Export Excel</a><a className="button accent" href="/api/sales-tracker/pdf">Export PDF</a></div></div>
    <section className="tracker-kpis" aria-label="Sales tracker summary">
      <Link href="/sales-tracker?view=all#tracker-register" className={view === "all" ? "active" : ""}><span>Total units</span><strong>{summary.total}</strong><small>View all sales records</small></Link>
      <Link href="/sales-tracker?view=action#tracker-register" className={view === "action" ? "active" : ""}><span>Action required</span><strong>{summary.action}</strong><small>View items needing follow-up</small></Link>
      <Link href="/sales-tracker?view=scheduled#tracker-register" className={view === "scheduled" ? "active" : ""}><span>SPA scheduled</span><strong>{summary.scheduled}</strong><small>View upcoming appointments</small></Link>
      <Link href="/sales-tracker?view=overdue#tracker-register" className={view === "overdue" ? "active" : ""}><span>Overdue</span><strong>{summary.overdue}</strong><small>View past-due items</small></Link>
    </section>
    <section className="card sales-target-panel" aria-labelledby="sales-target-title">
      <div className="sales-target-heading"><div><p className="eyebrow">Approved sales campaign</p><h2 id="sales-target-title">Sales Target Achievement</h2></div><strong>{progress.toFixed(1)}%</strong></div>
      <div className="sales-target-progress" aria-label={`${progress.toFixed(1)}% of target achieved`}><span style={{ width: `${progress}%` }} /></div>
      <div className="sales-target-values">
        <div className="target-highlight"><span>Target</span><strong>{formatRinggit(SALES_TARGET.managementTarget)}</strong><div className="sales-target-breakdown"><small>Tower A <b>{target.towerATargetUnits} units</b></small><small>Tower B <b>{target.towerBTargetUnits} units</b></small></div></div>
        <div><span>Confirmed sales</span><strong>{formatRinggit(target.confirmedValue)}</strong><div className="sales-target-breakdown"><small>Tower A <b>{target.towerAUnits} units</b></small><small>Tower B <b>{target.towerBUnits} unit{target.towerBUnits === 1 ? "" : "s"}</b></small></div></div>
        <div><span>Balance to target</span><strong>{formatRinggit(target.remaining)}</strong><div className="sales-target-breakdown"><small>Tower A <b>{target.towerABalanceUnits} units</b></small><small>Tower B <b>{target.towerBBalanceUnits} units</b></small></div></div>
      </div>
      {target.pendingValue > 0 && <div className="sales-target-towers"><span>Pending payment <b>{formatRinggit(target.pendingValue)}</b></span></div>}
    </section>
    <section className="card monthly-target-panel" aria-labelledby="monthly-target-title">
      <div className="monthly-target-heading"><div><p className="eyebrow">Monthly performance</p><h2 id="monthly-target-title">Sales Target by Month</h2></div><span>{monthly.campaignActual} of {monthly.campaignTarget} units</span></div>
      <div className="monthly-target-summary">
        <div><span>Current month target</span><strong>{monthly.currentTarget}</strong></div>
        <div><span>Current month actual</span><strong>{monthly.currentActual}</strong></div>
        <div><span>YTD target</span><strong>{monthly.ytdTarget}</strong></div>
        <div><span>YTD actual</span><strong>{monthly.ytdActual}</strong></div>
      </div>
      <div className="monthly-target-table">
        <div className="monthly-target-row monthly-target-head"><span>Month</span><span>Tower A</span><span>Tower B</span><span>Target</span><span>Actual</span><span>Actual value</span><span>Cumulative</span><span>Variance</span></div>
        {monthly.rows.map((row) => <div className={`monthly-target-row${row.month === monthly.currentMonth ? " current" : ""}`} key={row.month}><strong>{formatTrackerMonth(row.month)}</strong><span>{row.towerA}</span><span>{row.towerB}</span><span>{row.targetUnits}</span><span>{row.actualUnits}</span><span>{formatRinggit(row.actualValue)}</span><span>{row.cumulativeActual} / {row.cumulativeTarget}</span><span className={row.variance < 0 ? "negative" : ""}>{row.variance > 0 ? "+" : ""}{row.variance}</span></div>)}
      </div>
    </section>
    <form className="card tracker-filters">
      {view !== "all" && <input type="hidden" name="view" value={view} />}
      <label><span>Search</span><input name="q" defaultValue={params.q || ""} placeholder="Unit, purchaser or next action" /></label>
      <label><span>Status</span><select name="status" defaultValue={status}><option value="">All statuses</option><option value="action">Action Needed</option><option value="pending">Pending</option><option value="on-track">On Track</option><option value="overdue">Overdue</option><option value="completed">Completed</option></select></label>
      <button className="button secondary" type="submit">Apply</button>
      {(q || status) && <Link className="text-link" href="/sales-tracker">Clear</Link>}
    </form>
    <section className="tracker-register-section" id="tracker-register">
      <div className="tracker-register-heading"><div><p className="eyebrow">Sales follow-up</p><h2>{registerTitle}</h2></div><span>{visible.length} {visible.length === 1 ? "record" : "records"}</span></div>
      <div className="card tracker-register">
      <div className="tracker-table-head"><span>Unit</span><span>Purchaser</span><span>Current stage</span><span>Key date</span><span>Next action</span><span>Status</span></div>
      {visible.map((row) => <Link href={`/sales/${row.id}`} className="tracker-table-row" key={row.id}><strong>{row.unit}</strong><span>{row.purchaser}</span><span>{row.currentStage}</span><time>{formatTrackerDate(row.keyDate)}</time><span>{row.nextAction}</span><span className={`tracker-status ${row.tone}`}>{row.status}</span></Link>)}
      {!visible.length && <div className="empty"><h3>No matching sales</h3><p className="subtle">Adjust the search or status filter.</p></div>}
      </div>
    </section>
  </div>;
}
