import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Content = Record<string, unknown>;
const value = (content: Content, key: string) => String(content[key] ?? "").trim();
const amount = (content: Content, key: string) => typeof content[key] === "number" ? content[key] : Number(content[key] ?? 0) || 0;
const money = (n: number) => new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const towerFromUnit = (unit: string) => {
  const tower = unit.split("-")[0]?.toUpperCase();
  return tower === "A" || tower === "B" ? tower : "";
};
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
  const fillLine = (pageIndex: number, text: string, x: number, top: number, size = 10, fieldWidth = 0, rise = 0) => {
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
    page.drawText(rendered,{x,y:page.getHeight()-top+rise,size,font,color:ink});
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
  const unitNumber = value(content, "unit_number");
  const tower = towerFromUnit(unitNumber);
  write(0, `Parcel No. ${unitNumber}${tower ? `, Tower ${tower}` : ""}, Residensi Aira Damansara`, 180, 685, 9, true);
  clearCover(717, 178, 360);
  write(0, `1. ${purchaser1}`, 180, 719, 9, true);
  clearCover(741, 178, 360);
  if (purchaser2) write(0, `2. ${purchaser2}`, 180, 743, 9, true);

  // Page 2 financial clauses. These values always derive from the current purchase price.
  fillLine(1, amountInWords(earnest), 88, 386, 9, 0, 2); fillLine(1, money(earnest), 315, 386, 9, 0, 2);
  // The Balance Deposit number belongs in the (RM …) blank immediately below
  // the amount in words. Keeping it on that line avoids the clause heading.
  fillLine(1, amountInWords(balance), 359, 477, 9); fillLine(1, money(balance), 114, 489, 9, 0, 2);
  const paymentReference = value(content, "payment_reference");
  if (paymentReference) {
    // Match the Date field: start with the saved value, then preserve a
    // continuous dotted leader across the rest of the approved blank.
    fillLine(1, paymentReference, 233, 408, 8, 116, -4);
  }

  // Page 3 signature slots remain deliberately blank for signing.

  // Page 5 Appendix - redraw this page on one coordinate grid. The supplied
  // background mixes centred placeholders and incompatible title insets.
  pdf.removePage(4);
  const appendixPage = pdf.addPage([595.28, 841.89]);
  // translateContent also affects subsequent drawing operations, so values
  // retain their template coordinates and move together with the table.
  const appendixWrite = (text: string, x: number, top: number, size = 8, weight = false) => appendixPage.drawText(fit(text), { x, y: appendixPage.getHeight() - top, size, font: weight ? bold : font, color: ink });
  // One line, one type size, and one left inset for every value. This keeps
  // the appendix simple and avoids turning a purchaser name into a block.
  const appendixTextSize = 8.5;
  const appendixCell = (text: string, x: number, top: number, _width: number, size = appendixTextSize) => {
    if (!text) return;
    appendixWrite(text, x, top, size);
  };
  // These offsets use the centred Part C row as the visual reference.  Each
  // section's printed grid has a slightly different row height, so a single
  // raw coordinate would leave some values visibly high in their cell.
  const left = 46; const right = 549; const row = 23; const line = (x1:number, y1:number, x2:number, y2:number) => appendixPage.drawLine({ start:{x:x1,y:appendixPage.getHeight()-y1}, end:{x:x2,y:appendixPage.getHeight()-y2}, thickness:0.6, color:ink });
  const box = (top:number, height:number, cols:number[]) => { line(left,top,right,top); line(left,top+height,right,top+height); line(left,top,left,top+height); line(right,top,right,top+height); cols.forEach(x=>line(x,top,x,top+height)); };
  const header = (text:string, top:number, height:number) => { appendixPage.drawRectangle({x:left,y:appendixPage.getHeight()-top-height,width:right-left,height,color:rgb(.75,.75,.75)}); box(top,height,[]); appendixWrite(text, (left+right-font.widthOfTextAtSize(text,9))/2, top+15,9,true); };
  appendixWrite("APPENDIX", 260, 55, 9, true);
  header("PROPERTY DETAILS", 70, 20); box(90, row*6, [67,190,208]);
  ["Parcel No.","Storey No.","Type","Area","Purchase Price","Car Parking Bay"].forEach((label,i)=>{ const top=90+i*row; line(left,top+row,right,top+row); appendixWrite(`${i+1}.`,55,top+15,8); appendixWrite(label,74,top+15,8); appendixWrite(":",198,top+15,8); });
  const propertyValues=[value(content,"unit_number"),value(content,"storey_number"),value(content,"unit_type"),`${value(content,"floor_area_sqm")} square metres / ${value(content,"floor_area")} square feet`, `RM ${money(price)}`, value(content,"car_parking_bay")];
  propertyValues.forEach((text,i)=>appendixCell(text,216,105+i*row,320));
  const purchasers = [
    { name: purchaser1, salutation: value(content, "customer_salutation"), tin: value(content, "customer_tin"), nationality: value(content, "customer_nationality"), sex: value(content, "customer_sex"), race: value(content, "customer_race"), ic: value(content, "customer_ic"), bumi: value(content, "bumi_status") === "true" ? "Yes" : value(content, "bumi_status") === "false" ? "No" : "", occupation: value(content, "customer_occupation"), contact: value(content, "contact_person"), phone: value(content, "customer_phone"), email: value(content, "customer_email"), address: value(content, "customer_address") },
    { name: purchaser2, salutation: value(content, "customer_salutation_2"), tin: value(content, "customer_tin_2"), nationality: value(content, "customer_nationality_2"), sex: value(content, "customer_sex_2"), race: value(content, "customer_race_2"), ic: value(content, "customer_ic_2"), bumi: value(content, "bumi_status_2") === "true" ? "Yes" : value(content, "bumi_status_2") === "false" ? "No" : "", occupation: value(content, "customer_occupation_2"), contact: value(content, "contact_person_2"), phone: value(content, "customer_phone_2"), email: value(content, "customer_email_2"), address: value(content, "customer_address_2") },
  ];
  header("PURCHASER'S PARTICULARS", 242, 20);
  box(262, 116, [67,190,260,340,408,465,503]);
  ["A.","Purchaser's Name","Salutation","TIN No.","Nationality","Sex (F / M)","Race"].forEach((label,i)=>appendixWrite(label, [52,74,195,265,345,413,470][i], 278, 8, true));
  [0,1,2,3].forEach(i=>line(left,308+i*23,right,308+i*23));
  header("PURCHASER IDENTIFICATION", 388, 20);
  box(408, 112, [67,190,365]);
  appendixWrite("B.",52,424,8,true); appendixWrite("NRIC / Passport / Company Registration No.",74,424,8,true); appendixWrite("Bumi Status",245,424,8,true); appendixWrite("Occupation",410,424,8,true);
  [0,1,2,3].forEach(i=>line(left,428+i*23,right,428+i*23));
  header("CONTACT PARTICULARS", 530, 20);
  box(550, 66, [67,190,365,450]);
  ["C.","Contact Person's Name","Mobile No.","Office No.","Email Address"].forEach((label,i)=>appendixWrite(label,[52,74,210,370,455][i],566,8,true));
  line(left,590,right,590);
  header("CORRESPONDENCE ADDRESS", 626, 20);
  box(646, 112, [67]); appendixWrite("D.",52,662,8,true); appendixWrite("Correspondence Address",74,662,8,true);
  const appendixFirstColumnX = 74;
  purchasers.forEach((p, index) => { const purchaserTop = 323 + index * 23; const registrationTop = 443 + index * 23; const contactTop = 605 + index * 23; appendixCell(p.name, appendixFirstColumnX, purchaserTop, 112); appendixCell(p.salutation, 195, purchaserTop, 78); appendixCell(p.tin, 265, purchaserTop, 82); appendixCell(p.nationality, 345, purchaserTop, 66); appendixCell(p.sex, 413, purchaserTop, 45); appendixCell(p.race, 470, purchaserTop, 35); appendixCell(p.ic, appendixFirstColumnX, registrationTop, 102); appendixCell(p.bumi, 198, registrationTop, 165); appendixCell(p.occupation, 370, registrationTop, 165); appendixCell(p.contact, appendixFirstColumnX, contactTop, 102); appendixCell(p.phone, 210, contactTop, 165); appendixCell(p.email, 455, contactTop, 82); });
  // The supplied form has one singular Correspondence Address section. It
  // therefore uses the primary purchaser's saved address and never writes a
  // second address past the bottom border of the Appendix.
  lines(value(content, "customer_address")).forEach((line, lineIndex) => appendixCell(line, appendixFirstColumnX, 678 + lineIndex * 23, 430));
  return pdf.save();
}
