"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { switchTeam } from "@/lib/actions/teams";
import type { TeamOption } from "@/lib/data/teams";

export function WorkspaceSwitcher({ teams, activeTeamId }: { teams: TeamOption[]; activeTeamId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="workspace-switcher">
      <label htmlFor="workspace">Workspace</label>
      <select
        id="workspace"
        aria-label="Active workspace"
        value={activeTeamId}
        disabled={pending}
        onChange={(event) => {
          const teamId = event.target.value;
          startTransition(async () => {
            const result = await switchTeam(teamId);
            if (result.error) return setError(result.error);
            setError("");
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
      {error && <small>{error}</small>}
    </div>
  );
}
