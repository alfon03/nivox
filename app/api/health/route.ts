import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  const started = Date.now();
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, service: "nivox", database: "not_configured" }, { status: 503 });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("games").select("slug", { head: true, count: "exact" }).eq("status", "published");
    if (error) throw error;
    return NextResponse.json({ ok: true, service: "nivox", database: "ok", latency_ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, service: "nivox", database: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
