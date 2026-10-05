import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PopValues = {
  agent: string;
  spsb: string;
  salesperson: string;
  saleDate: string;
  purchaser: string;
  unit: string;
  unitType: string;
  size: number;
  listPrice: number;
  discount: number;
  rebate: number;
  quotedIdNetSellingPrice: number | null;
  otherIncentives: number;
  proposalNote: string;
  recommendationNote: string;
  feasibilityNote: string;
  commentsNote: string;
};

const money = (value: number) => new Intl.NumberFormat("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0);
const fit = (value: string, max = 52) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
const compactDate = (value: string) => value ? value.split("-").reverse().map((part, index) => index === 2 ? part.slice(-2) : part).join(".") : "";

/**
 * Uses the approved A-15-03 form itself as the artwork. Only its variable
 * cells are cleared and overlaid, so printing stays on the supplied A4 layout.
 */
export async function createPopPdf(template: Uint8Array, values: PopValues) {
  const pdf = await PDFDocument.load(template, { ignoreEncryption: true });
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageHeight = page.getHeight();
  const y = (top: number) => pageHeight - top / 2;
  const white = rgb(1, 1, 1);
  const formGrey = rgb(0.94, 0.94, 0.93);
  const ink = rgb(0.13, 0.13, 0.13);

  const clear = (x: number, top: number, width: number, height: number, color = white) => page.drawRectangle({ x: x / 2, y: y(top + height), width: width / 2, height: height / 2, color });
  const write = (value: string, x: number, top: number, size = 8, weight = false) => page.drawText(fit(value), { x: x / 2, y: y(top), size, font: weight ? bold : font, color: ink });
  const writeNote = (value: string, x: number, top: number, maxChars = 58) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, 7).forEach((lineText, index) => write(lineText, x, top + index * 15, 6.5));
  };
  const rule = (x1: number, x2: number, top: number) => page.drawLine({ start: { x: x1 / 2, y: y(top) }, end: { x: x2 / 2, y: y(top) }, thickness: 0.45, color: ink });
  const box = (x: number, top: number, width: number, height: number) => page.drawRectangle({ x: x / 2, y: y(top + height), width: width / 2, height: height / 2, borderColor: ink, borderWidth: 0.6 });

  // The approved example centres SALES. For the live print layout, keep both
  // headings aligned on the left as requested.
  clear(375, 55, 220, 90);
  write("SALES", 140, 108, 16);

  const spaPrice = Math.max(0, values.listPrice - values.discount);
  const netPrice = Math.max(0, spaPrice - values.rebate);
  const totalIncentives = values.discount + values.rebate + values.otherIncentives;
  const listPsf = values.size ? values.listPrice / values.size : 0;
  const spaPsf = values.size ? spaPrice / values.size : 0;
  const netPsf = values.size ? netPrice / values.size : 0;

  // Entry cells in the approved layout.
  // Keep the approved template's box borders and shaded Purchaser / Unit cells.
  // We erase only the prior sample values inside those original cells.
  [[491, 237, 585, 36], [491, 295, 585, 36], [491, 356, 585, 36], [491, 524, 167, 30], [491, 569, 167, 30]].forEach(([x, top, width, height]) => clear(x, top, width, height));
  clear(491, 420, 585, 40, formGrey);
  clear(491, 477, 167, 30, formGrey);
  // Clearing the supplied scan also clears its faint vertical edges. Restore
  // every data cell as a closed rule box so printed values stay contained.
  [[491, 237, 585, 36], [491, 295, 585, 36], [491, 356, 585, 36], [491, 420, 585, 40], [491, 477, 167, 30], [491, 524, 167, 30], [491, 569, 167, 30]].forEach(([x, top, width, height]) => box(x, top, width, height));
  write(values.agent || "", 526, 260, 8, true);
  write(values.spsb || "", 526, 318, 8, true);
  write(values.salesperson || "", 526, 380, 8, true);
  write(values.purchaser || "", 526, 444, 8, true);
  write(values.unit || "", 544, 499, 8, true);
  write(values.unitType || "", 544, 546, 8, true);
  write(values.size ? money(values.size) : "", 553, 590, 8);

  // Amounts: List - Discount = SPA; SPA - Rebate = proposed net; all
  // incentives are calculated from the three entered incentive values.
  [[540, 612], [540, 647], [540, 680], [540, 767], [540, 812], [540, 860], [540, 906]].forEach(([x, top]) => clear(x, top, 138, 44));
  write(money(values.listPrice), 565, 646, 8);
  write(money(values.discount), 565, 678, 8);
  write(money(spaPrice), 565, 710, 8);
  write(money(values.rebate), 565, 797, 8);
  write(money(netPrice), 565, 845, 8, true);
  write(money(values.otherIncentives), 565, 891, 8);
  write(money(totalIncentives), 565, 936, 8, true);
  // Clear the old purchaser's psf and percentage annotations from the scanned
  // approved copy, then derive them from the current app values.
  clear(702, 620, 188, 38); clear(702, 652, 200, 40); clear(702, 682, 188, 38); clear(702, 765, 200, 52); clear(702, 820, 188, 40);
  write(listPsf ? `(RM${money(listPsf)} psf)` : "", 706, 646, 7);
  write("'A'", 706, 677, 7);
  write(spaPsf ? `(RM${money(spaPsf)} psf)` : "", 706, 710, 7);
  write("'B'", 706, 797, 7);
  write(netPsf ? `(RM${money(netPsf)} psf)` : "", 706, 845, 7);

  // The reference is an approved copy containing another purchaser's
  // signatures and notes. A new POP must start with these approval sections blank.
  clear(80, 970, 420, 680);
  clear(470, 970, 620, 680);
  write("1. SBDM/BDM's Proposal:", 135, 1000, 7, true);
  write("2. Recommendation:", 135, 1175, 7, true);
  write("3. Feasibility Check:", 135, 1360, 7, true);
  write("4. Comments/Approval:", 135, 1515, 7, true);
  rule(135, 455, 1090); rule(135, 455, 1270); rule(135, 455, 1450); rule(135, 455, 1600);
  write("SBDM/BDM Signature", 135, 1110, 6); write("Date", 400, 1110, 6);
  write(values.salesperson || "N/A", 135, 1134, 6, true); write(compactDate(values.saleDate), 400, 1134, 6);
  write("Head of Sales", 135, 1290, 6); write("Date", 400, 1290, 6);
  write("N/A", 135, 1314, 6, true);
  write("Director of Property", 135, 1470, 6); write("Date", 400, 1470, 6); write(compactDate(values.saleDate), 400, 1494, 6);
  write("Director of Property", 135, 1620, 6); write("Date", 400, 1620, 6); write(compactDate(values.saleDate), 400, 1644, 6);
  writeNote(values.proposalNote, 510, 1010);
  writeNote(values.recommendationNote, 510, 1175);
  writeNote(values.feasibilityNote, 510, 1345, 24);
  writeNote(values.commentsNote, 510, 1520);
  write("Within the Global Discount + Gift Budget", 675, 1360, 6);
  write("(as shown attached)", 675, 1374, 5.5);
  write("Outside the Global Discount + Gift Budget", 675, 1445, 6);
  write("(as shown attached)", 675, 1459, 5.5);
  box(490, 980, 586, 150); box(490, 1145, 586, 155); box(490, 1330, 166, 52); box(490, 1415, 166, 52); box(490, 1490, 586, 160);
  // Continue the form's gold left border through the approval block.
  page.drawLine({ start: { x: 90 / 2, y: y(970) }, end: { x: 90 / 2, y: y(1680) }, thickness: 1.2, color: rgb(0.83, 0.64, 0.02) });

  pdf.setTitle("Prospect Offer Proposal Form");
  return pdf.save();
}
