import type { Sale, SaleDocument } from "@/lib/types";

export type OperatingStage = "capture" | "verify" | "confirm" | "review" | "complete";

export interface SaleScore {
  total: number;
  dataQuality: number;
  financialIntegrity: number;
  documentControl: number;
  governance: number;
  stage: OperatingStage;
  stageLabel: string;
  blockers: string[];
  nextAction: string;
}

export const processStages = [
  { key: "capture", number: "01", title: "Capture", owner: "Sales executive", outcome: "A complete draft from one source", evidence: "Buyer, property, price and owner recorded", sla: "Same working day" },
  { key: "verify", number: "02", title: "Verify", owner: "Sales admin", outcome: "Booking details are internally consistent", evidence: "Identity, contact, unit and price checked", sla: "Within 1 working day" },
  { key: "confirm", number: "03", title: "Confirm", owner: "Admin / manager", outcome: "A controlled transaction record", evidence: "Booking confirmed and three source documents generated", sla: "After verification" },
  { key: "review", number: "04", title: "Review", owner: "Sales admin / PA", outcome: "Every required document reviewed", evidence: "Three documents marked reviewed", sla: "Within 1 working day" },
  { key: "complete", number: "05", title: "Complete", owner: "Sales admin", outcome: "Audit-ready document pack", evidence: "100% reviewed with no score blockers", sla: "Before handover" },
] as const;

export const governanceRules = [
  { control: "Single source", rule: "Sale record is the authority; never retype values into letters.", accountable: "Sales admin", proof: "Document snapshots" },
  { control: "Maker-checker", rule: "The person entering details should not be the only reviewer.", accountable: "Admin / manager", proof: "Reviewed statuses" },
  { control: "Minimum evidence", rule: "Identity, contact, unit, salesperson and sale date must be present.", accountable: "Sales executive", proof: "Readiness score" },
  { control: "Financial guardrail", rule: "Earnest deposit cannot exceed the purchase price.", accountable: "Sales admin", proof: "Integrity score" },
  { control: "Document completeness", rule: "A confirmed booking requires the three uploaded-source documents.", accountable: "Sales admin / PA", proof: "Document pack" },
  { control: "Exception escalation", rule: "Scores below 75 or any blocker require correction before completion.", accountable: "Manager", proof: "Exception queue" },
] as const;

const present = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== "";

export function scoreSale(sale: Sale, documents: SaleDocument[]): SaleScore {
  const blockers: string[] = [];
  const qualityChecks = [
    [present(sale.customer_ic), "Add IC / passport"],
    [present(sale.customer_phone) || present(sale.customer_email), "Add buyer contact"],
    [present(sale.customer_address), "Add buyer address"],
    [present(sale.unit_number), "Add unit number"],
    [present(sale.unit_type), "Add unit type"],
    [present(sale.floor_area), "Add floor area"],
    [present(sale.salesperson_name), "Assign salesperson"],
    [present(sale.sale_date), "Add sale date"],
  ] as const;
  qualityChecks.forEach(([ok, message]) => { if (!ok) blockers.push(message); });
  const dataQuality = qualityChecks.filter(([ok]) => ok).length * 5;

  const depositValid = sale.booking_fee == null || sale.booking_fee <= sale.purchase_price;
  if (!depositValid) blockers.push("Earnest deposit exceeds purchase price");
  const financialIntegrity = [sale.purchase_price > 0, depositValid].filter(Boolean).length * 12.5;

  const generated = new Set(documents.map((doc) => doc.document_type)).size;
  const reviewed = documents.filter((doc) => doc.status === "reviewed").length;
  const documentControl = (sale.status === "confirmed" ? 5 : 0) + Math.min(generated, 3) * 4 + Math.min(reviewed, 3) * 8/3;
  if (sale.status === "confirmed" && generated < 3) blockers.push(`Generate ${3 - generated} missing document${3 - generated === 1 ? "" : "s"}`);
  if (sale.status === "confirmed" && reviewed < 3) blockers.push(`Review ${3 - reviewed} document${3 - reviewed === 1 ? "" : "s"}`);

  const governance = (present(sale.sale_reference) ? 3 : 0) + (present(sale.salesperson_name) ? 3 : 0) + (present(sale.sale_date) ? 2 : 0) + (depositValid ? 2 : 0);
  const total = dataQuality + financialIntegrity + documentControl + governance;

  let stage: OperatingStage = "capture";
  let nextAction = blockers[0] ?? "Complete the draft";
  if (sale.status === "draft" && dataQuality >= 30 && financialIntegrity === 25) { stage = "verify"; nextAction = "Verify details, then confirm the booking"; }
  if (sale.status === "confirmed") { stage = "review"; nextAction = reviewed < 3 ? "Review and print the outstanding documents" : "Resolve remaining score exceptions"; }
  if (sale.status === "confirmed" && generated === 3 && reviewed === 3 && total >= 95) { stage = "complete"; nextAction = "Archive the audit-ready pack"; }

  return { total, dataQuality, financialIntegrity, documentControl, governance, stage, stageLabel: processStages.find((item) => item.key === stage)?.title ?? stage, blockers, nextAction };
}

export function scoreTone(score: number) {
  if (score >= 90) return "strong";
  if (score >= 75) return "watch";
  return "risk";
}
