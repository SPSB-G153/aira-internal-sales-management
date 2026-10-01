import type { DocumentType,Sale } from "@/lib/types";
export const documentOrder:DocumentType[]=["acceptance_letter","rebate_letter","hovp_letter"];
export const documentSteps:Record<DocumentType,number>={pre_booking_form:1,acceptance_letter:1,rebate_letter:2,hovp_letter:3};
const common=(s:Sale)=>({
  sale_reference:s.sale_reference,customer_name:s.customer_name,customer_ic:s.customer_ic,
  customer_name_2:s.customer_name_2,customer_ic_2:s.customer_ic_2,customer_salutation:s.customer_salutation,
  customer_tin:s.customer_tin,customer_nationality:s.customer_nationality,customer_sex:s.customer_sex,
  customer_race:s.customer_race,bumi_status:s.bumi_status,customer_occupation:s.customer_occupation,
  contact_person:s.contact_person,customer_address:s.customer_address,customer_phone:s.customer_phone,
  customer_email:s.customer_email,project_name:s.project_name,unit_number:s.unit_number,
  storey_number:s.storey_number,unit_type:s.unit_type,floor_area:s.floor_area,floor_area_sqm:s.floor_area_sqm,
  car_parking_bay:s.car_parking_bay,purchase_price:s.purchase_price,booking_fee:s.booking_fee,rebate_amount:s.rebate_amount,
  salesperson_name:s.salesperson_name,solicitor_name:s.solicitor_name,proprietor_name:s.proprietor_name,sale_date:s.sale_date,
});
export function buildDocumentSnapshot(sale:Sale,type:DocumentType){return{...common(sale),document_type:type,verified_at:new Date().toISOString()}}
