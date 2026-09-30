import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { getTeams } from "@/lib/data/teams";
import { getTeamContext } from "@/lib/tenancy";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aira Sales Desk",
  description: "Internal property sales and document management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [teams, context] = await Promise.all([getTeams(), getTeamContext()]);
  return (
    <html lang="en">
      <body>
        <input id="nav-toggle" className="nav-toggle" type="checkbox" />
        <header className="mobile-header">
          <Link href="/sales" className="brand compact"><span>A</span>Aira Sales Desk</Link>
          <div className="mobile-actions"><Link href="/sales/new" className="mobile-add" aria-label="Create a new sale">＋</Link><label htmlFor="nav-toggle" className="menu-button" aria-label="Toggle navigation">☰</label></div>
        </header>
        <aside className="sidebar">
          <Link href="/sales" className="brand"><span>A</span><div>Aira<small>Sales Desk</small></div></Link>
          <WorkspaceSwitcher teams={teams} activeTeamId={context.team.id} />
          <AppNav />
          <Link href="/sales/new" className="button accent sidebar-action">＋ New sale</Link>
          <p className="sidebar-note">{context.isDemo ? "Public demo workspace" : `${context.role ?? "member"} access`}<br />{context.team.name}</p>
        </aside>
        <label htmlFor="nav-toggle" className="nav-scrim" />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
