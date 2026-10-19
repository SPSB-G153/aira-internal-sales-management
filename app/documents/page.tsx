import Link from "next/link";
import { getDocuments } from "@/lib/data/documents";
import { getSales } from "@/lib/data/sales";
import { documentNames } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [allDocs, sales] = await Promise.all([getDocuments(), getSales()]);
  const salesById = new Map(sales.map((sale) => [sale.id, sale]));
  const docs = allDocs.filter((document) => [
    "acceptance_letter",
    "agent_commission_letter",
    "rebate_letter",
    "inventory_confirmation_letter",
    "hovp_letter",
  ].includes(document.document_type) && (document.document_type !== "hovp_letter" || salesById.get(document.sale_id)?.status === "hovp_ready"));

  return <div className="page">
    <div className="page-header"><div>
      <p className="eyebrow">Document register</p>
      <h1>Generated letters, ready to review.</h1>
      <p className="subtle">Notice of Acceptance, Agent Commission Letter, Rebate Letter, Confirmation of Inventories (when applicable) and HOVP Letter.</p>
    </div></div>
    <div className="card sales-list">{docs.length ? docs.map((document) => {
      const sale = salesById.get(document.sale_id);
      return <Link className="sale-row" href={`/documents/${document.id}`} key={document.id}>
        <div><strong>{documentNames[document.document_type]}</strong><small>{sale?.sale_reference ?? "Unknown sale"}</small></div>
        <div><strong>{sale?.customer_name ?? "—"}</strong><small>{sale?.project_name} · {sale?.unit_number}</small></div>
        <span>{document.generated_at ? new Date(document.generated_at).toLocaleDateString("en-MY") : "Pending"}</span>
        <span className={`badge ${document.status}`}>{document.status}</span><span>›</span>
      </Link>;
    }) : <div className="empty"><h2>No letters yet</h2><p className="subtle">Confirm a sale to generate its letters.</p><Link className="button" href="/sales">View sales</Link></div>}</div>
  </div>;
}
