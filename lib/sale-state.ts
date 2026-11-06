import type { Sale } from "@/lib/types";

type PaymentFields = Pick<Sale, "booking_fee" | "sale_date" | "payment_method">;

export const hasRecordedBookingPayment = (sale: PaymentFields) =>
  Boolean(sale.booking_fee && sale.booking_fee > 0 && sale.sale_date && sale.payment_method);

export function saleDisplayStatus(sale: Sale) {
  if ((sale.status === "confirmed" || sale.status === "spa_signed") && !hasRecordedBookingPayment(sale)) {
    return { label: "Pending Payment", className: "draft" };
  }
  if (sale.status === "hovp_ready") return { label: "HOVP Issued", className: "confirmed" };
  if (sale.vacant_possession_delivered_at) return { label: "Vacant Possession Delivered", className: "confirmed" };
  if (sale.mot_registered_at) return { label: "MOT Registered", className: "confirmed" };
  if (sale.mot_registration_submitted_at) return { label: "MOT Registration Pending", className: "generated" };
  if (sale.balance_purchase_price_received_at) return { label: "Purchase Price Settled", className: "confirmed" };
  if (sale.foreign_consent_required && !sale.foreign_consent_received_at) return { label: "Foreign Consent Pending", className: "draft" };
  if (sale.spa_developer_executed_at) return { label: "SPA Fully Executed", className: "confirmed" };
  if (sale.spa_sent_to_developer_at) return { label: "Developer Execution Pending", className: "generated" };
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
