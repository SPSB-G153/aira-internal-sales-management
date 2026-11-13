"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/tenancy";

export type RemoveAgentState = { error?: string; removed?: boolean };

export async function removeAgentDetails(
  saleId: string,
  _: RemoveAgentState,
  __: FormData,
): Promise<RemoveAgentState> {
  try {
    const db = await createClient();
    const [{ team, role, isDemo }, { data: { user } }] = await Promise.all([
      getTeamContext(),
      db.auth.getUser(),
    ]);

    if (!isDemo && (!user || role !== "owner")) {
      return { error: "Only the signed-in workspace owner can remove agent details." };
    }

    const { data: sale, error: lookupError } = await db
      .from("sales")
      .select("id")
      .eq("team_id", team.id)
      .eq("id", saleId)
      .single();
    if (lookupError || !sale) return { error: "This sale could not be found." };

    const { error: saleError } = await db
      .from("sales")
      .update({ agent_company: null, pop_introduction_agent: null })
      .eq("team_id", team.id)
      .eq("id", saleId);
    if (saleError) throw new Error(saleError.message);

    const { error: documentError } = await db
      .from("documents")
      .delete()
      .eq("team_id", team.id)
      .eq("sale_id", saleId)
      .in("document_type", ["agency_appointment_letter", "agent_commission_letter"]);
    if (documentError) throw new Error(documentError.message);

    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/sales");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    return { removed: true };
  } catch {
    return { error: "The agent details could not be removed. Please try again." };
  }
}
