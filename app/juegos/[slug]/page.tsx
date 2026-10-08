import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameLibraryButtons } from "@/components/GameLibraryButtons";
import { GameFollowButton } from "@/components/GameFollowButton";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchGameReviews, type ReviewSort } from "@/lib/reviews";
import { createGameReview, deleteGameReview, reportGameReview, updateGameReview, voteGameReview } from "@/app/resenas/actions";
import { MaterialIcon } from "@/components/MaterialIcon";
import { StructuredData } from "@/components/StructuredData";
import { absoluteUrl } from "@/lib/site";

type Params = Promise<{ slug:string }>;
type Search = Promise<{ reviews?: string; error?: string; message?: string }>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}

function scoreLabel(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Juego" };
  const { slug } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("title,description,cover_url").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!game) return { title: "Juego" };
  const description = game.description || `Ficha, noticias, guías y reseñas de ${game.title} en NIVOX.`;
  return {
    title: game.title, description, alternates: { canonical: `/juegos/${slug}` },
    openGraph: { type: "website", title: game.title, description, url: `/juegos/${slug}`, images: game.cover_url ? [{ url: game.cover_url }] : undefined },
    twitter: { card: "summary_large_image", title: game.title, description, images: game.cover_url ? [game.cover_url] : undefined },
  };
}

