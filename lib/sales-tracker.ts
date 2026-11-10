import type { Sale } from "@/lib/types";
import { hasRecordedBookingPayment } from "@/lib/sale-state";

export type TrackerTone = "on-track" | "action" | "pending" | "overdue" | "completed";
export type TrackerRow = {
  id: string;
  unit: string;
  purchaser: string;
  currentStage: string;
  keyDate: string | null;
  nextAction: string;
  status: string;
  tone: TrackerTone;
};

const malaysiaToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const isPast = (date: string | null, today: string) => Boolean(date && date < today);

export function trackerRow(sale: Sale, today = malaysiaToday()): TrackerRow {
  const base = { id: sale.id, unit: sale.unit_number || "Unit pending", purchaser: sale.customer_name };
  if (!hasRecordedBookingPayment(sale)) return { ...base, currentStage: "Booking pending payment", keyDate: sale.sale_date, nextAction: "Upload 2% payment evidence", status: "Pending", tone: "pending" };
  if (sale.status === "hovp_ready" || sale.vacant_possession_delivered_at) return { ...base, currentStage: "HOVP issued", keyDate: sale.vacant_possession_delivered_at, nextAction: "Record handover completion", status: "Completed", tone: "completed" };
  if (sale.balance_purchase_price_received_at) return { ...base, currentStage: "Purchase price settled", keyDate: sale.balance_purchase_price_received_at, nextAction: "Upload clearance letter when received", status: "On Track", tone: "on-track" };
  if (sale.spa_signed_at || sale.status === "spa_signed") {
    if (!sale.balance_deposit_received_at) return { ...base, currentStage: "SPA signed", keyDate: sale.spa_signed_at, nextAction: "Record 8% balance payment", status: "Action Needed", tone: "action" };
    return { ...base, currentStage: "SPA and 10% deposit completed", keyDate: sale.balance_deposit_received_at, nextAction: "Monitor balance settlement", status: "On Track", tone: "on-track" };
  }
  if (sale.spa_signing_scheduled_at) return { ...base, currentStage: "SPA signing scheduled", keyDate: sale.spa_signing_scheduled_at, nextAction: "Record signing and 8% balance", status: isPast(sale.spa_signing_scheduled_at, today) ? "Overdue" : "On Track", tone: isPast(sale.spa_signing_scheduled_at, today) ? "overdue" : "on-track" };
  if (sale.notice_issued_at) {
    const overdue = isPast(sale.spa_signing_due_at, today);
    return { ...base, currentStage: "Notice of Acceptance issued", keyDate: sale.notice_issued_at, nextAction: "Enter SPA signing date", status: overdue ? "Overdue" : "Action Needed", tone: overdue ? "overdue" : "action" };
  }
  return { ...base, currentStage: sale.status === "draft" ? "POP saved" : "Booking confirmed", keyDate: sale.sale_date, nextAction: sale.status === "draft" ? "Upload Booking Form" : "Issue Notice of Acceptance", status: "Action Needed", tone: "action" };
}

export function trackerRows(sales: Sale[]) { return sales.map((sale) => trackerRow(sale)); }

export function trackerSummary(rows: TrackerRow[]) {
  return {
    total: rows.length,
    action: rows.filter((row) => row.tone === "action" || row.tone === "pending" || row.tone === "overdue").length,
    scheduled: rows.filter((row) => row.currentStage === "SPA signing scheduled").length,
    overdue: rows.filter((row) => row.tone === "overdue").length,
  };
}

export function formatTrackerDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
