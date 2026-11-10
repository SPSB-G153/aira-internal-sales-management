import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSales } from "@/lib/data/sales";
import { SALES_TARGET, salesTargetMetrics, formatTrackerDate, trackerRows, trackerSummary } from "@/lib/sales-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const sales = await getSales(); const rows = trackerRows(sales); const summary = trackerSummary(rows); const target = salesTargetMetrics(sales);
  const pdf = await PDFDocument.create(); const page = pdf.addPage([842, 595]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold); const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const gold = rgb(.83, .69, .22), ink = rgb(.08, .09, .11), grey = rgb(.45, .48, .53), white = rgb(1, 1, 1);
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: white });
  page.drawRectangle({ x: 0, y: 522, width: 842, height: 73, color: ink });
  page.drawText("AIRA RESIDENCE", { x: 36, y: 560, size: 12, font: bold, color: gold });
  page.drawText("SALES TRACKER", { x: 36, y: 535, size: 24, font: bold, color: white });
  const cards = [["TOTAL UNITS", summary.total], ["ACTION REQUIRED", summary.action], ["SPA SCHEDULED", summary.scheduled], ["OVERDUE", summary.overdue]] as const;
  cards.forEach(([label, value], i) => { const x = 36 + i * 195; page.drawRectangle({ x, y: 462, width: 177, height: 42, color: rgb(.96, .95, .92) }); page.drawText(label, { x: x + 10, y: 488, size: 7, font: bold, color: grey }); page.drawText(String(value), { x: x + 10, y: 470, size: 17, font: bold, color: ink }); });
  page.drawText(`TARGET RM ${SALES_TARGET.managementTarget.toLocaleString("en-MY")}  |  CONFIRMED RM ${target.confirmedValue.toLocaleString("en-MY")}  |  BALANCE RM ${target.remaining.toLocaleString("en-MY")}  |  ${(target.progress * 100).toFixed(1)}% ACHIEVED`, { x: 36, y: 442, size: 9, font: bold, color: ink });
  const xs = [36, 110, 300, 445, 520, 720]; const headers = ["UNIT", "PURCHASER", "CURRENT STAGE", "KEY DATE", "NEXT ACTION", "STATUS"];
  headers.forEach((h, i) => page.drawText(h, { x: xs[i], y: 420, size: 7, font: bold, color: grey }));
  const clip = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
  rows.slice(0, 12).forEach((row, index) => { const y = 392 - index * 31; page.drawLine({ start: { x: 36, y: y - 10 }, end: { x: 806, y: y - 10 }, thickness: .5, color: rgb(.85, .85, .85) }); page.drawText(clip(row.unit, 12), { x: xs[0], y, size: 8, font: bold, color: ink }); page.drawText(clip(row.purchaser, 31), { x: xs[1], y, size: 8, font: regular, color: ink }); page.drawText(clip(row.currentStage, 24), { x: xs[2], y, size: 8, font: regular, color: ink }); page.drawText(formatTrackerDate(row.keyDate), { x: xs[3], y, size: 8, font: regular, color: ink }); page.drawText(clip(row.nextAction, 30), { x: xs[4], y, size: 8, font: regular, color: ink }); page.drawText(row.status.toUpperCase(), { x: xs[5], y, size: 7, font: bold, color: row.tone === "overdue" ? rgb(.65, .15, .12) : ink }); });
  page.drawText(`Generated ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date())}`, { x: 36, y: 24, size: 7, font: regular, color: grey });
  const bytes = await pdf.save();
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="AIRA-Sales-Tracker.pdf"`, "Cache-Control": "no-store" } });
}
