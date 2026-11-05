import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { documentNames } from "@/lib/types";
import { hasRecordedBookingPayment, saleDisplayStatus } from "@/lib/sale-state";

export const dynamic = "force-dynamic";

const money = (value: number) => new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
}).format(value);

export default async function Dashboard() {
  const [sales, allDocs] = await Promise.all([getSales(), getDocuments()]);
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const documents = allDocs.filter((document) => {
    const sale = salesById.get(document.sale_id);
    return (document.document_type !== "acceptance_letter" || Boolean(sale && hasRecordedBookingPayment(sale))) &&
      (document.document_type !== "hovp_letter" || sale?.status === "hovp_ready");
  });
  const confirmed = sales.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && hasRecordedBookingPayment(sale));
  const pendingPayment = sales.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale));
  const drafts = sales.filter((sale) => sale.status === "draft" || sale.status === "booking_draft");
  const letters = documents.filter((document) => document.document_type !== "booking_form" && document.document_type !== "pre_booking_form");
  const lettersToReview = letters.filter((document) => document.status !== "reviewed");
  const unitsWithLettersToReview = new Set(lettersToReview.map((document) => document.sale_id)).size;
  const pendingUnits = pendingPayment.map((sale) => sale.unit_number).filter(Boolean).join(", ");

  const actionGroups = [
    {
      href: pendingPayment[0] ? `/sales/${pendingPayment[0].id}` : "/sales?status=pending_payment",
      label: "Payments pending",
      count: pendingPayment.length,
      detail: pendingPayment.length ? pendingUnits : "No units awaiting payment",
      tone: "amber",
    },
    {
      href: "/documents",
      label: "Letters for review",
      count: unitsWithLettersToReview,
      detail: unitsWithLettersToReview ? "Open the document register to review" : "All generated letters reviewed",
      tone: "green",
    },
    {
      href: "/sales?status=booking_draft",
      label: "Drafts to complete",
      count: drafts.length,
      detail: drafts.length ? "Complete the outstanding booking details" : "No incomplete sales",
      tone: "neutral",
    },
  ];

  return <div className="page management-dashboard">
    <div className="page-header management-header"><div><h1>Sales Overview</h1><p className="subtle">Current position, required actions and latest unit activity.</p></div><Link href="/sales/new" className="button accent">＋ New sale</Link></div>

    <section className="management-kpis" aria-label="Portfolio summary">
      <article className="management-kpi"><span>Total units</span><strong>{sales.length}</strong><small>Active sales records</small></article>
      <article className="management-kpi pending"><span>Pending payment</span><strong>{pendingPayment.length}</strong><small>Require 2% payment</small></article>
      <article className="management-kpi confirmed"><span>Confirmed</span><strong>{confirmed.length}</strong><small>Booking and payment recorded</small></article>
    </section>

    <div className="management-grid">
      <section className="card management-actions"><div className="management-section-head"><div><p className="eyebrow">Action required</p><h2>Priority items</h2></div></div><div className="management-action-list">{actionGroups.map((item) => <Link href={item.href} className="management-action" key={item.label}><span className={`management-action-mark ${item.tone}`} /><div><strong>{item.label}</strong><small>{item.detail}</small></div><b>{item.count}</b><span>›</span></Link>)}</div></section>

      <section className="card management-sales"><div className="management-section-head"><div><h2>Recent sales</h2></div><Link href="/sales" className="text-link">View all sales</Link></div><div className="management-table"><div className="management-table-head"><span>Unit</span><span>Purchaser</span><span>Purchase price</span><span>Status</span><span /></div>{sales.slice(0, 6).map((sale) => {const status = saleDisplayStatus(sale);return <Link href={`/sales/${sale.id}`} className="management-sale-row" key={sale.id}><strong>{sale.unit_number || "Pending"}</strong><span>{sale.customer_name}</span><span className="management-price">{money(sale.purchase_price)}</span><span className={`badge ${status.className}`}>{status.label}</span><span>›</span></Link>})}</div></section>
    </div>
  </div>;
}
