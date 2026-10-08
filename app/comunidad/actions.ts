"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isCommunityType, isUuid, validateCommunityImageUrl } from "@/lib/community";
import { validatePublicText } from "@/lib/validation";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function withMessage(path: string, key: "error" | "message", value: string) {
  const params = new URLSearchParams({ [key]: value });
  return `${path}?${params.toString()}`;
}

function validatePost(title: string, body: string) {
  if (title.length < 5) return "El título debe tener al menos 5 caracteres.";
  if (body.length < 10) return "La publicación debe tener al menos 10 caracteres.";
  return validatePublicText(title, "El título", 140) || validatePublicText(body, "La publicación", 5000);
}

export async function createCommunityPost(formData: FormData) {
  const { supabase, user } = await requireUser("/comunidad/nueva");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const typeRaw = text(formData, "type");
  const type = isCommunityType(typeRaw) ? typeRaw : "debate";
  const gameSlug = text(formData, "game_slug") || null;
  const imageUrl = text(formData, "image_url") || null;
  const hasSpoiler = formData.get("has_spoiler") === "on";
  const validation = validatePost(title, body) || validateCommunityImageUrl(imageUrl ?? "");
  if (validation) redirect(withMessage("/comunidad/nueva", "error", validation));

  if (gameSlug) {
    const { data: game } = await supabase.from("games").select("slug").eq("slug", gameSlug).eq("status", "published").maybeSingle();
    if (!game) redirect(withMessage("/comunidad/nueva", "error", "El juego seleccionado no existe."));
  }

  const { data, error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    title,
    body,
    type,
    game_slug: gameSlug,
    image_url: imageUrl,
    has_spoiler: hasSpoiler,
    status: "published",
  }).select("id").single();

  if (error || !data) redirect(withMessage("/comunidad/nueva", "error", error?.message ?? "No se pudo publicar."));
  revalidatePath("/comunidad");
  revalidatePath("/mi-nivox");
  redirect(`/comunidad/${data.id}`);
}

