import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MaterialIcon } from "@/components/MaterialIcon";
import { StructuredData } from "@/components/StructuredData";
import { absoluteUrl } from "@/lib/site";

type Params = Promise<{ slug:string }>;
export async function generateMetadata({params}:{params:Params}):Promise<Metadata>{ const {slug}=await params; if(!isSupabaseConfigured()) return {title:"Noticia"}; const s=await createClient(); const {data:a}=await s.from("articles").select("title,excerpt,cover_url").eq("slug",slug).eq("status","published").maybeSingle(); if(!a) return {title:"Noticia"}; return {title:a.title,description:a.excerpt,alternates:{canonical:`/noticias/${slug}`},openGraph:{type:"article",title:a.title,description:a.excerpt,url:`/noticias/${slug}`,images:a.cover_url?[{url:a.cover_url}]:undefined},twitter:{card:"summary_large_image",title:a.title,description:a.excerpt,images:a.cover_url?[a.cover_url]:undefined}};}
export default async function NoticiaDetalle({ params }: { params: Params }) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const supabase = await createClient();
  const { data:a } = await supabase.from("articles").select("slug,title,category,game_slug,excerpt,body,cover_url,published_at").eq("slug",slug).eq("status","published").maybeSingle();
  if(!a) notFound();
  let gameTitle: string | null = null;
  if (a.game_slug) {
    const { data: game } = await supabase.from("games").select("title").eq("slug", a.game_slug).maybeSingle();
    gameTitle = game?.title ?? null;
  }
  const jsonLd={"@context":"https://schema.org","@type":"NewsArticle",headline:a.title,description:a.excerpt,image:a.cover_url||undefined,datePublished:a.published_at||undefined,dateModified:a.published_at||undefined,author:{"@type":"Organization",name:"NIVOX"},publisher:{"@type":"Organization",name:"NIVOX"},mainEntityOfPage:absoluteUrl(`/noticias/${slug}`)};
  return <><StructuredData data={jsonLd}/><article className="shell editorialPage"><Link className="backLink" href="/noticias"><MaterialIcon name="arrow_back" size={17}/>Noticias</Link><header><div className="editorialTags"><span className="tag">{a.category}</span>{a.game_slug && <Link className="tag linkedTag" href={`/juegos/${a.game_slug}`}>{gameTitle ?? a.game_slug}</Link>}</div><h1>{a.title}</h1><p className="lead">{a.excerpt}</p><small>{a.published_at ? new Date(a.published_at).toLocaleDateString("es-ES") : ""} · NIVOX</small></header>{a.cover_url && <img className="editorialCover" src={a.cover_url} alt=""/>}<div className="editorialBody">{a.body.split(/\n\n+/).map((p:string,i:number)=><p key={i}>{p}</p>)}</div></article></>;
}
