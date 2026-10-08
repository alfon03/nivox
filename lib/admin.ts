import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function requireAdmin(next = "/admin") {
  if (!isSupabaseConfigured()) redirect("/auth/login");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/mi-nivox");
  return { supabase, user, profile };
}
