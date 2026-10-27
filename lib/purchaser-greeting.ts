export function purchaserGreeting(content: Record<string, unknown>) {
  const greetingTitle = (value: unknown) => String(value ?? "Purchaser").trim().replace(/^Miss$/i, "Ms");
  const purchaser = String(content.customer_name ?? "").trim();
  const purchaser2 = String(content.customer_name_2 ?? "").trim();
  const isCompany = String(content.purchaser_type ?? "individual").trim() === "company";
  if (isCompany) {
    const sex = String(content.customer_sex ?? "").trim().toLowerCase();
    if (sex === "male" || sex === "m") return "Dear Sir,";
    if (sex === "female" || sex === "f") return "Dear Madam,";
    return "Dear Sir or Madam,";
  }
  const salutation = greetingTitle(content.customer_salutation);
  const firstGreeting = `${salutation} ${purchaser.split(/\s+/)[0] ?? ""}`.trim();
  if (!purchaser2) return `Dear ${firstGreeting},`;
  const salutation2 = greetingTitle(content.customer_salutation_2 || salutation) || salutation;
  const secondGreeting = `${salutation2} ${purchaser2.split(/\s+/)[0] ?? ""}`.trim();
  return `Dear ${firstGreeting} & ${secondGreeting},`;
}
