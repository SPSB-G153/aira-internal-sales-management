import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getDocument } from "@/lib/data/documents";
import { getTeamContext } from "@/lib/tenancy";
import { createPopPdf } from "@/lib/pop-pdf";

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
      agent: [text(content, "salesperson_name"), text(content, "agent_company")].filter(Boolean).join(", "),
      spsb: text(content, "spsb") || "SPSB",
      salesperson: text(content, "salesperson_name"), saleDate: text(content, "sale_date"), purchaser: text(content, "customer_name"), unit: text(content, "unit_number"), unitType: text(content, "unit_type"),
      size: number(content.floor_area), listPrice: number(content.purchase_price), discount: number(content.discount_amount), rebate: number(content.rebate_amount), quotedIdNetSellingPrice: typeof content.quoted_id_net_selling_price === "number" ? content.quoted_id_net_selling_price : null, otherIncentives: number(content.other_incentives), proposalNote: text(content, "pop_proposal_note"), recommendationNote: text(content, "pop_recommendation_note"), feasibilityNote: text(content, "pop_feasibility_note"), commentsNote: text(content, "pop_comments_note"),
    });
    return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="prospect-offer-proposal-form.pdf"', "Cache-Control": "private, no-store" } });
  } catch (error) { console.error("POP PDF export failed", error); return new NextResponse("The POP PDF could not be created.", { status: 500 }); }
}
