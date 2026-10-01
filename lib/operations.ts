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
  { key: "capture", number: "01", title: "POP", owner: "Sales personnel", outcome: "Editable prospect offer proposal", evidence: "Buyer, property, price and proposal recorded", sla: "Same working day" },
  { key: "verify", number: "02", title: "Booking", owner: "Sales personnel", outcome: "Purchaser proceeds and 2% deposit is paid", evidence: "Booking confirmed", sla: "Within 1 working day" },
  { key: "confirm", number: "03", title: "Letters", owner: "Personal Assistant", outcome: "Notice of Acceptance and any Rebate Letter are issued", evidence: "Booking confirmation and issued letters", sla: "After booking" },
  { key: "review", number: "04", title: "SPA", owner: "Personal Assistant / solicitor", outcome: "SPA execution and handover requirements are completed", evidence: "SPA signed; 90% paid and/or foreign consent completed", sla: "As scheduled" },
  { key: "complete", number: "05", title: "HOVP", owner: "Personal Assistant", outcome: "HOVP letter is issued and reviewed", evidence: "HOVP letter printed or reviewed", sla: "Before handover" },
] as const;

export const governanceRules = [
  { control: "Single source", rule: "Sale record is the authority; never retype values into letters.", accountable: "Personal Assistant", proof: "Document snapshots" },
  { control: "Maker-checker", rule: "The person entering details should not be the only reviewer.", accountable: "Personal Assistant / manager", proof: "Reviewed statuses" },
  { control: "Minimum evidence", rule: "Identity, contact, unit, salesperson and sale date must be present.", accountable: "Sales executive", proof: "Readiness score" },
  { control: "Financial guardrail", rule: "Earnest deposit cannot exceed the purchase price.", accountable: "Sales personnel", proof: "Integrity score" },
  { control: "Document sequence", rule: "Issue Notice of Acceptance and any Rebate Letter after booking; issue HOVP only after SPA completion requirements.", accountable: "Personal Assistant", proof: "Letter timestamps" },
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
  const initialLetters = sale.rebate_amount && sale.rebate_amount > 0 ? 2 : 1;
  const expectedLetters = sale.status === "hovp_ready" ? initialLetters + 1 : initialLetters;
  const documentControl = (sale.status !== "draft" ? 5 : 0) + Math.min(generated, 3) * 4 + Math.min(reviewed, 3) * 8/3;
  if (sale.status !== "draft" && generated < expectedLetters) blockers.push(`Generate ${expectedLetters - generated} missing letter${expectedLetters - generated === 1 ? "" : "s"}`);
  if (sale.status === "hovp_ready" && reviewed < expectedLetters) blockers.push(`Review ${expectedLetters - reviewed} letter${expectedLetters - reviewed === 1 ? "" : "s"}`);

  const governance = (present(sale.sale_reference) ? 3 : 0) + (present(sale.salesperson_name) ? 3 : 0) + (present(sale.sale_date) ? 2 : 0) + (depositValid ? 2 : 0);
  const total = dataQuality + financialIntegrity + documentControl + governance;

  let stage: OperatingStage = "capture";
  let nextAction = blockers[0] ?? "Complete the draft";
  if (sale.status === "draft" && dataQuality >= 30 && financialIntegrity === 25) { stage = "verify"; nextAction = "Purchaser proceeds: record the 2% deposit and create the booking"; }
  if (sale.status === "confirmed") { stage = "confirm"; nextAction = "Complete the SPA process, then mark the SPA signed"; }
  if (sale.status === "spa_signed") { stage = "review"; nextAction = "Confirm 90% payment and/or foreign consent, then issue HOVP"; }
  if (sale.status === "hovp_ready") { stage = "complete"; nextAction = reviewed < expectedLetters ? "Review and print the HOVP letter" : "Handover pack is ready"; }

  return { total, dataQuality, financialIntegrity, documentControl, governance, stage, stageLabel: processStages.find((item) => item.key === stage)?.title ?? stage, blockers, nextAction };
}

export function scoreTone(score: number) {
  if (score >= 90) return "strong";
  if (score >= 75) return "watch";
  return "risk";
}
