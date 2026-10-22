export const salesPersonnel = [
  { name: "Madihah Hassan", email: "madihah.hassan@selangorproperties.com.my", designation: "Aira Custodial Manager", mobile: "" },
  { name: "Felicia Low", email: "felicia.low@selangorproperties.com.my", designation: "Business Development Manager", mobile: "" },
] as const;

export function profileForSalesPersonnel(name: string) {
  const normalized = name.trim().toLocaleLowerCase("en-MY");
  return salesPersonnel.find((person) => {
    const fullName = person.name.toLocaleLowerCase("en-MY");
    return fullName === normalized || fullName.startsWith(normalized) || normalized.startsWith(fullName);
  });
}

export function emailForSalesPersonnel(name: string) {
  return profileForSalesPersonnel(name)?.email ?? "";
}

export function designationForSalesPersonnel(name: string) {
  return profileForSalesPersonnel(name)?.designation ?? "";
}

export function mobileForSalesPersonnel(name: string) {
  return profileForSalesPersonnel(name)?.mobile ?? "";
}
