import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getDocument } from "@/lib/data/documents";
import { getTeamContext } from "@/lib/tenancy";
import { createBookingPdf } from "@/lib/booking-pdf";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { role } = await getTeamContext(); if (!role) return new NextResponse("Sign in to print the Booking Form PDF.", { status: 403 }); try { const { id } = await params; const document = await getDocument(id); if (document.document_type !== "booking_form") return new NextResponse("This export is only available for the Booking Form.", { status: 400 }); const bytes = await createBookingPdf(await readFile(path.join(process.cwd(), "public", "templates", "booking-form-template.pdf")), document.content); return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="aira-booking-form.pdf"', "Cache-Control": "private, no-store" } }); } catch (error) { console.error("Booking PDF export failed", error); return new NextResponse("The Booking Form PDF could not be created.", { status: 500 }); } }
