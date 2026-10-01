import { createClient } from "@/lib/supabase/server";
import { DEMO_TEAM_ID } from "@/lib/tenancy";
import type { Team, TeamMembership, TeamRole } from "@/lib/types";

export type TeamOption=Pick<Team,"id"|"name"|"slug">&{role:TeamRole|null;isDemo:boolean};
export type TeamMember=TeamMembership&{email?:string};

export async function getTeams():Promise<TeamOption[]>{
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  const demo:TeamOption={id:DEMO_TEAM_ID,name:"Aira Sales Team",slug:"aira-demo",role:null,isDemo:true};
  if(!user)return[demo];

  const {data:memberships,error}=await db.from("team_memberships").select("team_id,role").eq("user_id",user.id);
  if(error||!memberships?.length)return[demo];
  const {data:teams, error:teamError}=await db.from("teams").select("id,name,slug").in("id",memberships.map(item=>item.team_id));
  if(teamError)throw new Error(teamError.message);
  const roles=new Map(memberships.map(item=>[item.team_id,item.role as TeamRole]));
  return [demo,...(teams??[]).map(team=>({...team,role:roles.get(team.id)??null,isDemo:false}))];
}

export async function getTeamMembers(teamId:string):Promise<TeamMember[]>{
  if(teamId===DEMO_TEAM_ID)return[];
  const db=await createClient();
  const {data,error}=await db.from("team_memberships").select("team_id,user_id,role,created_at").eq("team_id",teamId).order("created_at");
  if(error)throw new Error(error.message);
  return(data??[])as TeamMember[];
}
