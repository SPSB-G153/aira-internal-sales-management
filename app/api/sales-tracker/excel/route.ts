import ExcelJS from "exceljs";
import { getSales } from "@/lib/data/sales";
import { formatTrackerDate, trackerRows } from "@/lib/sales-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = trackerRows(await getSales());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AIRA Residence Sales Management";
  const sheet = workbook.addWorksheet("Sales Tracker", { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells("A1:F1"); sheet.getCell("A1").value = "AIRA RESIDENCE — SALES TRACKER";
  sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFD4AF37" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  sheet.mergeCells("A2:F2"); sheet.getCell("A2").value = `Exported ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date())}`;
  sheet.columns = [{ width: 14 }, { width: 34 }, { width: 29 }, { width: 17 }, { width: 36 }, { width: 18 }];
  const header = sheet.getRow(4); header.values = ["Unit", "Purchaser", "Current Stage", "Key Date", "Next Action", "Status"];
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  rows.forEach((row) => sheet.addRow([row.unit, row.purchaser, row.currentStage, formatTrackerDate(row.keyDate), row.nextAction, row.status]));
  sheet.eachRow((row, number) => { row.alignment = { vertical: "middle", wrapText: true }; if (number >= 4) row.height = 24; });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="AIRA-Sales-Tracker.xlsx"`, "Cache-Control": "no-store" } });
}
