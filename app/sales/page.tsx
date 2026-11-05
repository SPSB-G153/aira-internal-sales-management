import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { hasRecordedBookingPayment, saleDisplayStatus } from "@/lib/sale-state";
import { detailsForUnit } from "@/lib/unit-details";

export const dynamic = "force-dynamic";

const money = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value);

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const needsPaymentFilter = params.status === "confirmed" || params.status === "pending_payment";
  const results = await getSales(params.q, needsPaymentFilter ? undefined : params.status);
  const sales = params.status === "confirmed"
    ? results.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && hasRecordedBookingPayment(sale))
    : params.status === "pending_payment"
      ? results.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale))
      : results;
  const filtered = Boolean(params.q || params.status);

  return <div className="page">
    <div className="page-header sales-registry-header">
      <div><h1>Sales Registry</h1><p className="subtle">View and manage all sales records.</p></div>
      <Link className="button accent" href="/sales/new">＋ New sale</Link>
    </div>
    <form className="toolbar sales-search-toolbar">
      <label className="sales-search-field"><span>Find by unit, purchaser or POP reference</span><input name="q" aria-label="Search by unit number, purchaser, project or POP reference" placeholder="Enter a unit number, e.g. A-G-01" defaultValue={params.q} /></label>
      <label className="sales-status-field"><span>Status</span><select name="status" aria-label="Filter by status" defaultValue={params.status}><option value="">All statuses</option><option value="booking_draft">Booking drafts</option><option value="draft">POP drafts</option><option value="pending_payment">Pending Payment</option><option value="confirmed">Confirmed</option></select></label>
      <button className="button secondary">Search</button>{filtered && <Link className="button secondary" href="/sales">Clear</Link>}
    </form>
    <div className="results-summary"><strong>{sales.length} {sales.length === 1 ? "sale" : "sales"}</strong>{filtered && <span> matching the current filters</span>}</div>
    <div className="card sales-list">{sales.length && <div className="sales-list-head"><span>Purchaser</span><span>Unit / booking date</span><span>Purchase price</span><span>Status</span><span /></div>}{sales.length ? sales.map((sale) => {
      const status = saleDisplayStatus(sale);
      const approvedUnit = detailsForUnit(sale.unit_number || "");
      const unitType = approvedUnit?.unitType || sale.unit_type;
      const parkingBay = approvedUnit?.parkingBay || sale.car_parking_bay;
      return <Link href={`/sales/${sale.id}`} className="sale-row" key={sale.id}><div><strong>{sale.customer_name}</strong><small>{unitType ? `Type ${unitType.toUpperCase()}` : "Type not recorded"} · {parkingBay ? `Parking ${parkingBay}` : "Parking not recorded"}</small></div><div><strong>{sale.unit_number || "Unit pending"}</strong><small>{sale.sale_date || "No date"}</small></div><span className="money">{money(sale.purchase_price)}</span><span className={`badge ${status.className}`}>{status.label}</span><span>›</span></Link>;
    }) : <div className="empty"><h2>{filtered ? "No matching sales" : "No sales yet"}</h2><p className="subtle">{filtered ? "Try a different purchaser, unit, project, POP reference, or status." : "Create your first sale to generate its document set."}</p>{filtered ? <Link className="button secondary" href="/sales">Clear filters</Link> : <Link className="button" href="/sales/new">Create first sale</Link>}</div>}</div>
  </div>;
}
