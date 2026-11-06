import type { Sale } from "@/lib/types";
import { findLocalSale, listLocalSales, saveLocalSale } from "@/lib/local-store";

export async function getSales(search = "", status = "") {
  const needle = search.trim().toLocaleLowerCase("en-MY");
  return (await listLocalSales())
    .filter((sale) => !status || sale.status === status)
    .filter((sale) => !needle || [sale.customer_name, sale.project_name, sale.sale_reference, sale.unit_number].some((value) => String(value ?? "").toLocaleLowerCase("en-MY").includes(needle)))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export const getSale = findLocalSale;
export async function createSale(values: Omit<Partial<Sale>, "id" | "created_at">) { return saveLocalSale(values); }
export async function updateSale(id: string, values: Partial<Sale>) {
  const safeValues = { ...values };
  delete safeValues.team_id;
  if (safeValues.status === "draft") delete safeValues.status;
  return saveLocalSale(safeValues, id);
}
