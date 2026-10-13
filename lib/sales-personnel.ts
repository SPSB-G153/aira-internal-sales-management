export const salesPersonnel = [
  { name: "Madihah Hassan", email: "madihah.hassan@selangorproperties.com.my" },
  { name: "Felicia Low", email: "felicia.low@selangorproperties.com.my" },
] as const;

export function emailForSalesPersonnel(name: string) {
  const normalized = name.trim().toLocaleLowerCase("en-MY");
  return salesPersonnel.find((person) => person.name.toLocaleLowerCase("en-MY") === normalized)?.email ?? "";
}
