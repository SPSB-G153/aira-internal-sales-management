import ExcelJS from "exceljs";
import { getSales } from "@/lib/data/sales";
import { SALES_TARGET, salesTargetMetrics, formatTrackerDate, trackerRows } from "@/lib/sales-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const sales = await getSales();
  const rows = trackerRows(sales);
  const target = salesTargetMetrics(sales);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AIRA Residence Sales Management";
  const sheet = workbook.addWorksheet("Sales Tracker", { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells("A1:F1"); sheet.getCell("A1").value = "AIRA RESIDENCE — SALES TRACKER";
  sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFD4AF37" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  sheet.mergeCells("A2:F2"); sheet.getCell("A2").value = `Approved value RM ${SALES_TARGET.grossApproved.toLocaleString("en-MY")} | Less 3% RM ${SALES_TARGET.rebateAmount.toLocaleString("en-MY")} | Net RM ${SALES_TARGET.netApproved.toLocaleString("en-MY")} | Target RM ${SALES_TARGET.managementTarget.toLocaleString("en-MY")}`;
  sheet.mergeCells("A3:F3"); sheet.getCell("A3").value = `Confirmed RM ${target.confirmedValue.toLocaleString("en-MY")} | Balance to target RM ${target.remaining.toLocaleString("en-MY")} | Achievement ${(target.progress * 100).toFixed(1)}%`;
  sheet.columns = [{ width: 14 }, { width: 34 }, { width: 29 }, { width: 17 }, { width: 36 }, { width: 18 }];
  const header = sheet.getRow(5); header.values = ["Unit", "Purchaser", "Current Stage", "Key Date", "Next Action", "Status"];
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  rows.forEach((row) => sheet.addRow([row.unit, row.purchaser, row.currentStage, formatTrackerDate(row.keyDate), row.nextAction, row.status]));
  sheet.eachRow((row, number) => { row.alignment = { vertical: "middle", wrapText: true }; if (number >= 5) row.height = 24; });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="AIRA-Sales-Tracker.xlsx"`, "Cache-Control": "no-store" } });
}
