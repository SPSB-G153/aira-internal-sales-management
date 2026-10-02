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
  const fillLine = (pageIndex: number, text: string, x: number, top: number, size = 9) => {
    const page = pdf.getPage(pageIndex); const rendered=fit(text); const width=font.widthOfTextAtSize(rendered,size)+3;
    page.drawRectangle({x:x-1,y:page.getHeight()-top-2,width,height:size+4,color:rgb(1,1,1)});
    page.drawText(rendered,{x,y:page.getHeight()-top,size,font,color:ink});
  };
  const lines = (address: string) => address.split(/\r?\n|,/).map(part => part.trim()).filter(Boolean).slice(0, 4);
  const purchaser1 = value(content, "customer_name"); const purchaser2 = value(content, "customer_name_2");
  const price = amount(content, "purchase_price"); const earnest = price * 0.02; const balance = price * 0.08;
  const address = lines(value(content, "customer_address"));

  // Page 1 cover and offer summary.
  fillLine(0, purchaser1, 88, 258); fillLine(0, purchaser2, 88, 282);
  fillLine(0, value(content, "customer_ic"), 88, 337); fillLine(0, value(content, "customer_ic_2"), 88, 361);
  address.forEach((line, index) => fillLine(0, line, 52, 419 + index * 24));
  write(0, value(content, "sale_date"), 88, 516);
  write(0, value(content, "unit_number"), 235, 694, 8, true); write(0, value(content, "storey_number"), 352, 694, 8, true);
  write(0, purchaser1, 180, 728, 8, true); write(0, purchaser2, 180, 752, 8, true);

  // Page 2 financial clauses. These values always derive from the current purchase price.
  fillLine(1, amountInWords(earnest), 88, 386, 9); fillLine(1, money(earnest), 315, 386, 9);
  fillLine(1, amountInWords(balance), 308, 477, 9); fillLine(1, money(balance), 114, 500, 9);

  // Page 3 signature slots remain deliberately blank for signing.

  // Page 5 Appendix - property and purchaser details from the app.
  write(4, value(content, "unit_number"), 194, 101); write(4, value(content, "storey_number"), 194, 125); write(4, value(content, "unit_type"), 194, 149);
  write(4, value(content, "floor_area_sqm"), 230, 174); write(4, value(content, "floor_area"), 375, 174); write(4, money(price), 215, 199); write(4, value(content, "car_parking_bay"), 194, 223);
  const purchasers = [
    { name: purchaser1, salutation: value(content, "customer_salutation"), tin: value(content, "customer_tin"), nationality: value(content, "customer_nationality"), sex: value(content, "customer_sex"), race: value(content, "customer_race"), ic: value(content, "customer_ic"), bumi: value(content, "bumi_status") === "true" ? "Yes" : value(content, "bumi_status") === "false" ? "No" : "", occupation: value(content, "customer_occupation"), contact: value(content, "contact_person"), phone: value(content, "customer_phone"), email: value(content, "customer_email"), address: value(content, "customer_address") },
    { name: purchaser2, salutation: value(content, "customer_salutation_2"), tin: value(content, "customer_tin_2"), nationality: value(content, "customer_nationality_2"), sex: value(content, "customer_sex_2"), race: value(content, "customer_race_2"), ic: value(content, "customer_ic_2"), bumi: value(content, "bumi_status_2") === "true" ? "Yes" : value(content, "bumi_status_2") === "false" ? "No" : "", occupation: value(content, "customer_occupation_2"), contact: value(content, "contact_person_2"), phone: value(content, "customer_phone_2"), email: value(content, "customer_email_2"), address: value(content, "customer_address_2") },
  ];
  purchasers.forEach((p, index) => { const top = 340 + index * 23; write(4, p.name, 72, top, 8); write(4, p.salutation, 183, top, 8); write(4, p.tin, 272, top, 8); write(4, p.nationality, 365, top, 8); write(4, p.sex, 440, top, 8); write(4, p.race, 495, top, 8); write(4, p.ic, 72, 478 + index * 23, 8); write(4, p.bumi, 250, 478 + index * 23, 8); write(4, p.occupation, 405, 478 + index * 23, 8); write(4, p.contact, 75, 609 + index * 23, 8); write(4, p.phone, 250, 609 + index * 23, 8); write(4, p.email, 395, 609 + index * 23, 8); lines(p.address).forEach((line, lineIndex) => write(4, line, 75, 690 + index * 70 + lineIndex * 22, 8)); });
  return pdf.save();
}
