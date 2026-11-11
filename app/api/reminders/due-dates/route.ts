import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RECIPIENT = process.env.DUE_DATE_REMINDER_EMAIL || "katherine.chew@selangorproperties.com.my";

function malaysiaDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + offsetDays * 86_400_000));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Reminder service is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey) {
    return NextResponse.json({ error: "Reminder service is not configured" }, { status: 503 });
  }

  const tomorrow = malaysiaDate(1);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("sales")
    .select("id,unit_number,customer_name,spa_signing_due_at,spa_signing_scheduled_at,spa_signed_at")
    .or(`spa_signing_due_at.eq.${tomorrow},spa_signing_scheduled_at.eq.${tomorrow}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reminders = (data || []).flatMap((sale) => {
    if (sale.spa_signed_at) return [];
    const dueDate = sale.spa_signing_scheduled_at || sale.spa_signing_due_at;
    if (dueDate !== tomorrow) return [];
    return [{
      unit: sale.unit_number || "Unit pending",
      purchaser: sale.customer_name,
      dueDate,
      action: sale.spa_signing_scheduled_at ? "SPA signing is scheduled" : "SPA signing is due",
    }];
  });

  if (!reminders.length) return NextResponse.json({ sent: false, reminders: 0 });

  const rows = reminders.map((item) =>
    `<tr><td style="padding:8px;border:1px solid #d8d8d8"><strong>${escapeHtml(item.unit)}</strong></td><td style="padding:8px;border:1px solid #d8d8d8">${escapeHtml(item.purchaser)}</td><td style="padding:8px;border:1px solid #d8d8d8">${escapeHtml(item.action)}</td><td style="padding:8px;border:1px solid #d8d8d8">${displayDate(item.dueDate)}</td></tr>`,
  ).join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.DUE_DATE_REMINDER_FROM || "AIRA Sales Tracker <reminders@selangorproperties.com.my>",
      to: [RECIPIENT],
      subject: `AIRA Sales Tracker: ${reminders.length} item${reminders.length === 1 ? "" : "s"} due tomorrow`,
      html: `<div style="font-family:Arial,sans-serif;color:#171717"><h2>AIRA Sales Tracker</h2><p>The following tracker item${reminders.length === 1 ? " is" : "s are"} due tomorrow:</p><table style="border-collapse:collapse;width:100%;max-width:760px"><thead><tr><th style="padding:8px;border:1px solid #d8d8d8;text-align:left">Unit</th><th style="padding:8px;border:1px solid #d8d8d8;text-align:left">Purchaser</th><th style="padding:8px;border:1px solid #d8d8d8;text-align:left">Action</th><th style="padding:8px;border:1px solid #d8d8d8;text-align:left">Due date</th></tr></thead><tbody>${rows}</tbody></table><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://aira-internal-sales-management.vercel.app"}/sales-tracker">Open Sales Tracker</a></p></div>`,
    }),
  });

  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: 502 });
  return NextResponse.json({ sent: true, reminders: reminders.length });
}
