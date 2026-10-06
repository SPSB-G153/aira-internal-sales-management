import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, ImageRun, Packer, Paragraph } from "docx";
import sharp from "sharp";
import { createBookingPdf } from "@/lib/booking-pdf";

type Content = Record<string, unknown>;

/**
 * A Booking Form is a controlled legal form.  Word's paragraph reflow cannot
 * preserve its approved dotted fields, so this export places each approved
 * PDF page into an A4 Word page at its original dimensions.
 */
export async function createFixedBookingWord(content: Content) {
  const template = await readFile(path.join(process.cwd(), "public", "templates", "booking-form-template.pdf"));
  const pdf = Buffer.from(await createBookingPdf(template, content));
  const probe = sharp(pdf, { density: 144, pages: 1 });
  const metadata = await probe.metadata();
  const pageCount = metadata.pages ?? 1;
  const sections = await Promise.all(Array.from({ length: pageCount }, async (_, page) => {
    const image = await sharp(pdf, { density: 144, page, pages: 1 }).png().toBuffer();
    return {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
      children: [new Paragraph({ spacing: { before: 0, after: 0, line: 1 }, children: [new ImageRun({ data: image, type: "png", transformation: { width: 794, height: 1123 } })] })],
    };
  }));
  return Packer.toBuffer(new Document({ sections }));
}
