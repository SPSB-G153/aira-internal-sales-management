const ADDRESS_SEPARATOR = "---AGENCY ADDRESS---";

export function splitAgencyDetails(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw.includes(ADDRESS_SEPARATOR)) {
    return { company: raw, address: "" };
  }
  const [company, ...addressParts] = raw.split(ADDRESS_SEPARATOR);
  return {
    company: company.trim(),
    address: addressParts.join(ADDRESS_SEPARATOR).trim(),
  };
}

export function combineAgencyDetails(company: unknown, address: unknown) {
  const cleanCompany = String(company ?? "").trim();
  const cleanAddress = String(address ?? "").trim();
  if (!cleanAddress) return cleanCompany;
  return `${cleanCompany}\n${ADDRESS_SEPARATOR}\n${cleanAddress}`;
}

type AgencyFallbackSource = {
  unit_number?: unknown;
  salesperson_name?: unknown;
};

/**
 * A small recovery table for approved legacy POP records that were created
 * before agency details were persisted on the sale. New uploads continue to
 * use the agency/company read from the local POP reader.
 */
export function legacyAgencyCompany(source: AgencyFallbackSource) {
  const unit = String(source.unit_number ?? "").trim().toUpperCase();
  if (unit === "A-15-03") {
    return "IQI REALTY SDN BHD";
  }
  return "";
}

export function agencyCompanyForSale(source: AgencyFallbackSource & { agent_company?: unknown }) {
  return splitAgencyDetails(source.agent_company).company || legacyAgencyCompany(source);
}

export function hasExternalAgent(source: AgencyFallbackSource & { agent_company?: unknown }) {
  return Boolean(agencyCompanyForSale(source).trim());
}

export function agencyLetterDetails(company: unknown) {
  const normalized = String(company ?? "").trim();
  if (/belle\s*&\s*bross/i.test(normalized)) {
    return { contactName: "Ms Bella Wong", contactPosition: "CEO", greeting: "Dear Ms Bella,", appointmentDate: "8th January, 2024" };
  }
  return { contactName: "", contactPosition: "", greeting: "Dear Sir or Madam,", appointmentDate: "" };
}
