import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  const staticRoutes = ["", "/noticias", "/juegos", "/guias", "/comunidad", "/lanzamientos", "/ranking", "/logros", "/buscar", "/normas-comunidad", "/privacidad", "/cookies", "/terminos", "/aviso-legal", "/contacto"];
  const entries: MetadataRoute.Sitemap = staticRoutes.map<MetadataRoute.Sitemap[number]>((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/noticias" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  if (!isSupabaseConfigured()) return entries;
  try {
    const supabase = createPublicClient();
    const [{ data: games }, { data: articles }, { data: guides }] = await Promise.all([
      supabase.from("games").select("slug").eq("status", "published"),
      supabase.from("articles").select("slug,updated_at,published_at").eq("status", "published"),
      supabase.from("guides").select("slug,updated_at,published_at").eq("status", "published"),
    ]);
    for (const game of games ?? []) entries.push({ url: `${base}/juegos/${game.slug}`, changeFrequency: "weekly", priority: 0.8 });
    for (const article of articles ?? []) entries.push({ url: `${base}/noticias/${article.slug}`, lastModified: article.updated_at ?? article.published_at ?? now, changeFrequency: "monthly", priority: 0.75 });
    for (const guide of guides ?? []) entries.push({ url: `${base}/guias/${guide.slug}`, lastModified: guide.updated_at ?? guide.published_at ?? now, changeFrequency: "monthly", priority: 0.75 });
  } catch {
    // El sitemap estático sigue disponible aunque Supabase no responda temporalmente.
  }
  return entries;
}
