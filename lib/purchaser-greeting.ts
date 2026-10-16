export function purchaserGreeting(content: Record<string, unknown>) {
  const purchaser = String(content.customer_name ?? "").trim();
  const isCompany = String(content.purchaser_type ?? "individual").trim() === "company";
  if (isCompany) {
    const sex = String(content.customer_sex ?? "").trim().toLowerCase();
    if (sex === "male" || sex === "m") return "Dear Sir,";
    if (sex === "female" || sex === "f") return "Dear Madam,";
    return "Dear Sir or Madam,";
  }
  const salutation = String(content.customer_salutation ?? "Purchaser").trim();
  return `Dear ${salutation} ${purchaser.split(/\s+/)[0] ?? ""},`;
}
