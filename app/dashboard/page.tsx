import Link from "next/link";
import { getSales } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { getTeamContext } from "@/lib/tenancy";
import { documentNames } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [sales, docs, context] = await Promise.all([getSales(), getDocuments(), getTeamContext()]);
  const confirmed = sales.filter((sale) => sale.status === "confirmed").length;
  const drafts = sales.filter((sale) => sale.status === "draft");
  const documentsToReview = docs.filter((doc) => doc.status !== "reviewed");
  const reviewed = docs.length - documentsToReview.length;
  const activities = [
    ...sales.map((sale) => ({ date: sale.created_at, text: `Sale ${sale.sale_reference} created for ${sale.customer_name}`, href: `/sales/${sale.id}`, kind: "Sale" })),
    ...docs.map((doc) => {
      const sale = sales.find((item) => item.id === doc.sale_id);
      return { date: doc.generated_at ?? doc.created_at, text: `${documentNames[doc.document_type]} ${doc.status} · ${sale?.sale_reference ?? "Sale"}`, href: `/documents/${doc.id}`, kind: "Document" };
    }),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 6);
  const attention = [
    ...drafts.map((sale) => ({ href: `/sales/${sale.id}`, title: sale.customer_name, detail: `${sale.sale_reference} · Complete and confirm this sale`, tone: "amber" })),
    ...documentsToReview.map((doc) => {
      const sale = sales.find((item) => item.id === doc.sale_id);
      return { href: `/documents/${doc.id}`, title: documentNames[doc.document_type], detail: `${sale?.sale_reference ?? "Sale"} · Review document`, tone: "green" };
    }),
  ].slice(0, 6);

  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">{context.team.name}</p><h1>What needs attention today?</h1><p className="subtle">Move each sale from verified details to a reviewed document pack.</p></div><Link href="/sales/new" className="button accent">＋ New sale</Link></div>
    <div className="stats"><div className="card stat"><span className="subtle">Total sales</span><b>{sales.length}</b></div><div className="card stat"><span className="subtle">Confirmed</span><b>{confirmed}</b></div><div className="card stat"><span className="subtle">Drafts</span><b>{drafts.length}</b></div><div className="card stat"><span className="subtle">Reviewed documents</span><b>{reviewed}<small> / {docs.length}</small></b></div></div>
    <div className="dashboard-grid">
      <section className="card detail-card attention-card"><div className="section-heading"><div><p className="eyebrow">Next actions</p><h2>Needs attention</h2></div><span className="count-pill">{attention.length}</span></div>{attention.length ? <div className="attention-list">{attention.map((item, index) => <Link href={item.href} className="attention-row" key={`${item.href}-${index}`}><span className={`attention-dot ${item.tone}`} /><div><strong>{item.title}</strong><small>{item.detail}</small></div><span>›</span></Link>)}</div> : <div className="calm-state"><span>✓</span><div><strong>You’re caught up</strong><p className="subtle">No drafts or generated documents are waiting.</p></div></div>}</section>
      <section className="card detail-card"><div className="section-heading"><div><p className="eyebrow">Recent sales</p><h2>Latest transactions</h2></div><Link href="/sales" className="text-link">View all</Link></div>{sales.length?<div className="sales-list compact-list">{sales.slice(0, 5).map((sale) => <Link href={`/sales/${sale.id}`} className="sale-row" key={sale.id}><div><strong>{sale.customer_name}</strong><small>{sale.sale_reference} · {sale.project_name}</small></div><span className={`badge ${sale.status}`}>{sale.status}</span><span>›</span></Link>)}</div>:<div className="empty"><h3>No bookings yet</h3><p className="subtle">Start with a verified Aira Booking Form when you are ready.</p><Link href="/sales/new" className="button secondary">Create booking</Link></div>}</section>
      <aside className="card detail-card activity-card"><p className="eyebrow">Activity</p><h2>Recent events</h2>{activities.length?<div className="activity-list">{activities.map((activity, index) => <Link href={activity.href} key={`${activity.href}-${index}`}><small>{activity.kind} · {new Date(activity.date).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</small><strong>{activity.text}</strong></Link>)}</div>:<p className="subtle">No activity yet. The workspace is ready for handover.</p>}</aside>
    </div>
  </div>;
}
