import Link from "next/link";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return <div className="page auth-page"><section className="card form-card auth-card"><p className="eyebrow">Team invitation</p><h1>Join an Aira workspace.</h1><p className="subtle">The invitation is tied to the email address it was sent to.</p>{user ? <AcceptInviteButton token={token} /> : <Link className="button" href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in to accept</Link>}</section></div>;
}
