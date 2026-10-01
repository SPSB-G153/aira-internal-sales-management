import type { Metadata } from "next";
import { AppChrome } from "@/components/app-chrome";
import { getTeams } from "@/lib/data/teams";
import { getTeamContext } from "@/lib/tenancy";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aira Residence Sales Desk",
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
        <AppChrome teams={teams} activeTeamId={context.team.id} teamName={context.team.name} isDemo={context.isDemo} role={context.role}>{children}</AppChrome>
      </body>
    </html>
  );
}