export async function toggleCommunityVote(formData: FormData) {
  const postId = text(formData, "post_id");
  const returnTo = text(formData, "return_to") || "/comunidad";
  if (!isUuid(postId)) return;
  const { supabase, user } = await requireUser(returnTo);
  const { data: existing } = await supabase.from("community_votes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing) await supabase.from("community_votes").delete().eq("post_id", postId).eq("user_id", user.id);
  else await supabase.from("community_votes").insert({ post_id: postId, user_id: user.id });
  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${postId}`);
  revalidatePath("/notificaciones");
  revalidatePath("/", "layout");
}

export async function createCommunityComment(formData: FormData) {
  const postId = text(formData, "post_id");
  const parentCommentId = text(formData, "parent_comment_id") || null;
  if (!isUuid(postId)) redirect("/comunidad");
  if (parentCommentId && !isUuid(parentCommentId)) redirect(withMessage(`/comunidad/${postId}`, "error", "La respuesta no es válida."));
  const body = text(formData, "body");
  const error = body.length < 2 ? "El comentario es demasiado corto." : validatePublicText(body, "El comentario", 2000);
  if (error) redirect(withMessage(`/comunidad/${postId}`, "error", error));
  const { supabase, user } = await requireUser(`/comunidad/${postId}`);
  const { error: dbError } = await supabase.from("community_comments").insert({ post_id: postId, author_id: user.id, body, status: "published", parent_comment_id: parentCommentId });
  if (dbError) redirect(withMessage(`/comunidad/${postId}`, "error", dbError.message));
  revalidatePath(`/comunidad/${postId}`);
  revalidatePath("/comunidad");
  revalidatePath("/notificaciones");
  revalidatePath("/", "layout");
  redirect(`/comunidad/${postId}#comentarios`);
}

export async function deleteCommunityPost(formData: FormData) {
  const postId = text(formData, "post_id");
  if (!isUuid(postId)) return;
  const { supabase, user } = await requireUser(`/comunidad/${postId}`);
  const { data: post } = await supabase.from("community_posts").select("image_url").eq("id", postId).eq("author_id", user.id).maybeSingle();
  const { error } = await supabase.from("community_posts").delete().eq("id", postId).eq("author_id", user.id);
  if (!error && post?.image_url) {
    try {
      const marker = "/storage/v1/object/public/community-media/";
      const pathname = new URL(post.image_url).pathname;
      const at = pathname.indexOf(marker);
      if (at >= 0) {
        const storagePath = decodeURIComponent(pathname.slice(at + marker.length));
        if (storagePath.startsWith(`${user.id}/`)) await supabase.storage.from("community-media").remove([storagePath]);
      }
    } catch { /* La publicación ya está eliminada; no bloqueamos por limpieza de Storage. */ }
  }
  revalidatePath("/comunidad");
  revalidatePath("/mi-nivox");
  redirect("/comunidad?message=Publicación+eliminada");
}

export async function deleteCommunityComment(formData: FormData) {
  const commentId = text(formData, "comment_id");
  const postId = text(formData, "post_id");
  if (!isUuid(commentId) || !isUuid(postId)) return;
  const { supabase, user } = await requireUser(`/comunidad/${postId}`);
  await supabase.from("community_comments").delete().eq("id", commentId).eq("author_id", user.id);
  revalidatePath(`/comunidad/${postId}`);
  revalidatePath("/comunidad");
}

export async function reportCommunityContent(formData: FormData) {
  const contentType = text(formData, "content_type");
  const contentId = text(formData, "content_id");
  const postId = text(formData, "post_id");
  const explicitReturnTo = text(formData, "return_to");
  const reason = text(formData, "reason");
  const allowed = ["post", "comment", "profile", "image"];
  if (!allowed.includes(contentType) || !contentId) redirect("/comunidad");

  const fallbackReturn = postId && isUuid(postId) ? `/comunidad/${postId}` : "/comunidad";
  const returnTo = explicitReturnTo.startsWith("/") && !explicitReturnTo.startsWith("//") ? explicitReturnTo : fallbackReturn;
  const reportPath = contentType === "comment" && postId && isUuid(postId)
    ? `/comunidad/${postId}/denunciar?type=comment&content=${encodeURIComponent(contentId)}`
    : contentType === "profile"
      ? `${returnTo}/denunciar`
      : `${fallbackReturn}/denunciar`;

  const validation = reason.length < 3 ? "Explica brevemente el motivo de la denuncia." : validatePublicText(reason, "El motivo", 500);
  if (validation) {
    const join = reportPath.includes("?") ? "&" : "?";
    redirect(`${reportPath}${join}error=${encodeURIComponent(validation)}`);
  }
  const { supabase, user } = await requireUser(reportPath);
  if (contentType === "profile" && contentId === user.id) redirect(returnTo);
  const { error } = await supabase.from("content_reports").insert({ reporter_id: user.id, content_type: contentType, content_id: contentId, reason, status: "open" });
  if (error && error.code !== "23505") {
    const join = reportPath.includes("?") ? "&" : "?";
    redirect(`${reportPath}${join}error=${encodeURIComponent(error.message)}`);
  }
  redirect(withMessage(returnTo, "message", error?.code === "23505" ? "Ya habías denunciado este contenido." : "Gracias. Revisaremos la denuncia."));
}


function storagePathFromUrl(value: string, userId: string) {
  try {
    const marker = "/storage/v1/object/public/community-media/";
    const pathname = new URL(value).pathname;
    const at = pathname.indexOf(marker);
    if (at < 0) return null;
    const path = decodeURIComponent(pathname.slice(at + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch { return null; }
}

export async function updateCommunityPost(formData: FormData) {
  const postId = text(formData, "post_id");
  if (!isUuid(postId)) redirect("/comunidad");
  const { supabase, user } = await requireUser(`/comunidad/${postId}/editar`);
  const title = text(formData, "title");
  const body = text(formData, "body");
  const typeRaw = text(formData, "type");
  const type = isCommunityType(typeRaw) ? typeRaw : "debate";
  const gameSlug = text(formData, "game_slug") || null;
  const imageUrl = text(formData, "image_url") || null;
  const hasSpoiler = formData.get("has_spoiler") === "on";
  const validation = validatePost(title, body) || validateCommunityImageUrl(imageUrl ?? "");
  if (validation) redirect(withMessage(`/comunidad/${postId}/editar`, "error", validation));

  if (gameSlug) {
    const { data: game } = await supabase.from("games").select("slug").eq("slug", gameSlug).eq("status", "published").maybeSingle();
    if (!game) redirect(withMessage(`/comunidad/${postId}/editar`, "error", "El juego seleccionado no existe."));
  }

  const { data: current } = await supabase.from("community_posts").select("image_url").eq("id", postId).eq("author_id", user.id).maybeSingle();
  if (!current) redirect("/comunidad");
  const { error } = await supabase.from("community_posts").update({ title, body, type, game_slug: gameSlug, image_url: imageUrl, has_spoiler: hasSpoiler }).eq("id", postId).eq("author_id", user.id);
  if (error) redirect(withMessage(`/comunidad/${postId}/editar`, "error", error.message));

  if (current.image_url && current.image_url !== imageUrl) {
    const oldPath = storagePathFromUrl(current.image_url, user.id);
    if (oldPath) await supabase.storage.from("community-media").remove([oldPath]);
  }
  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${postId}`);
  revalidatePath("/mi-nivox");
  redirect(withMessage(`/comunidad/${postId}`, "message", "Publicación actualizada."));
}

export async function updateCommunityComment(formData: FormData) {
  const commentId = text(formData, "comment_id");
  const postId = text(formData, "post_id");
  const body = text(formData, "body");
  if (!isUuid(commentId) || !isUuid(postId)) return;
  const validation = body.length < 2 ? "El comentario es demasiado corto." : validatePublicText(body, "El comentario", 2000);
  if (validation) redirect(withMessage(`/comunidad/${postId}`, "error", validation));
  const { supabase, user } = await requireUser(`/comunidad/${postId}`);
  const { error } = await supabase.from("community_comments").update({ body }).eq("id", commentId).eq("author_id", user.id);
  if (error) redirect(withMessage(`/comunidad/${postId}`, "error", error.message));
  revalidatePath(`/comunidad/${postId}`);
  redirect(`/comunidad/${postId}#comentario-${commentId}`);
}
