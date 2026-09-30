"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_TEAM_COOKIE, DEMO_TEAM_ID } from "@/lib/tenancy";

export type TeamActionState={error?:string;success?:string;teamId?:string;inviteToken?:string};

export async function switchTeam(teamId:string):Promise<TeamActionState>{
  const db=await createClient();
  if(teamId!==DEMO_TEAM_ID){
    const {data:{user}}=await db.auth.getUser();
    if(!user)return{error:"Sign in to access a private team."};
    const {data,error}=await db.from("team_memberships").select("team_id").eq("team_id",teamId).eq("user_id",user.id).maybeSingle();
    if(error||!data)return{error:"You do not have access to that team."};
  }
  (await cookies()).set(ACTIVE_TEAM_COOKIE,teamId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365});
  revalidatePath("/","layout");
  return{teamId};
}

export async function createTeam(_:TeamActionState,form:FormData):Promise<TeamActionState>{
  const name=String(form.get("name")??"").trim();
  const slug=String(form.get("slug")??"").trim().toLowerCase();
  if(name.length<2)return{error:"Team name must be at least 2 characters."};
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return{error:"Use lowercase letters, numbers, and hyphens for the team URL."};

  const db=await createClient();
  const {data,error}=await db.rpc("create_team",{team_name:name,team_slug:slug});
  if(error)return{error:error.message};
  const teamId=String(data);
  (await cookies()).set(ACTIVE_TEAM_COOKIE,teamId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365});
  revalidatePath("/","layout");
  return{teamId};
}

export async function inviteTeamMember(_:TeamActionState,form:FormData):Promise<TeamActionState>{
  const teamId=String(form.get("teamId")??"");
  const email=String(form.get("email")??"");
  const requestedRole=String(form.get("role")??"member");
  const role=requestedRole==="admin"?"admin":"member";
  const normalizedEmail=email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))return{error:"Enter a valid email address."};
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return{error:"Sign in to invite a team member."};
  const {data,error}=await db.from("team_invitations").insert({team_id:teamId,email:normalizedEmail,role,invited_by:user.id}).select("token").single();
  if(error)return{error:error.message};
  revalidatePath("/settings/team");
  return{teamId,inviteToken:String(data.token),success:`Invitation created for ${normalizedEmail}.`};
}

export async function acceptTeamInvitation(token:string):Promise<TeamActionState>{
  const db=await createClient();
  const {data,error}=await db.rpc("accept_team_invitation",{invitation_token:token});
  if(error)return{error:error.message};
  const teamId=String(data);
  (await cookies()).set(ACTIVE_TEAM_COOKIE,teamId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365});
  revalidatePath("/","layout");
  return{teamId};
}
