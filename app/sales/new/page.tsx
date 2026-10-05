import Link from "next/link";
import { SaleForm } from "@/components/sale-form";
import type { Sale } from "@/lib/types";

const testSale: Partial<Sale> = {
  purchaser_type: "individual", customer_salutation: "Mr", customer_name: "TEST PURCHASER ONE", customer_ic: "TEST-123456", customer_tin: "TEST-TIN-001", customer_nationality: "Malaysia", customer_sex: "Male", customer_race: "Test Race", bumi_status: true, customer_occupation: "Test Occupation", contact_person: "Test Contact", customer_phone: "0123456789", customer_email: "test@example.com", customer_address: "Test Address, Kuala Lumpur, 50490",
  customer_salutation_2: "Ms", customer_name_2: "TEST PURCHASER TWO", customer_ic_2: "TEST-234567", customer_tin_2: "TEST-TIN-002", customer_nationality_2: "Malaysia", customer_sex_2: "Female", customer_race_2: "Test Race", bumi_status_2: false, customer_occupation_2: "Test Occupation 2", contact_person_2: "Test Contact 2", customer_phone_2: "0198765432", customer_email_2: "test2@example.com", customer_address_2: "Test Address 2, Kuala Lumpur, 50490",
  project_name: "Aira Residence", unit_number: "A-01-03", storey_number: "1", unit_type: "A2b", floor_area: 5943, floor_area_sqm: 552.12, car_parking_bay: "P1", purchase_price: 500000, rebate_amount: 10000, quoted_id_net_selling_price: 490000,
  sale_reference: "TEST-POP-001", salesperson_name: "Test Salesperson", agent_company: "Test Sales Agency", solicitor_name: "Jeff Leong, Poon & Wong", sale_date: "2026-10-05", payment_method: "cheque", payment_reference: "TEST-CHQ-001", authorised_signatory_name: "Test Approver", authorised_signatory_position: "Test Manager",
};

export default async function NewSale({ searchParams }: { searchParams: Promise<{ prefill?: string }> }) {
  const { prefill } = await searchParams;
  return <div className="page"><div className="page-header"><div><p className="eyebrow">New sale</p><h1>Record verified sale details.</h1><p className="subtle">Required fields are marked. Optional gaps will not prevent confirmation.</p></div><Link href="/sales" className="button secondary">Cancel</Link></div><SaleForm initialValues={prefill === "test" ? testSale : undefined}/></div>;
}
