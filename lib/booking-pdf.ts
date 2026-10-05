import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Content = Record<string, unknown>;
const value = (content: Content, key: string) => String(content[key] ?? "").trim();
const amount = (content: Content, key: string) => typeof content[key] === "number" ? content[key] : Number(content[key] ?? 0) || 0;
const money = (n: number) => new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fit = (text: string, max = 70) => text.length > max ? `${text.slice(0, max - 1)}…` : text;
function amountInWords(amount: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underThousand = (value: number): string => {
    const parts: string[] = [];
    if (value >= 100) parts.push(`${ones[Math.floor(value / 100)]} Hundred`);
    const rest = value % 100;
    if (rest >= 20) parts.push(`${tens[Math.floor(rest / 10)]}${rest % 10 ? ` ${ones[rest % 10]}` : ""}`);
    else if (rest) parts.push(ones[rest]);
    return parts.join(" ");
  };
  const whole = Math.floor(Math.max(0, amount));
  const parts: string[] = [];
  if (whole >= 1_000_000) parts.push(`${underThousand(Math.floor(whole / 1_000_000))} Million`);
  if (whole % 1_000_000 >= 1_000) parts.push(`${underThousand(Math.floor((whole % 1_000_000) / 1_000))} Thousand`);
  if (whole % 1_000) parts.push(underThousand(whole % 1_000));
  return `${parts.join(" ") || "Zero"} Only`;
}

