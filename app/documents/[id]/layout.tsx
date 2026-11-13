import type { ReactNode } from "react";
import { getDocument } from "@/lib/data/documents";
import { regenerateDocumentToday } from "@/lib/actions/documents";

export default async function DocumentLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);
  const isGeneratedLetter = document.document_type !== "booking_form" && document.document_type !== "pre_booking_form";
  const regenerate = regenerateDocumentToday.bind(null, id, document.sale_id);

  return <>
    {isGeneratedLetter && <form action={regenerate} className="no-print regenerate-letter-date"><button className="button secondary">Regenerate with today&apos;s date</button></form>}
    {children}
  </>;
}
