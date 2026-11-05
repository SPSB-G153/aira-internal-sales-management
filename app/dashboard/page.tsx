import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { documentNames } from "@/lib/types";
import { hasRecordedBookingPayment, saleDisplayStatus } from "@/lib/sale-state";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [sales, allDocs] = await Promise.all([getSales(), getDocuments()]);
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const docs = allDocs.filter((document) => {
    const sale = salesById.get(document.sale_id);
    return (document.document_type !== "acceptance_letter" || Boolean(sale && hasRecordedBookingPayment(sale))) &&
      (document.document_type !== "hovp_letter" || sale?.status === "hovp_ready");
  });
  const confirmed = sales.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && hasRecordedBookingPayment(sale)).length;
  const pendingPayment = sales.filter((sale) => (sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale));
  const drafts = sales.filter((sale) => sale.status === "draft" || sale.status === "booking_draft");
  const reviewableDocs = docs.filter((doc) => doc.document_type !== "booking_form");
  const documentsToReview = reviewableDocs.filter((doc) => doc.status !== "reviewed");
  const lettersReady = reviewableDocs.length;
  const attention = [
    ...pendingPayment.map((sale) => ({ href: `/sales/${sale.id}`, title: sale.unit_number || sale.customer_name, detail: `${sale.customer_name} · Upload 2% payment`, tone: "amber" })),
    ...drafts.map((sale) => ({ href: `/sales/${sale.id}`, title: sale.customer_name, detail: `${sale.sale_reference} · Complete and confirm this sale`, tone: "amber" })),
    ...documentsToReview.map((doc) => {
      const sale = sales.find((item) => item.id === doc.sale_id);
      return { href: `/documents/${doc.id}`, title: documentNames[doc.document_type], detail: `${sale?.sale_reference ?? "Sale"} · Review document`, tone: "green" };
    }),
  ].slice(0, 6);

  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">Sales overview</p><h1>Your sales at a glance.</h1><p className="subtle">See what is confirmed, what is waiting for payment and which letters are ready.</p></div><Link href="/sales/new" className="button accent">＋ New sale</Link></div>
    <div className="stats"><div className="card stat"><span className="subtle">Total units</span><b>{sales.length}</b></div><div className="card stat"><span className="subtle">Pending payment</span><b>{pendingPayment.length}</b></div><div className="card stat"><span className="subtle">Confirmed</span><b>{confirmed}</b></div><div className="card stat"><span className="subtle">Letters ready</span><b>{lettersReady}</b></div></div>
    <div className="dashboard-grid">
      <section className="card detail-card attention-card"><div className="section-heading"><div><p className="eyebrow">Next actions</p><h2>Needs attention</h2></div><span className="count-pill">{attention.length}</span></div>{attention.length ? <div className="attention-list">{attention.map((item, index) => <Link href={item.href} className="attention-row" key={`${item.href}-${index}`}><span className={`attention-dot ${item.tone}`} /><div><strong>{item.title}</strong><small>{item.detail}</small></div><span>›</span></Link>)}</div> : <div className="calm-state"><span>✓</span><div><strong>You’re caught up</strong><p className="subtle">No drafts or generated documents are waiting.</p></div></div>}</section>
      <section className="card detail-card"><div className="section-heading"><div><p className="eyebrow">Recent sales</p><h2>Latest transactions</h2></div><Link href="/sales" className="text-link">View all</Link></div>{sales.length?<div className="sales-list compact-list">{sales.slice(0, 5).map((sale) => {const displayStatus=saleDisplayStatus(sale);return <Link href={`/sales/${sale.id}`} className="sale-row" key={sale.id}><div><small className="transaction-unit">{sale.unit_number || "Unit pending"}</small><strong>{sale.customer_name}</strong></div><span className={`badge ${displayStatus.className}`}>{displayStatus.label}</span><span>›</span></Link>})}</div>:<div className="empty"><h3>No bookings yet</h3><p className="subtle">Start with a verified Aira Booking Form when you are ready.</p><Link href="/sales/new" className="button secondary">Create booking</Link></div>}</section>
    </div>
  </div>;
}
