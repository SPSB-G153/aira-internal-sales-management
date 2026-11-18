import Link from "next/link";
import { notFound } from "next/navigation";
import { NewSaleIntake } from "@/components/new-sale-intake";
import { getSale } from "@/lib/data/sales";

export default async function ContinueWithBookingForm({ searchParams }: { searchParams: Promise<{ continue?: string }> }) {
  const { continue: saleId } = await searchParams;
  if (!saleId) notFound();
  let sale;
  try { sale = await getSale(saleId); } catch { notFound(); }
  return <div className="page">
    <div className="page-header new-sale-page-header">
      <div><p className="eyebrow">Next step</p><h1>Upload Booking Form</h1><p className="subtle">POP saved. Upload the Booking Form for this same unit.</p></div>
      <Link href="/dashboard" className="button secondary">Back to main</Link>
    </div>
    <NewSaleIntake initialValues={sale} bookingOnly />
  </div>;
}
