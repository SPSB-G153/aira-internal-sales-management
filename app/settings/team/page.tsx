import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { CreateTeamForm, InviteMemberForm } from "@/components/team-forms";
import { getTeamMembers } from "@/lib/data/teams";
import { getTeamContext } from "@/lib/tenancy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [context, db] = await Promise.all([getTeamContext(), createClient()]);
  const { data: { user } } = await db.auth.getUser();
  const members = context.isDemo ? [] : await getTeamMembers(context.team.id);
  const canManage = context.role === "owner" || context.role === "admin";
  return <div className="page">
    <div className="page-header"><div><p className="eyebrow">Workspace settings</p><h1>{context.team.name}</h1><p className="subtle">Keep customer records isolated by team and invite only the people who need access.</p></div>{user ? <form action={signOut}><button className="button secondary">Sign out</button></form> : <Link href="/login" className="button">Sign in</Link>}</div>
    {context.isDemo ? <div className="team-grid">
      <section className="card detail-card"><p className="eyebrow">Public demo</p><h2>Explore without an account</h2><p className="subtle">Anyone can use this shared workspace. Use sample information only—never real customer data.</p><Link href="/sales" className="button secondary">Open demo sales</Link></section>
      <section className="card detail-card"><p className="eyebrow">Your own workspace</p><h2>Private data for your team</h2>{user ? <><p className="subtle">Create a workspace. You’ll become its owner and can invite teammates.</p><CreateTeamForm /></> : <><p className="subtle">Sign in by email, then create a private workspace and invite your team.</p><Link href="/login?next=/settings/team" className="button">Sign in to create a team</Link></>}</section>
    </div> : <div className="team-grid">
      <section className="card detail-card"><p className="eyebrow">Members</p><h2>{members.length} {members.length === 1 ? "person" : "people"}</h2><div className="member-list">{members.map((member) => <div className="member-row" key={member.user_id}><div className="member-avatar">{member.role.slice(0,1).toUpperCase()}</div><div><strong>{member.user_id === user?.id ? "You" : `Member ${member.user_id.slice(0,8)}`}</strong><small>Joined {new Date(member.created_at).toLocaleDateString("en-MY")}</small></div><span className="badge confirmed">{member.role}</span></div>)}</div></section>
      <section className="card detail-card"><p className="eyebrow">Invite people</p><h2>Grow the workspace</h2>{canManage ? <><p className="subtle">Create a secure link for a teammate. It expires in seven days and only works for their email.</p><InviteMemberForm teamId={context.team.id} /></> : <p className="subtle">Ask an owner or admin to invite more people.</p>}</section>
    </div>}
  </div>;
}
