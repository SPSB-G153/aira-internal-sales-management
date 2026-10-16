export const salesPersonnel = [
  { name: "Madihah Hassan", email: "madihah.hassan@selangorproperties.com.my", designation: "Senior Relationship Manager" },
  { name: "Felicia Low", email: "felicia.low@selangorproperties.com.my", designation: "Business Development Manager" },
] as const;

export function emailForSalesPersonnel(name: string) {
  const normalized = name.trim().toLocaleLowerCase("en-MY");
  return salesPersonnel.find((person) => person.name.toLocaleLowerCase("en-MY") === normalized)?.email ?? "";
}

export function designationForSalesPersonnel(name: string) {
  const normalized = name.trim().toLocaleLowerCase("en-MY");
  const person = salesPersonnel.find((entry) => entry.name.toLocaleLowerCase("en-MY") === normalized);
  return person && "designation" in person ? person.designation : "";
}
