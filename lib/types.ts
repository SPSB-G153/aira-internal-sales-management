export type SaleStatus = "draft" | "confirmed";
export type DocumentType = "pre_booking_form" | "acceptance_letter" | "hovp_letter" | "rebate_letter";
export type DocumentStatus = "pending" | "generated" | "reviewed";

export interface Sale {
  id:string; user_id:string|null; sale_reference:string; customer_name:string; customer_ic:string|null;
  customer_address:string|null; customer_phone:string|null; customer_email:string|null; project_name:string;
  unit_number:string|null; unit_type:string|null; floor_area:number|null; purchase_price:number;
  booking_fee:number|null; spa_value:number|null; loan_amount:number|null; loan_percentage:number|null;
  rebate_amount:number|null; rebate_percentage:number|null; salesperson_name:string|null; sale_date:string|null;
  status:SaleStatus; created_at:string;
}
export interface SaleDocument { id:string; user_id:string|null; sale_id:string; document_type:DocumentType; content:Record<string,unknown>; status:DocumentStatus; generated_at:string|null; created_at:string; }
export const documentNames:Record<DocumentType,string>={pre_booking_form:"Pre-Booking Form",acceptance_letter:"Acceptance Letter",hovp_letter:"HOVP Letter",rebate_letter:"Rebate Letter"};
