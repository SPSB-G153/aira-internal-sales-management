"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptTeamInvitation } from "@/lib/actions/teams";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div className="stack">
    {error && <p className="alert">{error}</p>}
    <button className="button" disabled={pending} onClick={() => startTransition(async () => {
      const result = await acceptTeamInvitation(token);
      if (result.error) return setError(result.error);
      router.push("/dashboard");
      router.refresh();
    })}>{pending ? "Joining…" : "Accept invitation"}</button>
  </div>;
}
