import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { hasRecordedBookingPayment, saleDisplayStatus } from "@/lib/sale-state";
import { formatTrackerDate, trackerRows } from "@/lib/sales-tracker";
import { purchaserDisplayName } from "@/lib/purchaser-name";

export const dynamic = "force-dynamic";

const money = (value: number) => new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
}).format(value);

export default async function Dashboard() {
  const sales = await getSales();
  const confirmed = sales.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && hasRecordedBookingPayment(sale));
  const pendingPayment = sales.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale));
  const actionItems = trackerRows(sales)
    .filter((row) => row.tone === "overdue" || row.tone === "action" || row.tone === "pending")
    .sort((a, b) => Number(b.tone === "overdue") - Number(a.tone === "overdue") || String(a.keyDate || "9999-12-31").localeCompare(String(b.keyDate || "9999-12-31")));

  return <div className="page management-dashboard">
    <div className="page-header management-header"><div><h1>Sales Overview</h1></div><Link href="/sales/new" className="button accent">＋ New sale</Link></div>

    <section className="management-kpis" aria-label="Portfolio summary">
      <Link href="/sales" className="management-kpi"><span>Total units</span><strong>{sales.length}</strong><small>View sales records</small></Link>
      <Link href="/sales-tracker?view=action#tracker-register" className="management-kpi pending"><span>Pending payment</span><strong>{pendingPayment.length}</strong><small>View required action</small></Link>
      <Link href="/sales" className="management-kpi confirmed"><span>Confirmed</span><strong>{confirmed.length}</strong><small>View confirmed sales</small></Link>
    </section>

    <section className="card management-alerts" aria-labelledby="overview-alerts-title">
      <div className="management-section-head"><div><p className="eyebrow">Follow-up alerts</p><h2 id="overview-alerts-title">Action required</h2></div><Link href="/sales-tracker?view=action#tracker-register" className="text-link">View all {actionItems.length}</Link></div>
      {actionItems.length ? <div className="management-alert-list">{actionItems.slice(0, 8).map((item) => <Link href={`/sales/${item.id}#transaction-tracker`} className={`management-alert ${item.tone}`} key={item.id}>
        <span className="management-alert-unit">{item.unit}</span>
        <span className="management-alert-main"><strong>{item.nextAction}</strong><small>{item.purchaser.toUpperCase()} · {item.currentStage}</small></span>
        <span className="management-alert-date"><small>{item.keyDate ? formatTrackerDate(item.keyDate) : "No date set"}</small><b>{item.status}</b></span>
        <span aria-hidden="true">›</span>
      </Link>)}</div> : <div className="management-alert-clear"><strong>No action required</strong><span>There are no overdue or pending follow-up items.</span></div>}
    </section>

    <div className="management-grid management-grid-single">
      <section className="card management-sales"><div className="management-section-head"><div><h2>Recent sales</h2></div><Link href="/sales" className="text-link">View all sales</Link></div><div className="management-table"><div className="management-table-head"><span>Unit</span><span>Purchaser</span><span>Purchase price</span><span>Status</span><span /></div>{sales.slice(0, 6).map((sale) => {const status = saleDisplayStatus(sale);return <Link href={`/sales/${sale.id}`} className="management-sale-row" key={sale.id}><strong>{sale.unit_number || "Pending"}</strong><span>{purchaserDisplayName(sale).toUpperCase()}</span><span className="management-price">{money(sale.purchase_price)}</span><span className={`badge ${status.className}`}>{status.label}</span><span>›</span></Link>})}</div></section>
    </div>
  </div>;
}
