"use client";

import { useActionState } from "react";
import { createTeam, inviteTeamMember, type TeamActionState } from "@/lib/actions/teams";

const initialState: TeamActionState = {};

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeam, initialState);
  return (
    <form action={action} className="stack">
      <div className="form-grid">
        <div className="field"><label htmlFor="team-name">Team name</label><input id="team-name" name="name" required minLength={2} placeholder="North Sales" /></div>
        <div className="field"><label htmlFor="team-slug">Workspace URL</label><input id="team-slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="north-sales" /></div>
      </div>
      {state.error && <p className="alert">{state.error}</p>}
      <button className="button" disabled={pending}>{pending ? "Creating…" : "Create private workspace"}</button>
    </form>
  );
}

export function InviteMemberForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(inviteTeamMember, initialState);
  const invitePath = state.inviteToken ? `/invite/${state.inviteToken}` : "";
  return (
    <form action={action} className="stack">
      <input type="hidden" name="teamId" value={teamId} />
      <div className="form-grid invite-grid">
        <div className="field"><label htmlFor="invite-email">Email address</label><input id="invite-email" name="email" type="email" required placeholder="teammate@company.com" /></div>
        <div className="field"><label htmlFor="invite-role">Role</label><select id="invite-role" name="role"><option value="member">Member</option><option value="admin">Admin</option></select></div>
      </div>
      {state.error && <p className="alert">{state.error}</p>}
      {state.success && <div className="alert success"><strong>{state.success}</strong>{invitePath && <><br /><span>Share this link: </span><a className="text-link" href={invitePath}>{invitePath}</a></>}</div>}
      <button className="button" disabled={pending}>{pending ? "Creating invite…" : "Create invitation link"}</button>
    </form>
  );
}
