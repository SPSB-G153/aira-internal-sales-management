"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/sales", label: "Sales" },
  { href: "/documents", label: "Documents" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppNav() {
  const pathname = usePathname();
  return <nav>{items.map((item) => <Link className={pathname.startsWith(item.href) ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>)}</nav>;
}
