import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  const { supabase, profile } = await requireAdmin("/admin");

  const [articles, guides, games, reports, posts, comments, reviews] = await Promise.all([
    supabase.from("articles").select("id,status", { count: "exact", head: false }),
    supabase.from("guides").select("id,status", { count: "exact", head: false }),
    supabase.from("games").select("slug,status", { count: "exact", head: false }),
    supabase.from("content_reports").select("id,status", { count: "exact", head: false }).eq("status", "open"),
    supabase.from("community_posts").select("id", { count: "exact", head: true }),
    supabase.from("community_comments").select("id", { count: "exact", head: true }),
    supabase.from("game_reviews").select("id", { count: "exact", head: true }),
  ]);

  const publishedArticles = articles.data?.filter(x => x.status === "published").length ?? 0;
  const publishedGuides = guides.data?.filter(x => x.status === "published").length ?? 0;

  return (
    <div className="shell pageStack">
      <section className="pageHero compact"><span className="eyebrow">PANEL PRIVADO</span><h1>Administración NIVOX</h1><p>Hola, {profile.username}. Publica contenido y controla la plataforma desde aquí.</p></section>
      <AdminNav />
      <section className="adminStats communityAdminStats">
        <article className="panel"><span>Noticias</span><b>{articles.count ?? 0}</b><small>{publishedArticles} publicadas</small></article>
        <article className="panel"><span>Guías</span><b>{guides.count ?? 0}</b><small>{publishedGuides} publicadas</small></article>
        <article className="panel"><span>Juegos</span><b>{games.count ?? 0}</b><small>fichas totales</small></article>
        <article className="panel"><span>Comunidad</span><b>{posts.count ?? 0}</b><small>{comments.count ?? 0} comentarios · {reviews.count ?? 0} reseñas</small></article>
        <article className="panel"><span>Reportes</span><b>{reports.count ?? 0}</b><small>pendientes</small></article>
      </section>
      <section className="panel productionChecklist"><div><span className="eyebrow">PRODUCCIÓN</span><h2>Checklist de lanzamiento</h2></div><div className="productionChecks"><span className={process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost") ? "ok" : "pending"}>URL pública</span><span className={process.env.NEXT_PUBLIC_LEGAL_NAME && !process.env.NEXT_PUBLIC_LEGAL_NAME.startsWith("Tu ") ? "ok" : "pending"}>Datos legales</span><span className="ok">RLS + antispam</span><span className="ok">SEO + sitemap</span><span className="ok">Health check</span></div><p className="muted">Antes de abrir NIVOX al público, configura el dominio, SMTP y los datos legales reales. Comprueba también <code>/api/health</code>.</p></section>
      <section className="adminGrid">
        <article className="panel adminCard"><b className="titleWithIcon"><MaterialIcon name="newspaper" size={18}/>EDITORIAL</b><h2>Noticias</h2><p>Crea borradores, publica noticias y edita contenido existente.</p><Link className="primaryBtn inlineBtn" href="/admin/noticias">Gestionar noticias</Link></article>
        <article className="panel adminCard"><b className="titleWithIcon"><MaterialIcon name="menu_book" size={18}/>CONTENIDO</b><h2>Guías</h2><p>Publica guías asociadas a juegos de la base de datos.</p><Link className="primaryBtn inlineBtn" href="/admin/guias">Gestionar guías</Link></article>
        <article className="panel adminCard"><b className="titleWithIcon"><MaterialIcon name="sports_esports" size={18}/>CATÁLOGO</b><h2>Juegos</h2><p>Da de alta y actualiza fichas, notas y fechas de lanzamiento.</p><Link className="primaryBtn inlineBtn" href="/admin/juegos">Gestionar juegos</Link></article>
        <article className="panel adminCard"><b className="titleWithIcon"><MaterialIcon name="shield" size={18}/>COMUNIDAD</b><h2>Moderación</h2><p>Revisa denuncias y oculta publicaciones, comentarios o reseñas que incumplan las normas.</p><Link className="primaryBtn inlineBtn" href="/admin/moderacion">Abrir moderación</Link></article>
      </section>
    </div>
  );
}
