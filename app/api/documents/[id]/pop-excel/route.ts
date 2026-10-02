import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import { getDocument } from "@/lib/data/documents";
import { getTeamContext } from "@/lib/tenancy";

export const runtime = "nodejs";

const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const text = (content: Record<string, unknown>, key: string) => String(content[key] ?? "").trim();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await getTeamContext();
  if (role !== "owner") return new NextResponse("Only the workspace owner can download POP Excel files.", { status: 403 });
  try {
    const { id } = await params;
    const document = await getDocument(id);
    if (document.document_type !== "pre_booking_form") return new NextResponse("This export is only available for POP.", { status: 400 });

    const content = document.content;
    const price = number(content.purchase_price);
    const rebate = number(content.rebate_amount);
    const area = number(content.floor_area);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(process.cwd(), "public", "templates", "pop-format.xlsx"));
    const sheet = workbook.worksheets[0];
    const agent = [text(content, "salesperson_name"), text(content, "agent_company")].filter(Boolean).join(", ");

    sheet.getCell("E5").value = agent || "AGENT";
    sheet.getCell("E7").value = "SPSB";
    sheet.getCell("G9").value = text(content, "salesperson_name");
    sheet.getCell("G11").value = text(content, "customer_name");
    sheet.getCell("G13").value = text(content, "unit_number");
    sheet.getCell("G15").value = text(content, "unit_type");
    sheet.getCell("G17").value = area || null;
    sheet.getCell("H19").value = price;
    sheet.getCell("H20").value = 0;
    sheet.getCell("H21").value = { formula: "H19-H20" };
    sheet.getCell("H24").value = rebate;
    sheet.getCell("H26").value = { formula: "H21-H24" };
    sheet.getCell("H28").value = { formula: "H26" };
    sheet.getCell("H30").value = 0;
    sheet.getCell("H31").value = { formula: "H20+H24+H30" };
    for (const cell of ["H19", "H20", "H21", "H24", "H26", "H28", "H30", "H31"]) sheet.getCell(cell).numFmt = '#,##0.00';
    sheet.pageSetup.paperSize = 9;
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 1;
    sheet.pageSetup.orientation = "portrait";
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.calcProperties.forceFullCalc = true;

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="pop.xlsx"', "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("The POP Excel file could not be created.", { status: 500 });
  }
}
