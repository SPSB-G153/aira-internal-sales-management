import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aira Sales Desk",
  description: "Internal property sales and document management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <input id="nav-toggle" className="nav-toggle" type="checkbox" />
        <header className="mobile-header">
          <Link href="/sales" className="brand compact"><span>A</span>Aira Sales Desk</Link>
          <label htmlFor="nav-toggle" className="menu-button" aria-label="Toggle navigation">☰</label>
        </header>
        <aside className="sidebar">
          <Link href="/sales" className="brand"><span>A</span><div>Aira<small>Sales Desk</small></div></Link>
          <AppNav />
          <p className="sidebar-note">One verified sale.<br />Four ready documents.</p>
        </aside>
        <label htmlFor="nav-toggle" className="nav-scrim" />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
