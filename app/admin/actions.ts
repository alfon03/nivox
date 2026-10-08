"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { formText, nullableText, normalizeSlug, parseScore, validateSlug } from "@/lib/content";
import { validatePublicText } from "@/lib/validation";

function url(path: string, key: "error" | "message", text: string) {
  const params = new URLSearchParams({ [key]: text });
  return `${path}?${params.toString()}`;
}

function validateEditorial(title: string, body: string, summary: string, summaryLabel: string) {
  if (!title) return "El título es obligatorio.";
  if (!summary) return `${summaryLabel} es obligatorio.`;
  if (!body) return "El contenido es obligatorio.";
  const titleError = validatePublicText(title, "El título", 140);
  if (titleError) return titleError;
  const summaryError = validatePublicText(summary, summaryLabel, 320);
  if (summaryError) return summaryError;
  return validatePublicText(body, "El contenido", 30000);
}

export async function createArticle(formData: FormData) {
  const { supabase, user } = await requireAdmin("/admin/noticias/nueva");
  const title = formText(formData, "title");
  const category = formText(formData, "category") || "Actualidad";
  const excerpt = formText(formData, "excerpt");
  const body = formText(formData, "body");
  const slug = normalizeSlug(formText(formData, "slug") || title);
  const status = formText(formData, "status") === "published" ? "published" : "draft";
  const error = validateEditorial(title, body, excerpt, "El resumen") || validateSlug(slug) || validatePublicText(category, "La categoría", 40);
  if (error) redirect(url("/admin/noticias/nueva", "error", error));

  const { error: dbError } = await supabase.from("articles").insert({
    title, slug, category, game_slug: nullableText(formData, "game_slug"), excerpt, body, cover_url: nullableText(formData, "cover_url"), status,
    author_id: user.id, published_at: status === "published" ? new Date().toISOString() : null,
  });
  if (dbError) {
    const msg = dbError.code === "23505" ? "Ya existe una noticia con ese slug." : dbError.message;
    redirect(url("/admin/noticias/nueva", "error", msg));
  }
  revalidatePath("/noticias"); revalidatePath("/admin"); revalidatePath("/admin/noticias");
  redirect(url("/admin/noticias", "message", "Noticia creada."));
}

