import type { Sale } from "@/lib/types";

type PaymentFields = Pick<Sale, "booking_fee" | "sale_date" | "payment_method">;

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
