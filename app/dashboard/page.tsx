import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { hasRecordedBookingPayment, saleDisplayStatus } from "@/lib/sale-state";

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

  return <div className="page management-dashboard">
    <div className="page-header management-header"><div><h1>Sales Overview</h1></div><Link href="/sales/new" className="button accent">＋ New sale</Link></div>

    <section className="management-kpis" aria-label="Portfolio summary">
      <article className="management-kpi"><span>Total units</span><strong>{sales.length}</strong><small>Sales records</small></article>
      <article className="management-kpi pending"><span>Pending payment</span><strong>{pendingPayment.length}</strong><small>Require 2% payment</small></article>
      <article className="management-kpi confirmed"><span>Confirmed</span><strong>{confirmed.length}</strong><small>Booking and payment recorded</small></article>
    </section>

    <div className="management-grid management-grid-single">
      <section className="card management-sales"><div className="management-section-head"><div><h2>Recent sales</h2></div><Link href="/sales" className="text-link">View all sales</Link></div><div className="management-table"><div className="management-table-head"><span>Unit</span><span>Purchaser</span><span>Purchase price</span><span>Status</span><span /></div>{sales.slice(0, 6).map((sale) => {const status = saleDisplayStatus(sale);return <Link href={`/sales/${sale.id}`} className="management-sale-row" key={sale.id}><strong>{sale.unit_number || "Pending"}</strong><span>{sale.customer_name}</span><span className="management-price">{money(sale.purchase_price)}</span><span className={`badge ${status.className}`}>{status.label}</span><span>›</span></Link>})}</div></section>
    </div>
  </div>;
}
