const ADDRESS_SEPARATOR = "---AGENCY ADDRESS---";
const AGENT_NAME_SEPARATOR = "---AGENT NAME---";
const AGENT_DESIGNATION_SEPARATOR = "---AGENT DESIGNATION---";
const AGENT_MOBILE_SEPARATOR = "---AGENT MOBILE---";
const AGENT_EMAIL_SEPARATOR = "---AGENT EMAIL---";

const sections = [
  ["address", ADDRESS_SEPARATOR],
  ["agent_name", AGENT_NAME_SEPARATOR],
  ["agent_designation", AGENT_DESIGNATION_SEPARATOR],
  ["agent_mobile", AGENT_MOBILE_SEPARATOR],
  ["agent_email", AGENT_EMAIL_SEPARATOR],
] as const;

export function splitAgencyDetails(value: unknown) {
  const raw = String(value ?? "").trim();
  const firstSeparator = sections.map(([, marker]) => raw.indexOf(marker)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
  const result = { company: (firstSeparator == null ? raw : raw.slice(0, firstSeparator)).trim(), address: "", agent_name: "", agent_designation: "", agent_mobile: "", agent_email: "" };
  for (const [key, marker] of sections) {
    const start = raw.indexOf(marker);
    if (start < 0) continue;
    const valueStart = start + marker.length;
    const next = sections.map(([, candidate]) => raw.indexOf(candidate, valueStart)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
    result[key] = raw.slice(valueStart, next == null ? raw.length : next).trim();
  }
  return result;
}

export function combineAgencyDetails(company: unknown, address: unknown, agentName?: unknown, agentDesignation?: unknown, agentMobile?: unknown, agentEmail?: unknown) {
  const cleanCompany = String(company ?? "").trim();
  const values = [
    [AGENT_NAME_SEPARATOR, agentName],
    [AGENT_DESIGNATION_SEPARATOR, agentDesignation],
    [AGENT_MOBILE_SEPARATOR, agentMobile],
    [AGENT_EMAIL_SEPARATOR, agentEmail],
    [ADDRESS_SEPARATOR, address],
  ];
  return [cleanCompany, ...values.filter(([, value]) => String(value ?? "").trim()).flatMap(([marker, value]) => [marker, String(value ?? "").trim()])].filter(Boolean).join("\n");
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
  const details = splitAgencyDetails(source.agent_company);
  return Boolean(
    agencyCompanyForSale(source).trim() ||
    details.agent_name ||
    details.agent_email ||
    details.agent_mobile,
  );
}

export function agencyLetterDetails(company: unknown, stored?: ReturnType<typeof splitAgencyDetails>) {
  if (stored?.agent_name) {
    const unprefixed = stored.agent_name.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "");
    const rawFirstName = unprefixed.split(/\s+/)[0];
    const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase() : "";
    const honorific = /\bbinti\b/i.test(unprefixed) ? "Cik " : /\bbin\b/i.test(unprefixed) ? "En " : "";
    return { contactName: stored.agent_name, contactPosition: stored.agent_designation, greeting: firstName ? `Dear ${honorific}${firstName},` : "Dear Sir or Madam,", appointmentDate: "" };
  }
  const normalized = String(company ?? "").trim();
  if (/belle\s*&\s*bross/i.test(normalized)) {
    return { contactName: "Ms Bella Wong", contactPosition: "CEO", greeting: "Dear Ms Bella,", appointmentDate: "8th January, 2024" };
  }
  return { contactName: "", contactPosition: "", greeting: "Dear Sir or Madam,", appointmentDate: "" };
}
