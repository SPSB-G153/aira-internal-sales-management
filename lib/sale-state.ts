import type { Sale } from "@/lib/types";

type PaymentFields = Pick<Sale, "booking_fee" | "sale_date" | "payment_method">;

type ReferenceFields = Pick<Sale, "sale_date" | "unit_number">;

export function operationalSaleReference(sale: ReferenceFields) {
  const date = sale.sale_date?.replace(/[^0-9]/g, "").slice(0, 8);
  const unit = sale.unit_number?.trim().toUpperCase();
  return date?.length === 8 && unit ? `S-${date}_${unit}` : null;
}

export const hasRecordedBookingPayment = (sale: PaymentFields) =>
  Boolean(sale.booking_fee && sale.booking_fee > 0 && sale.sale_date && sale.payment_method);

export function saleDisplayStatus(sale: Sale) {
  if ((sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale)) {
    return { label: "Pending Payment", className: "draft" };
  }
  if (sale.status === "spa_signed") return { label: "Confirmed", className: "confirmed" };
  if (sale.status === "booking_draft") return { label: "Booking Draft", className: "draft" };
  if (sale.status === "draft") return { label: "POP", className: "draft" };
  return { label: sale.status.replaceAll("_", " "), className: sale.status };
}
