import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { TeamContext, TeamRole } from "@/lib/types";

export const DEMO_TEAM_ID = "00000000-0000-0000-0000-000000000001";
export const ACTIVE_TEAM_COOKIE = "aira_team_id";

const demoContext:TeamContext={
  team:{id:DEMO_TEAM_ID,name:"Aira Demo Team",slug:"aira-demo"},
  role:null,
  isDemo:true,
};

/** Resolve the active team from the signed-in user's memberships.
 * Anonymous visitors and users without memberships remain in the public demo.
 */
export async function getTeamContext():Promise<TeamContext>{
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return demoContext;

  const preferred=(await cookies()).get(ACTIVE_TEAM_COOKIE)?.value;
  const {data:memberships,error}=await db
    .from("team_memberships")
    .select("team_id,role")
    .eq("user_id",user.id);
  if(error||!memberships?.length)return demoContext;

  const membership=memberships.find(item=>item.team_id===preferred)??memberships[0];
  const {data:team}=await db
    .from("teams")
    .select("id,name,slug")
    .eq("id",membership.team_id)
    .single();
  if(!team)return demoContext;

  return {team,role:membership.role as TeamRole,isDemo:false};
}
