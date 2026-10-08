import Link from "next/link";
import { news as fallbackNews } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Noticias" };

export default async function NoticiasPage() {
  let articles: { id:string; slug:string; title:string; category:string; excerpt:string; published_at:string|null }[] = [];
  if (isSupabaseConfigured()) { const supabase = await createClient(); const { data } = await supabase.from("articles").select("id,slug,title,category,excerpt,published_at").eq("status","published").order("published_at",{ascending:false}).limit(30); articles = data ?? []; }
  return <div className="shell pageStack"><section className="pageHero compact"><span className="eyebrow">ACTUALIDAD</span><h1>Noticias</h1><p>Lo más importante del mundo de los videojuegos, sin ruido.</p></section><section className="contentList">{articles.length ? articles.map((item,i)=><Link href={`/noticias/${item.slug}`} className="articleRow" key={item.id}><div className={`thumb thumb-${i%4}`}></div><div><span className="tag">{item.category}</span><h2>{item.title}</h2><p>{item.excerpt}</p><small>{item.published_at ? new Date(item.published_at).toLocaleDateString("es-ES") : "NIVOX"} · Por NIVOX</small></div></Link>) : [...fallbackNews,...fallbackNews].map((item,i)=><article className="articleRow" key={`${item.title}-${i}`}><div className={`thumb thumb-${i%4}`}></div><div><span className="tag">{item.tag}</span><h2>{item.title}</h2><p>Contenido de demostración. Publica tu primera noticia desde el panel de administración.</p><small>{item.time} · Por NIVOX</small></div></article>)}</section></div>;
}