/** Uses the supplied booking form PDF as an A4 background and writes only app data in its existing slots. */
export async function createBookingPdf(template: Uint8Array, content: Content) {
  const pdf = await PDFDocument.load(template);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.08, 0.08, 0.08);
  const write = (pageIndex: number, text: string, x: number, top: number, size = 9, weight = false) => {
    const page = pdf.getPage(pageIndex); page.drawText(fit(text), { x, y: page.getHeight() - top, size, font: weight ? bold : font, color: ink });
  };
  const fillLine = (pageIndex: number, text: string, x: number, top: number, size = 10, fieldWidth = 0) => {
    if (!text) return;
    const page = pdf.getPage(pageIndex); const rendered=fit(text);
    if (fieldWidth) {
      // Replace the template leader with a clean dotted underline. The value
      // remains legible above the line instead of having dots through it.
      page.drawRectangle({ x: x - 2, y: page.getHeight() - top - 6, width: fieldWidth, height: 14, color: rgb(1, 1, 1) });
      const dotSize = 6;
      const dotWidth = font.widthOfTextAtSize(".", dotSize);
      const dotCount = Math.max(0, Math.floor(fieldWidth / dotWidth));
      if (dotCount) page.drawText(".".repeat(dotCount), { x, y: page.getHeight() - top - 8, size: dotSize, font, color: ink });
    }
    page.drawText(rendered,{x,y:page.getHeight()-top,size,font,color:ink});
  };
  const lines = (address: string) => address.split(/\r?\n|,/).map(part => part.trim()).filter(Boolean).slice(0, 4);
  const purchaser1 = value(content, "customer_name"); const purchaser2 = value(content, "customer_name_2");
  const price = amount(content, "purchase_price"); const earnest = price * 0.02; const balance = price * 0.08;
  const address = lines(value(content, "customer_address"));

  // Page 1 cover and offer summary.
  fillLine(0, purchaser1, 88, 253, 10, 185); fillLine(0, purchaser2, 88, 277, 10, 185);
  fillLine(0, value(content, "customer_ic"), 88, 332, 10, 185); fillLine(0, value(content, "customer_ic_2"), 88, 356, 10, 185);
  address.forEach((line, index) => fillLine(0, line, 52, 414 + index * 24, 10, 220));
  // Avoid a clutter of unused dotted rows when the saved address is shorter
  // than the four address lines available in the approved form.
  const addressPage = pdf.getPage(0);
  for (let index = address.length; index < 4; index += 1) {
    const lineTop = 414 + index * 24;
    addressPage.drawRectangle({ x: 45, y: addressPage.getHeight() - lineTop - 12, width: 235, height: 24, color: rgb(1, 1, 1) });
  }
  fillLine(0, value(content, "sale_date"), 88, 513, 10, 185);

  // The cover template has fixed labels. Replace only the blank value area so
  // the unit and purchaser data stay on the same baseline as the template.
  const cover = pdf.getPage(0);
  const clearCover = (top: number, x: number, width: number) =>
    cover.drawRectangle({ x, y: cover.getHeight() - top - 10, width, height: 17, color: rgb(1, 1, 1) });
  clearCover(683, 178, 360);
  write(0, `Parcel No. ${value(content, "unit_number")}, Tower ${value(content, "storey_number")}, Residensi Aira Damansara`, 180, 685, 9, true);
  clearCover(717, 178, 360);
  write(0, `1. ${purchaser1}`, 180, 719, 9, true);
  clearCover(741, 178, 360);
  if (purchaser2) write(0, `2. ${purchaser2}`, 180, 743, 9, true);

  // Page 2 financial clauses. These values always derive from the current purchase price.
  fillLine(1, amountInWords(earnest), 88, 386, 9); fillLine(1, money(earnest), 315, 386, 9);
  fillLine(1, amountInWords(balance), 308, 477, 9); fillLine(1, money(balance), 114, 500, 9);

  // Page 3 signature slots remain deliberately blank for signing.

  // Page 5 Appendix - property and purchaser details from the app.
  const appendixOffset = 24;
  pdf.getPage(4).translateContent(0, -appendixOffset);
  const appendixWrite = (text: string, x: number, top: number, size = 9) => write(4, text, x, top + appendixOffset, size);
  appendixWrite(value(content, "unit_number"), 194, 101); appendixWrite(value(content, "storey_number"), 194, 125); appendixWrite(value(content, "unit_type"), 194, 149);
  appendixWrite(value(content, "floor_area_sqm"), 230, 174); appendixWrite(value(content, "floor_area"), 375, 174); appendixWrite(money(price), 215, 199); appendixWrite(value(content, "car_parking_bay"), 194, 223);
  const purchasers = [
    { name: purchaser1, salutation: value(content, "customer_salutation"), tin: value(content, "customer_tin"), nationality: value(content, "customer_nationality"), sex: value(content, "customer_sex"), race: value(content, "customer_race"), ic: value(content, "customer_ic"), bumi: value(content, "bumi_status") === "true" ? "Yes" : value(content, "bumi_status") === "false" ? "No" : "", occupation: value(content, "customer_occupation"), contact: value(content, "contact_person"), phone: value(content, "customer_phone"), email: value(content, "customer_email"), address: value(content, "customer_address") },
    { name: purchaser2, salutation: value(content, "customer_salutation_2"), tin: value(content, "customer_tin_2"), nationality: value(content, "customer_nationality_2"), sex: value(content, "customer_sex_2"), race: value(content, "customer_race_2"), ic: value(content, "customer_ic_2"), bumi: value(content, "bumi_status_2") === "true" ? "Yes" : value(content, "bumi_status_2") === "false" ? "No" : "", occupation: value(content, "customer_occupation_2"), contact: value(content, "contact_person_2"), phone: value(content, "customer_phone_2"), email: value(content, "customer_email_2"), address: value(content, "customer_address_2") },
  ];
  purchasers.forEach((p, index) => { const top = 340 + index * 23; appendixWrite(p.name, 72, top, 8); appendixWrite(p.salutation, 183, top, 8); appendixWrite(p.tin, 272, top, 8); appendixWrite(p.nationality, 365, top, 8); appendixWrite(p.sex, 440, top, 8); appendixWrite(p.race, 495, top, 8); appendixWrite(p.ic, 72, 478 + index * 23, 8); appendixWrite(p.bumi, 250, 478 + index * 23, 8); appendixWrite(p.occupation, 405, 478 + index * 23, 8); appendixWrite(p.contact, 75, 609 + index * 23, 8); appendixWrite(p.phone, 250, 609 + index * 23, 8); appendixWrite(p.email, 395, 609 + index * 23, 8); lines(p.address).forEach((line, lineIndex) => appendixWrite(line, 75, 690 + index * 70 + lineIndex * 22, 8)); });
  return pdf.save();
}
