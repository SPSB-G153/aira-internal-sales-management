"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/sales", label: "Sales" },
  { href: "/documents", label: "Documents" },
  { href: "/settings/team", label: "Team" },
];

export function AppNav() {
  const pathname = usePathname();
  const closeMobileNavigation = () => {
    const toggle = document.getElementById("nav-toggle") as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  };

  return (
    <nav aria-label="Primary navigation">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "active" : ""}
            href={item.href}
            key={item.href}
            onClick={closeMobileNavigation}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
