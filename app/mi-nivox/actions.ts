"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validatePublicText } from "@/lib/validation";

const allowedPlatforms = ["psn","xbox","steam","nintendo","epic","discord","riot","battlenet","twitch"] as const;
const allowedCompletionKinds = ["none","platinum","all_achievements","hundred_percent"] as const;

function toInt(value: FormDataEntryValue | null, fallback = 0) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function cleanDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function safeReturnTo(formData: FormData, fallback = "/mi-nivox") {
  const value = String(formData.get("return_to") ?? fallback);
  return value.startsWith("/") ? value : fallback;
}

export async function saveGameHistory(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/mi-nivox");

  const gameSlug = String(formData.get("game_slug") ?? "").trim();
  const platformPlayed = String(formData.get("platform_played") ?? "").trim().slice(0, 60) || null;
  const hours = Math.max(0, Math.min(166666, toInt(formData.get("hours"))));
  const minutesPart = Math.max(0, Math.min(59, toInt(formData.get("minutes"))));
  const playtimeMinutes = hours * 60 + minutesPart;
  const achievementsUnlockedRaw = String(formData.get("achievements_unlocked") ?? "").trim();
  const achievementsTotalRaw = String(formData.get("achievements_total") ?? "").trim();
  const achievementsUnlocked = achievementsUnlockedRaw ? Math.max(0, toInt(achievementsUnlockedRaw)) : null;
  const achievementsTotal = achievementsTotalRaw ? Math.max(0, toInt(achievementsTotalRaw)) : null;
  const completionRaw = String(formData.get("completion_kind") ?? "none");
  const completionKind = allowedCompletionKinds.includes(completionRaw as any) ? completionRaw : "none";
  const showOnProfile = formData.get("show_on_profile") === "on";
  const startedOn = cleanDate(formData.get("started_on"));
  const completedOn = cleanDate(formData.get("completed_on"));
  const returnTo = safeReturnTo(formData, `/mi-nivox/juegos/${gameSlug}`);

  if (!gameSlug) redirect("/mi-nivox?error=Juego%20no%20válido");
  if (achievementsUnlocked != null && achievementsTotal != null && achievementsUnlocked > achievementsTotal) {
    redirect(`${returnTo}?error=${encodeURIComponent("Los logros conseguidos no pueden superar el total.")}`);
  }
  if (startedOn && completedOn && completedOn < startedOn) {
    redirect(`${returnTo}?error=${encodeURIComponent("La fecha de finalización no puede ser anterior a la de inicio.")}`);
  }

  const { data: existing } = await supabase.from("user_games").select("status").eq("user_id", user.id).eq("game_slug", gameSlug).maybeSingle();
  if (!existing) {
    redirect(`${returnTo}?error=${encodeURIComponent("Añade primero el juego a tu biblioteca.")}`);
  }
  if (existing.status !== "completed" && completionKind !== "none") {
    redirect(`${returnTo}?error=${encodeURIComponent("Marca primero el juego como Completado para indicar Platino, 100 % o todos los logros.")}`);
  }
  if (existing.status !== "completed" && completedOn) {
    redirect(`${returnTo}?error=${encodeURIComponent("Marca primero el juego como Completado para guardar una fecha de finalización.")}`);
  }

  const { error } = await supabase.from("user_games").update({
    platform_played: platformPlayed,
    playtime_minutes: playtimeMinutes,
    started_on: startedOn,
    completed_on: completedOn,
    achievements_unlocked: achievementsUnlocked,
    achievements_total: achievementsTotal,
    completion_kind: completionKind,
    show_on_profile: showOnProfile,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("game_slug", gameSlug);

  if (error) redirect(`${returnTo}?error=${encodeURIComponent("No se pudo guardar el historial del juego.")}`);
  revalidatePath("/mi-nivox");
  revalidatePath(`/mi-nivox/juegos/${gameSlug}`);
  revalidatePath(`/juegos/${gameSlug}`);
  redirect(`${returnTo}?message=${encodeURIComponent("Historial gamer guardado.")}`);
}

export async function saveGamingAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/perfil/editar");

  const platformRaw = String(formData.get("platform") ?? "").trim().toLowerCase();
  const handle = String(formData.get("handle") ?? "").trim();
  const isPublic = formData.get("is_public") === "on";
  const returnTo = safeReturnTo(formData, "/perfil/editar");

  if (!allowedPlatforms.includes(platformRaw as any)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Plataforma no válida.")}`);
  }
  const handleError = validatePublicText(handle, "El identificador", 80);
  if (handleError || handle.length < 2) {
    redirect(`${returnTo}?error=${encodeURIComponent(handleError ?? "El identificador debe tener al menos 2 caracteres.")}`);
  }

  const { error } = await supabase.from("gaming_accounts").upsert({
    user_id: user.id,
    platform: platformRaw,
    handle,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  if (error) redirect(`${returnTo}?error=${encodeURIComponent("No se pudo guardar la cuenta de plataforma.")}`);
  revalidatePath("/perfil/editar");
  revalidatePath("/mi-nivox");
  redirect(`${returnTo}?message=${encodeURIComponent("Cuenta de plataforma guardada.")}`);
}

export async function deleteGamingAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const platformRaw = String(formData.get("platform") ?? "").trim().toLowerCase();
  const returnTo = safeReturnTo(formData, "/perfil/editar");
  if (allowedPlatforms.includes(platformRaw as any)) {
    await supabase.from("gaming_accounts").delete().eq("user_id", user.id).eq("platform", platformRaw);
  }
  revalidatePath("/perfil/editar");
  revalidatePath("/mi-nivox");
  redirect(`${returnTo}?message=${encodeURIComponent("Cuenta eliminada del perfil.")}`);
}
