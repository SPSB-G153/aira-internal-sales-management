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

export const SALES_TARGET = {
  towerAGross: 152_650_000,
  towerBGross: 46_240_000,
  grossApproved: 198_890_000,
  rebateRate: 0.03,
  rebateAmount: 5_966_700,
  netApproved: 192_923_300,
  managementTarget: 190_000_000,
} as const;

export const MONTHLY_SALES_TARGETS = [
  ["2026-11", 2, 1], ["2026-12", 2, 2], ["2027-01", 2, 1], ["2027-02", 1, 1],
  ["2027-03", 2, 1], ["2027-04", 2, 1], ["2027-05", 1, 1], ["2027-06", 1, 1],
  ["2027-07", 1, 1], ["2027-08", 1, 1], ["2027-09", 0, 1], ["2027-10", 0, 1],
  ["2027-11", 0, 1], ["2027-12", 0, 1],
] as const;

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

export function salesTargetMetrics(sales: Sale[]) {
  const confirmedSales = sales.filter((sale) => hasRecordedBookingPayment(sale) && sale.status !== "draft" && sale.status !== "booking_draft");
  const confirmedValue = confirmedSales.reduce((total, sale) => total + sale.purchase_price, 0);
  const pendingValue = sales.filter((sale) => !hasRecordedBookingPayment(sale)).reduce((total, sale) => total + sale.purchase_price, 0);
  const towerAValue = confirmedSales.filter((sale) => sale.unit_number?.toUpperCase().startsWith("A-")).reduce((total, sale) => total + sale.purchase_price, 0);
  const towerBValue = confirmedSales.filter((sale) => sale.unit_number?.toUpperCase().startsWith("B-")).reduce((total, sale) => total + sale.purchase_price, 0);
  const towerAUnits = confirmedSales.filter((sale) => sale.unit_number?.toUpperCase().startsWith("A-")).length;
  const towerBUnits = confirmedSales.filter((sale) => sale.unit_number?.toUpperCase().startsWith("B-")).length;
  const towerATargetUnits = MONTHLY_SALES_TARGETS.reduce((total, [, towerA]) => total + towerA, 0);
  const towerBTargetUnits = MONTHLY_SALES_TARGETS.reduce((total, [, , towerB]) => total + towerB, 0);
  const towerABalanceUnits = Math.max(towerATargetUnits - towerAUnits, 0);
  const towerBBalanceUnits = Math.max(towerBTargetUnits - towerBUnits, 0);
  const remaining = Math.max(SALES_TARGET.managementTarget - confirmedValue, 0);
  const progress = SALES_TARGET.managementTarget ? confirmedValue / SALES_TARGET.managementTarget : 0;
  return { confirmedValue, pendingValue, towerAValue, towerBValue, towerAUnits, towerBUnits, towerATargetUnits, towerBTargetUnits, towerABalanceUnits, towerBBalanceUnits, remaining, progress };
}

export function monthlySalesPerformance(sales: Sale[], today = malaysiaToday()) {
  // Management actuals follow the month the completed booking was recorded in
  // this app. sale_date is the cheque/payment date used by the letters and must
  // not be used to assign a sale to a management reporting month.
  const confirmed = sales.filter((sale) => hasRecordedBookingPayment(sale) && sale.status !== "draft" && sale.status !== "booking_draft" && sale.created_at);
  const actualByMonth = new Map<string, { units: number; value: number }>();
  confirmed.forEach((sale) => {
    const month = sale.created_at.slice(0, 7);
    const current = actualByMonth.get(month) || { units: 0, value: 0 };
    current.units += 1; current.value += sale.purchase_price;
    actualByMonth.set(month, current);
  });
  const targetByMonth = new Map(MONTHLY_SALES_TARGETS.map(([month, towerA, towerB]) => [month, { towerA, towerB }]));
  const months = Array.from(new Set([...targetByMonth.keys(), ...actualByMonth.keys()])).sort();
  let cumulativeTarget = 0, cumulativeActual = 0;
  const rows = months.map((month) => {
    const target = targetByMonth.get(month) || { towerA: 0, towerB: 0 };
    const actual = actualByMonth.get(month) || { units: 0, value: 0 };
    const targetUnits = target.towerA + target.towerB;
    cumulativeTarget += targetUnits; cumulativeActual += actual.units;
    return { month, towerA: target.towerA, towerB: target.towerB, targetUnits, actualUnits: actual.units, actualValue: actual.value, cumulativeTarget, cumulativeActual, variance: actual.units - targetUnits };
  });
  const currentMonth = today.slice(0, 7), currentYear = today.slice(0, 4);
  const current = rows.find((row) => row.month === currentMonth) || { targetUnits: 0, actualUnits: 0 };
  const ytd = rows.filter((row) => row.month.startsWith(currentYear) && row.month <= currentMonth);
  return {
    rows,
    currentMonth,
    currentTarget: current.targetUnits,
    currentActual: current.actualUnits,
    ytdTarget: ytd.reduce((sum, row) => sum + row.targetUnits, 0),
    ytdActual: ytd.reduce((sum, row) => sum + row.actualUnits, 0),
    campaignTarget: MONTHLY_SALES_TARGETS.reduce((sum, [, towerA, towerB]) => sum + towerA + towerB, 0),
    campaignActual: confirmed.length,
  };
}

export function formatTrackerMonth(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

export function formatRinggit(value: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value);
}

export function formatTrackerDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