export default async function JuegoPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const query = await searchParams;
  const sort: ReviewSort = query.reviews === "recent" || query.reviews === "high" || query.reviews === "low" ? query.reviews : "helpful";
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("slug,title,genre,platform,score,accent,description,release_date,developer,publisher,cover_url,status").eq("slug",slug).eq("status","published").maybeSingle();
  if (!game) notFound();

  const [{ data: articles }, { data: guides }, reviewData, followCountResult] = await Promise.all([
    supabase.from("articles").select("slug,title,category,published_at").eq("status","published").eq("game_slug",slug).order("published_at",{ascending:false}).limit(3),
    supabase.from("guides").select("slug,title,summary").eq("status","published").eq("game_slug",slug).order("published_at",{ascending:false}).limit(4),
    fetchGameReviews(slug, sort),
    supabase.rpc("nivox_game_follow_count", { target_slug: slug }),
  ]);

  const { reviews, summary, userId, ownReview } = reviewData;
  const returnTo = `/juegos/${slug}?reviews=${sort}#resenas`;
  const buckets = [
    ["9–10", summary.bucket_9_10],
    ["7–8,5", summary.bucket_7_8],
    ["5–6,5", summary.bucket_5_6],
    ["3–4,5", summary.bucket_3_4],
    ["1–2,5", summary.bucket_1_2],
  ] as const;

  const structuredGame = { "@context": "https://schema.org", "@type": "VideoGame", name: game.title, description: game.description || undefined, image: game.cover_url || undefined, url: absoluteUrl(`/juegos/${slug}`), gamePlatform: game.platform || undefined, genre: game.genre || undefined, publisher: game.publisher ? { "@type": "Organization", name: game.publisher } : undefined, author: game.developer ? { "@type": "Organization", name: game.developer } : undefined, datePublished: game.release_date || undefined, aggregateRating: summary.review_count ? { "@type": "AggregateRating", ratingValue: summary.avg_score, ratingCount: summary.review_count, bestRating: 10, worstRating: 1 } : undefined };

  return <div className="shell pageStack"><StructuredData data={structuredGame} />
    <section className={`gameHero game-${game.accent ?? "sunset"}`} style={game.cover_url ? { backgroundImage:`linear-gradient(90deg,rgba(5,10,18,.9),rgba(5,10,18,.35)),url(${game.cover_url})`, backgroundSize:"cover", backgroundPosition:"center" } : undefined}>
      <div className="gameHeroOverlay"><span className="eyebrow">FICHA DE JUEGO</span><h1>{game.title}</h1><p>{game.genre ?? "Videojuego"} · {game.developer ?? "NIVOX"}</p><div className="gameHeroScores"><div className="scorePill">{game.score ?? "—"} <small>NIVOX</small></div><a className="scorePill communityScorePill" href="#resenas">{scoreLabel(summary.avg_score)} <small>COMUNIDAD · {summary.review_count}</small></a></div></div>
    </section>
    <div className="gameEngagementBar"><GameLibraryButtons slug={game.slug} /><GameFollowButton slug={game.slug} /><Link className="ghostBtn gameHistoryShortcut" href={`/mi-nivox/juegos/${game.slug}`}>Mi historial gamer</Link><div className="gameFollowerCount"><b>{Number(followCountResult.data ?? 0)}</b><span>siguen este juego</span></div></div>
    {query.error && <div className="notice error">{query.error}</div>}
    {query.message && <div className="notice success">{query.message}</div>}
    <section className="gameDetailGrid"><div className="pageStack"><article className="panel sectionPanel"><div className="sectionTitle"><h2>Información</h2></div><p className="lead">{game.description || "Ficha en preparación."}</p><div className="detailChips"><span>{game.genre ?? "Videojuego"}</span><span>{game.platform ?? "Plataformas por confirmar"}</span></div></article>
    <article className="panel sectionPanel"><div className="sectionTitle"><h2>Últimas noticias</h2></div><div className="newsGrid">{articles?.length ? articles.map(n=><a className="newsCard" href={`/noticias/${n.slug}`} key={n.slug}><span className="tag">{n.category}</span><h3>{n.title}</h3></a>) : <p className="muted">Todavía no hay noticias publicadas.</p>}</div></article>
    <article className="panel sectionPanel"><div className="sectionTitle"><h2>Guías</h2></div><div className="guideList">{guides?.length ? guides.map(g=><a href={`/guias/${g.slug}`} key={g.slug}><div className="guideIcon"><MaterialIcon name="arrow_outward" size={20}/></div><div><h3>{g.title}</h3><p>{g.summary}</p></div></a>) : <p className="muted">Todavía no hay guías para este juego.</p>}</div></article></div>
    <aside className="pageStack"><div className="panel sideFacts"><h2>Ficha</h2><dl><div><dt>Desarrollador</dt><dd>{game.developer ?? "—"}</dd></div><div><dt>Editora</dt><dd>{game.publisher ?? "—"}</dd></div><div><dt>Género</dt><dd>{game.genre ?? "—"}</dd></div><div><dt>Plataformas</dt><dd>{game.platform ?? "—"}</dd></div><div><dt>Lanzamiento</dt><dd>{game.release_date ? new Date(`${game.release_date}T00:00:00`).toLocaleDateString("es-ES") : "—"}</dd></div></dl></div></aside></section>

    <section id="resenas" className="pageStack reviewSection">
      <div className="reviewHeader"><div><span className="eyebrow">OPINIONES DE JUGADORES</span><h2>Reseñas de {game.title}</h2><p className="muted">Una cuenta puede publicar una sola reseña por juego y modificarla cuando quiera.</p></div><Link className="ghostBtn" href="/ranking">Ver ranking NIVOX <MaterialIcon name="arrow_forward" size={16}/></Link></div>

      <div className="reviewSummaryGrid">
        <article className="panel communityScoreCard"><span>Nota de la comunidad</span><b>{scoreLabel(summary.avg_score)}</b><strong>/ 10</strong><small>{summary.review_count} {summary.review_count === 1 ? "reseña" : "reseñas"}</small></article>
        <article className="panel scoreDistribution"><h3>Distribución</h3>{buckets.map(([label,count]) => { const percent = summary.review_count ? Math.round((count / summary.review_count) * 100) : 0; return <div className="scoreBarRow" key={label}><span>{label}</span><div className="scoreBar"><i style={{ width:`${percent}%` }} /></div><b>{count}</b></div>; })}</article>
      </div>

      {!userId ? <div className="panel reviewLogin"><div><h3>¿Ya has jugado?</h3><p>Inicia sesión para puntuar {game.title} y escribir tu reseña.</p></div><Link className="primaryBtn" href={`/auth/login?next=${encodeURIComponent(`/juegos/${slug}#resenas`)}`}>Iniciar sesión</Link></div> : ownReview ? <details className="panel reviewEditor"><summary>Tu reseña · {ownReview.score.toFixed(1)}/10 · {ownReview.status === "hidden" ? "Ocultada por moderación" : "Editar"}</summary>{ownReview.status === "hidden" && <div className="reviewModerationNote">Esta reseña está oculta. Puedes editar el texto, pero seguirá oculta hasta una revisión de moderación.</div>}<form action={updateGameReview} className="reviewForm"><input type="hidden" name="review_id" value={ownReview.id}/><input type="hidden" name="game_slug" value={slug}/><input type="hidden" name="return_to" value={returnTo}/><label>Tu nota <input name="score" type="number" min="1" max="10" step="0.5" defaultValue={ownReview.score} required/></label><label>Tu reseña <textarea name="body" minLength={20} maxLength={5000} rows={6} defaultValue={ownReview.body} required/></label><div className="reviewFormActions"><button className="primaryBtn" type="submit">Guardar cambios</button></div></form><form action={deleteGameReview} className="deleteReviewForm"><input type="hidden" name="review_id" value={ownReview.id}/><input type="hidden" name="game_slug" value={slug}/><input type="hidden" name="return_to" value={returnTo}/><button className="dangerTextBtn" type="submit">Eliminar mi reseña</button></form></details> : <form action={createGameReview} className="panel reviewForm reviewCompose"><input type="hidden" name="game_slug" value={slug}/><input type="hidden" name="return_to" value={returnTo}/><div className="reviewComposeTitle"><div><h3>Escribe tu reseña</h3><p>Valora tu experiencia, no a otros usuarios. Mínimo 20 caracteres.</p></div><label>Nota <input name="score" type="number" min="1" max="10" step="0.5" placeholder="8.5" required/></label></div><textarea name="body" minLength={20} maxLength={5000} rows={6} placeholder="¿Qué te ha gustado? ¿Qué mejorarías? ¿A quién se lo recomendarías?" required/><div className="reviewFormActions"><small>Se aplican las normas de comunidad y el filtro de lenguaje.</small><button className="primaryBtn" type="submit">Publicar reseña</button></div></form>}

      <div className="reviewToolbar"><div><h3>Reseñas de la comunidad</h3><span>{summary.review_count}</span></div><div className="sortLinks"><Link className={sort === "helpful" ? "active" : ""} href={`/juegos/${slug}?reviews=helpful#resenas`}>Más útiles</Link><Link className={sort === "recent" ? "active" : ""} href={`/juegos/${slug}?reviews=recent#resenas`}>Recientes</Link><Link className={sort === "high" ? "active" : ""} href={`/juegos/${slug}?reviews=high#resenas`}>Mejor nota</Link><Link className={sort === "low" ? "active" : ""} href={`/juegos/${slug}?reviews=low#resenas`}>Peor nota</Link></div></div>

      <div className="reviewList">{reviews.map((review) => <article className={`panel reviewCard ${review.author_id === userId ? "myReviewCard" : ""}`} key={review.id}><div className="reviewCardTop"><div className="reviewAuthor"><span className="avatar small">{review.author.username.slice(0,1).toUpperCase()}</span><div><Link className="authorLink" href={`/usuarios/${review.author.username}`}><b>@{review.author.username}</b></Link><small>{formatDate(review.created_at)}{review.updated_at !== review.created_at ? " · editado" : ""}</small></div></div><div className="reviewScore">{review.score.toFixed(1)}</div></div><p>{review.body}</p><div className="reviewActions"><span>¿Te resultó útil?</span>{review.author_id !== userId && <><form action={voteGameReview}><input type="hidden" name="review_id" value={review.id}/><input type="hidden" name="game_slug" value={slug}/><input type="hidden" name="return_to" value={returnTo}/><input type="hidden" name="value" value="helpful"/><button className={review.myVote === true ? "reviewVote active" : "reviewVote"}><MaterialIcon name="thumb_up" size={16}/>Sí · {review.helpful_count}</button></form><form action={voteGameReview}><input type="hidden" name="review_id" value={review.id}/><input type="hidden" name="game_slug" value={slug}/><input type="hidden" name="return_to" value={returnTo}/><input type="hidden" name="value" value="unhelpful"/><button className={review.myVote === false ? "reviewVote active negative" : "reviewVote"}><MaterialIcon name="thumb_down" size={16}/>No · {review.unhelpful_count}</button></form></>}{review.author_id === userId && <span className="muted inlineMetrics"><span><MaterialIcon name="thumb_up" size={15}/>{review.helpful_count}</span><span><MaterialIcon name="thumb_down" size={15}/>{review.unhelpful_count}</span></span>}{userId && review.author_id !== userId && <details className="reviewReport"><summary>Denunciar</summary><form action={reportGameReview}><input type="hidden" name="review_id" value={review.id}/><input type="hidden" name="game_slug" value={slug}/><input type="hidden" name="return_to" value={returnTo}/><input name="reason" minLength={3} maxLength={500} placeholder="Motivo de la denuncia" required/><button type="submit">Enviar</button></form></details>}</div></article>)}{!reviews.length && <div className="panel emptyState"><h3>Todavía no hay reseñas</h3><p>Sé la primera persona en valorar este juego.</p></div>}</div>
    </section>
  </div>;
}
