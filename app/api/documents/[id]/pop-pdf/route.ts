import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getDocument } from "@/lib/data/documents";
import { getTeamContext } from "@/lib/tenancy";
import { createPopPdf } from "@/lib/pop-pdf";
import { downloadFilename } from "@/lib/download-filename";

export const runtime = "nodejs";

const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const text = (content: Record<string, unknown>, key: string) => String(content[key] ?? "").trim();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTeamContext();
  if (!context.isDemo && !context.role) return new NextResponse("Sign in to print the POP PDF.", { status: 403 });
  try {
    const { id } = await params;
    const document = await getDocument(id);
    if (document.document_type !== "pre_booking_form") return new NextResponse("This export is only available for POP.", { status: 400 });
    const content = document.content;
    const bytes = await createPopPdf(await readFile(path.join(process.cwd(), "public", "templates", "approved-pop.pdf")), {
      agent: text(content, "pop_introduction_agent") || "NOT APPLICABLE",
      spsb: text(content, "pop_introduction_spsb") || "DIRECT SALES",
      salesperson: text(content, "salesperson_name"), secondAssistant: text(content, "pop_assisting_member_2"), saleDate: text(content, "sale_date"), purchaser: text(content, "customer_name"), unit: text(content, "unit_number"), unitType: text(content, "unit_type").toUpperCase(),
      size: number(content.floor_area), approvedPrice: number(content.approved_selling_price) || number(content.purchase_price), proposedPrice: number(content.purchase_price), additionalRevenue: number(content.additional_revenue), discount: number(content.repeat_buyer_discount), rebate: number(content.rebate_amount), proposalNote: text(content, "pop_proposal_note"), conditionsNote: text(content, "pop_conditions_note"), commentsNote: text(content, "pop_comments_note"),
    });
    const filename=downloadFilename("prospect-offer-proposal-form","pdf",content);
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { console.error("POP PDF export failed", error); return new NextResponse("The POP PDF could not be created.", { status: 500 }); }
}
