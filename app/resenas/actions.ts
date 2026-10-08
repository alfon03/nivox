"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { validatePublicText } from "@/lib/validation";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeReturn(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function withMessage(path: string, key: "error" | "message", value: string) {
  const hashAt = path.indexOf("#");
  const base = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const hash = hashAt >= 0 ? path.slice(hashAt) : "";
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}${new URLSearchParams({ [key]: value }).toString()}${hash}`;
}

function parseReviewScore(raw: string) {
  const score = Number(raw.replace(",", "."));
  if (!Number.isFinite(score) || score < 1 || score > 10) return null;
  const doubled = score * 2;
  if (Math.abs(doubled - Math.round(doubled)) > 0.00001) return null;
  return Number(score.toFixed(1));
}

function validateReview(score: number | null, body: string) {
  if (score === null) return "La nota debe estar entre 1 y 10 y usar pasos de 0,5.";
  if (body.length < 20) return "La reseña debe tener al menos 20 caracteres.";
  return validatePublicText(body, "La reseña", 5000);
}

export async function createGameReview(formData: FormData) {
  const gameSlug = text(formData, "game_slug");
  const returnTo = safeReturn(text(formData, "return_to"), `/juegos/${gameSlug}#resenas`);
  const body = text(formData, "body");
  const score = parseReviewScore(text(formData, "score"));
  const validation = validateReview(score, body);
  if (!gameSlug) redirect("/juegos");
  if (validation) redirect(withMessage(returnTo, "error", validation));

  const { supabase, user } = await requireUser(returnTo);
  const { data: game } = await supabase.from("games").select("slug").eq("slug", gameSlug).eq("status", "published").maybeSingle();
  if (!game) redirect("/juegos");

  const { error } = await supabase.from("game_reviews").insert({
    game_slug: gameSlug,
    author_id: user.id,
    score,
    body,
    status: "published",
  });

  if (error) {
    const message = error.code === "23505" ? "Ya has publicado una reseña de este juego. Puedes editar la que ya tienes." : error.message;
    redirect(withMessage(returnTo, "error", message));
  }

  revalidatePath(`/juegos/${gameSlug}`);
  revalidatePath("/ranking");
  revalidatePath("/mi-nivox");
  redirect(withMessage(returnTo, "message", "Reseña publicada."));
}

export async function updateGameReview(formData: FormData) {
  const reviewId = text(formData, "review_id");
  const gameSlug = text(formData, "game_slug");
  const returnTo = safeReturn(text(formData, "return_to"), `/juegos/${gameSlug}#resenas`);
  const body = text(formData, "body");
  const score = parseReviewScore(text(formData, "score"));
  const validation = validateReview(score, body);
  if (!reviewId || !gameSlug) redirect("/juegos");
  if (validation) redirect(withMessage(returnTo, "error", validation));

  const { supabase, user } = await requireUser(returnTo);
  const { error } = await supabase.from("game_reviews")
    .update({ score, body })
    .eq("id", reviewId)
    .eq("author_id", user.id)
    .eq("game_slug", gameSlug);
  if (error) redirect(withMessage(returnTo, "error", error.message));

  revalidatePath(`/juegos/${gameSlug}`);
  revalidatePath("/ranking");
  redirect(withMessage(returnTo, "message", "Reseña actualizada."));
}

export async function deleteGameReview(formData: FormData) {
  const reviewId = text(formData, "review_id");
  const gameSlug = text(formData, "game_slug");
  const returnTo = safeReturn(text(formData, "return_to"), `/juegos/${gameSlug}#resenas`);
  if (!reviewId || !gameSlug) redirect("/juegos");
  const { supabase, user } = await requireUser(returnTo);
  await supabase.from("game_reviews").delete().eq("id", reviewId).eq("author_id", user.id);
  revalidatePath(`/juegos/${gameSlug}`);
  revalidatePath("/ranking");
  revalidatePath("/mi-nivox");
  redirect(withMessage(returnTo, "message", "Reseña eliminada."));
}

export async function voteGameReview(formData: FormData) {
  const reviewId = text(formData, "review_id");
  const gameSlug = text(formData, "game_slug");
  const returnTo = safeReturn(text(formData, "return_to"), `/juegos/${gameSlug}#resenas`);
  const value = text(formData, "value");
  if (!reviewId || !gameSlug || !["helpful", "unhelpful"].includes(value)) return;
  const isHelpful = value === "helpful";
  const { supabase, user } = await requireUser(returnTo);

  const { data: review } = await supabase.from("game_reviews").select("id,author_id,status").eq("id", reviewId).eq("game_slug", gameSlug).maybeSingle();
  if (!review || review.status !== "published" || review.author_id === user.id) {
    redirect(withMessage(returnTo, "error", review?.author_id === user.id ? "No puedes votar tu propia reseña." : "La reseña no está disponible."));
  }

  const { data: existing } = await supabase.from("game_review_votes").select("is_helpful").eq("review_id", reviewId).eq("user_id", user.id).maybeSingle();
  if (existing && existing.is_helpful === isHelpful) {
    await supabase.from("game_review_votes").delete().eq("review_id", reviewId).eq("user_id", user.id);
  } else if (existing) {
    await supabase.from("game_review_votes").update({ is_helpful: isHelpful }).eq("review_id", reviewId).eq("user_id", user.id);
  } else {
    await supabase.from("game_review_votes").insert({ review_id: reviewId, user_id: user.id, is_helpful: isHelpful });
  }

  revalidatePath(`/juegos/${gameSlug}`);
  revalidatePath("/ranking");
}

export async function reportGameReview(formData: FormData) {
  const reviewId = text(formData, "review_id");
  const gameSlug = text(formData, "game_slug");
  const reason = text(formData, "reason");
  const returnTo = safeReturn(text(formData, "return_to"), `/juegos/${gameSlug}#resenas`);
  const validation = reason.length < 3 ? "Explica brevemente el motivo de la denuncia." : validatePublicText(reason, "El motivo", 500);
  if (validation) redirect(withMessage(returnTo, "error", validation));
  const { supabase, user } = await requireUser(returnTo);
  const { data: review } = await supabase.from("game_reviews").select("id,author_id").eq("id", reviewId).maybeSingle();
  if (!review) redirect(withMessage(returnTo, "error", "La reseña no existe."));
  if (review.author_id === user.id) redirect(withMessage(returnTo, "error", "No puedes denunciar tu propia reseña."));

  const { error } = await supabase.from("content_reports").insert({ reporter_id: user.id, content_type: "review", content_id: reviewId, reason, status: "open" });
  if (error && error.code !== "23505") redirect(withMessage(returnTo, "error", error.message));
  redirect(withMessage(returnTo, "message", error?.code === "23505" ? "Ya habías denunciado esta reseña." : "Gracias. Revisaremos la reseña."));
}
