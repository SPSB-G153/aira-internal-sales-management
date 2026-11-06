import type { Sale } from "@/lib/types";

type PaymentFields = Pick<Sale, "booking_fee" | "sale_date" | "payment_method">;

export const hasRecordedBookingPayment = (sale: PaymentFields) =>
  Boolean(sale.booking_fee && sale.booking_fee > 0 && sale.sale_date && sale.payment_method);

export function saleDisplayStatus(sale: Sale) {
  if ((sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale)) {
    return { label: "Pending Payment", className: "draft" };
  }
  if (sale.status === "hovp_ready") return { label: "HOVP Issued", className: "confirmed" };
  if (sale.spa_signed_at || sale.status === "spa_signed") {
    if (!sale.balance_deposit_received_at) return { label: "SPA Signed - 8% Pending", className: "draft" };
    const inventoryIncluded=sale.inventory_payment_not_required||sale.inventory_payment_reference==="Included in selling price";
    if (sale.inventory_required && !inventoryIncluded && !sale.inventory_payment_received_at) return { label: "Inventory Payment Pending", className: "draft" };
    return { label: "SPA & Payments Completed", className: "confirmed" };
  }
  if (sale.notice_issued_at) {
    if (sale.spa_signing_scheduled_at) return { label: "SPA Signing Scheduled", className: "generated" };
    return { label: "Notice Issued", className: "generated" };
  }
  if (sale.status === "booking_draft") return { label: "Booking Draft", className: "draft" };
  if (sale.status === "draft") return { label: "POP", className: "draft" };
  return { label: sale.status.replaceAll("_", " "), className: sale.status };
}
