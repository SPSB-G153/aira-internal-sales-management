import ExcelJS from "exceljs";
import { getSales } from "@/lib/data/sales";
import { getDocuments } from "@/lib/data/documents";
import { SALES_TARGET, salesTargetMetrics, formatTrackerDate, formatTrackerMonth, monthlySalesPerformance, trackerRows } from "@/lib/sales-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sales, documents] = await Promise.all([getSales(), getDocuments()]);
  const rows = trackerRows(sales);
  const target = salesTargetMetrics(sales);
  const monthly = monthlySalesPerformance(sales, documents);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AIRA Residence Sales Management";
  const sheet = workbook.addWorksheet("Sales Tracker", { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells("A1:F1"); sheet.getCell("A1").value = "AIRA RESIDENCE — SALES TRACKER";
  sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFD4AF37" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  sheet.mergeCells("A2:F2"); sheet.getCell("A2").value = `Target RM ${SALES_TARGET.managementTarget.toLocaleString("en-MY")}`;
  sheet.mergeCells("A3:F3"); sheet.getCell("A3").value = `Confirmed RM ${target.confirmedValue.toLocaleString("en-MY")} | Balance to target RM ${target.remaining.toLocaleString("en-MY")} | Achievement ${(target.progress * 100).toFixed(1)}%`;
  sheet.columns = [{ width: 14 }, { width: 34 }, { width: 29 }, { width: 17 }, { width: 36 }, { width: 18 }];
  const header = sheet.getRow(5); header.values = ["Unit", "Purchaser", "Current Stage", "Key Date", "Next Action", "Status"];
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  rows.forEach((row) => sheet.addRow([row.unit, row.purchaser, row.currentStage, formatTrackerDate(row.keyDate), row.nextAction, row.status]));
  sheet.eachRow((row, number) => { row.alignment = { vertical: "middle", wrapText: true }; if (number >= 5) row.height = 24; });
  const monthlySheet = workbook.addWorksheet("Monthly Targets", { views: [{ state: "frozen", ySplit: 5 }] });
  monthlySheet.mergeCells("A1:H1"); monthlySheet.getCell("A1").value = "AIRA RESIDENCE — MONTHLY SALES TARGETS";
  monthlySheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFD4AF37" } }; monthlySheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  monthlySheet.mergeCells("A2:H2"); monthlySheet.getCell("A2").value = `Current month target ${monthly.currentTarget} | Actual ${monthly.currentActual} | YTD target ${monthly.ytdTarget} | YTD actual ${monthly.ytdActual}`;
  monthlySheet.mergeCells("A3:H3"); monthlySheet.getCell("A3").value = `Campaign target ${monthly.campaignTarget} units | Actual ${monthly.campaignActual} units`;
  monthlySheet.columns = [{ width: 15 }, { width: 12 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 19 }, { width: 18 }, { width: 13 }];
  const monthlyHeader = monthlySheet.getRow(5); monthlyHeader.values = ["Month", "Tower A Target", "Tower B Target", "Total Target", "Actual Units", "Actual Sales Value", "Actual / Target Cumulative", "Variance"];
  monthlyHeader.font = { bold: true, color: { argb: "FFFFFFFF" } }; monthlyHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111319" } };
  monthly.rows.forEach((row) => monthlySheet.addRow([formatTrackerMonth(row.month), row.towerA, row.towerB, row.targetUnits, row.actualUnits, row.actualValue, `${row.cumulativeActual} / ${row.cumulativeTarget}`, row.variance]));
  monthlySheet.getColumn(6).numFmt = '"RM" #,##0'; monthlySheet.eachRow((row, number) => { row.alignment = { vertical: "middle", wrapText: true }; if (number >= 5) row.height = 24; });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="AIRA-Sales-Tracker.xlsx"`, "Cache-Control": "no-store" } });
}
