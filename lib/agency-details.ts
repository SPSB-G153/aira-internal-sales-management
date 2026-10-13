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
