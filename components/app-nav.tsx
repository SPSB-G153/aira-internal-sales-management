"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview", shortLabel: "Home", icon: "◫" },
  { href: "/operations", label: "Process & scoring", shortLabel: "Process", icon: "↗" },
  { href: "/sales", label: "Sales", shortLabel: "Sales", icon: "◇" },
  { href: "/documents", label: "Documents", shortLabel: "Docs", icon: "▤" },
  { href: "/settings/team", label: "Team", shortLabel: "Team", icon: "◎" },
];

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const closeMobileNavigation = () => {
    const toggle = document.getElementById("nav-toggle") as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  };

  return (
    <nav aria-label={mobile ? "Mobile navigation" : "Primary navigation"} className={mobile ? "mobile-bottom-nav" : undefined}>
      {(mobile ? items.slice(0, 4) : items).map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "active" : ""}
            href={item.href}
            key={item.href}
            onClick={closeMobileNavigation}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{mobile ? item.shortLabel : item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
