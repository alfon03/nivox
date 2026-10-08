"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/community";

function safePath(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

async function requireUser(next: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

export async function toggleFollow(formData: FormData) {
  const targetId = String(formData.get("target_id") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const returnTo = safePath(String(formData.get("return_to") ?? `/usuarios/${username}`), `/usuarios/${username}`);
  if (!isUuid(targetId)) return;
  const { supabase, user } = await requireUser(returnTo);
  if (user.id === targetId) return;

  const { data: existing } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  if (existing) {
    await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
  } else {
    await supabase.from("user_follows").insert({ follower_id: user.id, following_id: targetId });
  }

  revalidatePath(returnTo);
  revalidatePath(`/usuarios/${username}`);
  revalidatePath("/notificaciones");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser("/notificaciones");
  const readAt = new Date().toISOString();
  await Promise.all([
    supabase.from("notifications").update({ read_at: readAt }).eq("user_id", user.id).is("read_at", null),
    supabase.from("game_alerts").update({ read_at: readAt }).eq("user_id", user.id).is("read_at", null),
  ]);
  revalidatePath("/notificaciones");
  revalidatePath("/", "layout");
}

export async function openNotification(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const href = safePath(String(formData.get("href") ?? "/notificaciones"), "/notificaciones");
  if (!isUuid(id)) redirect("/notificaciones");
  const { supabase, user } = await requireUser("/notificaciones");
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/notificaciones");
  revalidatePath("/", "layout");
  redirect(href);
}

export async function openGameAlert(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const href = safePath(String(formData.get("href") ?? "/notificaciones"), "/notificaciones");
  if (!isUuid(id)) redirect("/notificaciones");
  const { supabase, user } = await requireUser("/notificaciones");
  await supabase.from("game_alerts").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/notificaciones");
  revalidatePath("/", "layout");
  redirect(href);
}
