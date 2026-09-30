"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error?: string; success?: string };

export async function requestMagicLink(
  _: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? "/settings/team");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "https://aira-internal-sales-management.vercel.app";
  const db = await createClient();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };
  return { success: "Check your email for a secure sign-in link." };
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/dashboard");
}
