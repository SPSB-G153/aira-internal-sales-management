"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { TeamOption } from "@/lib/data/teams";

type AppChromeProps = { children: React.ReactNode; teams: TeamOption[]; activeTeamId: string; teamName: string; isDemo: boolean; role: string | null; };

export function AppChrome({ children, teams, activeTeamId, teamName, isDemo, role }: AppChromeProps) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;
  return <><input id="nav-toggle" className="nav-toggle" type="checkbox" /><header className="mobile-header"><Link href="/sales" className="brand compact">Aira Residence</Link><div className="mobile-actions"><Link href="/sales/new" className="mobile-add" aria-label="Create a new sale">＋</Link><label htmlFor="nav-toggle" className="menu-button" aria-label="Toggle navigation">☰</label></div></header><aside className="sidebar"><Link href="/sales" className="brand">Aira Residence</Link><WorkspaceSwitcher teams={teams} activeTeamId={activeTeamId} /><AppNav /><Link href="/sales/new" className="button accent sidebar-action">＋ New sale</Link><p className="sidebar-note">{isDemo ? "Public demo workspace" : `${role ?? "member"} access`}<br />{teamName}</p></aside><label htmlFor="nav-toggle" className="nav-scrim" /><main className="app-shell">{children}</main><AppNav mobile /></>;
}