export async function updateArticle(formData: FormData) {
  const id = formText(formData, "id");
  const { supabase } = await requireAdmin(`/admin/noticias/${id}/editar`);
  const title = formText(formData, "title");
  const category = formText(formData, "category") || "Actualidad";
  const excerpt = formText(formData, "excerpt");
  const body = formText(formData, "body");
  const slug = normalizeSlug(formText(formData, "slug") || title);
  const status = formText(formData, "status") === "published" ? "published" : "draft";
  const error = validateEditorial(title, body, excerpt, "El resumen") || validateSlug(slug) || validatePublicText(category, "La categoría", 40);
  if (error) redirect(url(`/admin/noticias/${id}/editar`, "error", error));

  const { data: current } = await supabase.from("articles").select("status,published_at").eq("id", id).maybeSingle();
  const { error: dbError } = await supabase.from("articles").update({
    title, slug, category, game_slug: nullableText(formData, "game_slug"), excerpt, body, cover_url: nullableText(formData, "cover_url"), status,
    published_at: status === "published" ? (current?.published_at ?? new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (dbError) redirect(url(`/admin/noticias/${id}/editar`, "error", dbError.code === "23505" ? "Ese slug ya está en uso." : dbError.message));
  revalidatePath("/noticias"); revalidatePath(`/noticias/${slug}`); revalidatePath("/admin/noticias");
  redirect(url("/admin/noticias", "message", "Noticia actualizada."));
}

export async function deleteArticle(formData: FormData) {
  const id = formText(formData, "id");
  const { supabase } = await requireAdmin("/admin/noticias");
  await supabase.from("articles").delete().eq("id", id);
  revalidatePath("/noticias"); revalidatePath("/admin/noticias"); revalidatePath("/admin");
}

export async function createGuide(formData: FormData) {
  const { supabase, user } = await requireAdmin("/admin/guias/nueva");
  const title = formText(formData, "title");
  const summary = formText(formData, "summary");
  const body = formText(formData, "body");
  const slug = normalizeSlug(formText(formData, "slug") || title);
  const status = formText(formData, "status") === "published" ? "published" : "draft";
  const error = validateEditorial(title, body, summary, "El resumen") || validateSlug(slug);
  if (error) redirect(url("/admin/guias/nueva", "error", error));

  const { error: dbError } = await supabase.from("guides").insert({
    title, slug, summary, body, game_slug: nullableText(formData, "game_slug"), cover_url: nullableText(formData, "cover_url"), status,
    author_id: user.id, published_at: status === "published" ? new Date().toISOString() : null,
  });
  if (dbError) redirect(url("/admin/guias/nueva", "error", dbError.code === "23505" ? "Ese slug ya está en uso." : dbError.message));
  revalidatePath("/guias"); revalidatePath("/admin/guias"); revalidatePath("/admin");
  redirect(url("/admin/guias", "message", "Guía creada."));
}

export async function updateGuide(formData: FormData) {
  const id = formText(formData, "id");
  const { supabase } = await requireAdmin(`/admin/guias/${id}/editar`);
  const title = formText(formData, "title");
  const summary = formText(formData, "summary");
  const body = formText(formData, "body");
  const slug = normalizeSlug(formText(formData, "slug") || title);
  const status = formText(formData, "status") === "published" ? "published" : "draft";
  const error = validateEditorial(title, body, summary, "El resumen") || validateSlug(slug);
  if (error) redirect(url(`/admin/guias/${id}/editar`, "error", error));

  const { data: current } = await supabase.from("guides").select("published_at").eq("id", id).maybeSingle();
  const { error: dbError } = await supabase.from("guides").update({
    title, slug, summary, body, game_slug: nullableText(formData, "game_slug"), cover_url: nullableText(formData, "cover_url"), status,
    published_at: status === "published" ? (current?.published_at ?? new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (dbError) redirect(url(`/admin/guias/${id}/editar`, "error", dbError.code === "23505" ? "Ese slug ya está en uso." : dbError.message));
  revalidatePath("/guias"); revalidatePath(`/guias/${slug}`); revalidatePath("/admin/guias");
  redirect(url("/admin/guias", "message", "Guía actualizada."));
}

export async function deleteGuide(formData: FormData) {
  const id = formText(formData, "id");
  const { supabase } = await requireAdmin("/admin/guias");
  await supabase.from("guides").delete().eq("id", id);
  revalidatePath("/guias"); revalidatePath("/admin/guias"); revalidatePath("/admin");
}

function validateGameText(title: string, description: string) {
  if (!title) return "El nombre del juego es obligatorio.";
  return validatePublicText(title, "El nombre", 120) || validatePublicText(description, "La descripción", 1200);
}

async function resolveGameCover(supabase: SupabaseClient, formData: FormData, slug: string) {
  const manualUrl = nullableText(formData, "cover_url");
  const file = formData.get("cover_file");
  if (!(file instanceof File) || file.size === 0) return manualUrl;

  const allowed: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = allowed[file.type];
  if (!ext) throw new Error("La portada debe ser JPG, PNG o WEBP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La portada no puede superar 5 MB.");

  const objectPath = `${slug}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("game-covers").upload(objectPath, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir la portada: ${error.message}`);
  const { data } = supabase.storage.from("game-covers").getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function createGame(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/juegos/nuevo");
  const title = formText(formData, "title");
  const slug = normalizeSlug(formText(formData, "slug") || title);
  const description = formText(formData, "description");
  const scoreRaw = formText(formData, "score");
  const score = parseScore(scoreRaw);
  const error = validateGameText(title, description) || validateSlug(slug) || (scoreRaw && score === null ? "La nota debe estar entre 0 y 10." : null);
  if (error) redirect(url("/admin/juegos/nuevo", "error", error));
  let coverUrl: string | null = null;
  try { coverUrl = await resolveGameCover(supabase, formData, slug); }
  catch (coverError) { redirect(url("/admin/juegos/nuevo", "error", coverError instanceof Error ? coverError.message : "No se pudo procesar la portada.")); }
  const { error: dbError } = await supabase.from("games").insert({
    slug, title, genre: nullableText(formData, "genre"), platform: nullableText(formData, "platform"), score,
    accent: formText(formData, "accent") || "sunset", description: description || null, release_date: nullableText(formData, "release_date"),
    developer: nullableText(formData, "developer"), publisher: nullableText(formData, "publisher"), cover_url: coverUrl,
    status: formText(formData, "status") === "draft" ? "draft" : "published",
  });
  if (dbError) redirect(url("/admin/juegos/nuevo", "error", dbError.code === "23505" ? "Ya existe un juego con ese slug." : dbError.message));
  revalidatePath("/juegos"); revalidatePath("/admin/juegos"); revalidatePath("/admin");
  redirect(url("/admin/juegos", "message", "Juego creado."));
}

export async function updateGame(formData: FormData) {
  const originalSlug = formText(formData, "original_slug");
  const { supabase } = await requireAdmin(`/admin/juegos/${encodeURIComponent(originalSlug)}/editar`);
  const title = formText(formData, "title");
  const slug = normalizeSlug(formText(formData, "slug") || title);
  const description = formText(formData, "description");
  const scoreRaw = formText(formData, "score");
  const score = parseScore(scoreRaw);
  const error = validateGameText(title, description) || validateSlug(slug) || (scoreRaw && score === null ? "La nota debe estar entre 0 y 10." : null);
  if (error) redirect(url(`/admin/juegos/${encodeURIComponent(originalSlug)}/editar`, "error", error));
  let coverUrl: string | null = null;
  try { coverUrl = await resolveGameCover(supabase, formData, slug); }
  catch (coverError) { redirect(url(`/admin/juegos/${encodeURIComponent(originalSlug)}/editar`, "error", coverError instanceof Error ? coverError.message : "No se pudo procesar la portada.")); }

  const { error: dbError } = await supabase.from("games").update({
    slug, title, genre: nullableText(formData, "genre"), platform: nullableText(formData, "platform"), score,
    accent: formText(formData, "accent") || "sunset", description: description || null, release_date: nullableText(formData, "release_date"),
    developer: nullableText(formData, "developer"), publisher: nullableText(formData, "publisher"), cover_url: coverUrl,
    status: formText(formData, "status") === "draft" ? "draft" : "published",
  }).eq("slug", originalSlug);
  if (dbError) redirect(url(`/admin/juegos/${encodeURIComponent(originalSlug)}/editar`, "error", dbError.code === "23505" ? "Ese slug ya está en uso." : dbError.message));
  revalidatePath("/juegos"); revalidatePath(`/juegos/${slug}`); revalidatePath("/admin/juegos");
  redirect(url("/admin/juegos", "message", "Juego actualizado."));
}

export async function deleteGame(formData: FormData) {
  const slug = formText(formData, "slug");
  const { supabase } = await requireAdmin("/admin/juegos");
  const { error } = await supabase.from("games").delete().eq("slug", slug);
  if (error) redirect(url("/admin/juegos", "error", "No se pudo borrar. Puede tener guías o usuarios vinculados."));
  revalidatePath("/juegos"); revalidatePath("/admin/juegos"); revalidatePath("/admin");
}

export async function reviewReport(formData: FormData) {
  const id = formText(formData, "id");
  const status = formText(formData, "status") === "dismissed" ? "dismissed" : "resolved";
  const { supabase, user } = await requireAdmin("/admin/moderacion");
  await supabase.from("content_reports").update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/moderacion"); revalidatePath("/admin");
}

export async function moderateCommunityReport(formData: FormData) {
  const id = formText(formData, "id");
  const decision = formText(formData, "decision");
  const { supabase, user } = await requireAdmin("/admin/moderacion");
  const { data: report } = await supabase
    .from("content_reports")
    .select("id,content_type,content_id,status")
    .eq("id", id)
    .maybeSingle();
  if (!report || report.status !== "open") {
    redirect(url("/admin/moderacion", "error", "La denuncia ya no está pendiente."));
  }

  if (decision === "hide") {
    if (report.content_type === "post") {
      await supabase.from("community_posts").update({ status: "hidden" }).eq("id", report.content_id);
    } else if (report.content_type === "comment") {
      await supabase.from("community_comments").update({ status: "hidden" }).eq("id", report.content_id);
    } else if (report.content_type === "review") {
      await supabase.from("game_reviews").update({ status: "hidden" }).eq("id", report.content_id);
    } else {
      redirect(url("/admin/moderacion", "error", "Este tipo de denuncia requiere revisión manual; no puede ocultarse con esta acción."));
    }
  }

  const status = decision === "dismiss" ? "dismissed" : "resolved";
  await supabase.from("content_reports").update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/moderacion");
  revalidatePath("/admin");
  revalidatePath("/comunidad");
  revalidatePath("/juegos", "layout");
  revalidatePath("/ranking");
  redirect(url("/admin/moderacion", "message", decision === "hide" ? "Contenido ocultado y denuncia resuelta." : status === "dismissed" ? "Denuncia descartada." : "Denuncia resuelta."));
}
