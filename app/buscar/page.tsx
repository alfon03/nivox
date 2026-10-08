import Link from "next/link";
import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Buscar" };
type Props = { searchParams: Promise<{ q?: string }> };

function cleanQuery(value: string) { return value.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 80); }

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const term = cleanQuery(q);
  if (!term) return <div className="shell searchPage pageStack"><section className="pageHero compact"><span className="eyebrow">BÚSQUEDA NIVOX</span><h1>Encuentra lo que buscas</h1><p>Busca juegos, noticias, guías, usuarios y conversaciones.</p></section></div>;
  if (!isSupabaseConfigured()) return <div className="shell searchPage"><div className="notice error">Conecta Supabase para usar la búsqueda.</div></div>;
  const supabase = await createClient();
  const like = `%${term}%`;
  const [games, articles, guides, profiles, posts] = await Promise.all([
    supabase.from("games").select("slug,title,genre,platform").eq("status", "published").or(`title.ilike.${like},slug.ilike.${like}`).limit(8),
    supabase.from("articles").select("slug,title,category,excerpt").eq("status", "published").or(`title.ilike.${like},excerpt.ilike.${like}`).limit(8),
    supabase.from("guides").select("slug,title,summary,game_slug").eq("status", "published").or(`title.ilike.${like},summary.ilike.${like}`).limit(8),
    supabase.from("profiles").select("username,full_name,bio").or(`username.ilike.${like},full_name.ilike.${like}`).limit(8),
    supabase.from("community_posts").select("id,title,body,type,vote_count,comment_count").eq("status", "published").or(`title.ilike.${like},body.ilike.${like}`).limit(10),
  ]);
  const total = [games, articles, guides, profiles, posts].reduce((n, r) => n + (r.data?.length ?? 0), 0);
  return <div className="shell searchPage pageStack">
    <section className="pageHero compact"><span className="eyebrow">BÚSQUEDA GLOBAL</span><h1>“{term}”</h1><p>{total} resultados encontrados en NIVOX.</p></section>
    {total === 0 && <div className="panel emptyState"><MaterialIcon name="search_off" size={36} /><h3>Sin resultados</h3><p>Prueba con otro nombre, juego o palabra clave.</p></div>}
    {!!games.data?.length && <SearchSection icon="sports_esports" title="Juegos">{games.data.map(x => <Link className="searchResult" key={x.slug} href={`/juegos/${x.slug}`}><b>{x.title}</b><span>{[x.genre, x.platform].filter(Boolean).join(" · ")}</span></Link>)}</SearchSection>}
    {!!articles.data?.length && <SearchSection icon="newspaper" title="Noticias">{articles.data.map(x => <Link className="searchResult" key={x.slug} href={`/noticias/${x.slug}`}><b>{x.title}</b><span>{x.category} · {x.excerpt}</span></Link>)}</SearchSection>}
    {!!guides.data?.length && <SearchSection icon="menu_book" title="Guías">{guides.data.map(x => <Link className="searchResult" key={x.slug} href={`/guias/${x.slug}`}><b>{x.title}</b><span>{x.summary}</span></Link>)}</SearchSection>}
    {!!profiles.data?.length && <SearchSection icon="person" title="Usuarios">{profiles.data.map(x => <Link className="searchResult" key={x.username} href={`/usuarios/${x.username}`}><b>@{x.username}</b><span>{x.full_name || x.bio || "Miembro de NIVOX"}</span></Link>)}</SearchSection>}
    {!!posts.data?.length && <SearchSection icon="forum" title="Comunidad">{posts.data.map(x => <Link className="searchResult" key={x.id} href={`/comunidad/${x.id}`}><b>{x.title}</b><span className="inlineMetrics"><span><MaterialIcon name="arrow_upward" size={15}/>{x.vote_count}</span><span><MaterialIcon name="chat_bubble" size={15}/>{x.comment_count}</span></span></Link>)}</SearchSection>}
  </div>;
}

function SearchSection({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return <section><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name={icon} size={22}/>{title}</h2></div><div className="searchResults panel">{children}</div></section>;
}
