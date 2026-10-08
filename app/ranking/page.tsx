import Link from "next/link";
import { fetchGameRankings } from "@/lib/reviews";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Ranking de juegos" };

export default async function RankingPage() {
  if (!isSupabaseConfigured()) return <div className="shell pageStack"><section className="pageHero compact"><span className="eyebrow">RANKING NIVOX</span><h1>Conecta Supabase</h1><p>El ranking necesita la base de datos configurada.</p></section></div>;
  const games = await fetchGameRankings();
  return <div className="shell pageStack rankingPage">
    <section className="pageHero compact"><span className="eyebrow">RANKING NIVOX</span><h1>Los juegos mejor valorados</h1><p>Clasificación calculada con las notas reales de la comunidad. En caso de empate, priorizamos el número de reseñas y su utilidad.</p></section>
    <div className="rankingLegend"><span><MaterialIcon name="star" size={17} filled/>Nota comunidad</span><span><MaterialIcon name="rate_review" size={17}/>Reseñas</span><span><MaterialIcon name="thumb_up" size={17}/>Votos útiles</span></div>
    <section className="rankingList">{games.map((game, index) => <Link className="panel rankingRow" href={`/juegos/${game.game_slug}#resenas`} key={game.game_slug}><span className={`rankingPosition rank-${index + 1}`}>{index + 1}</span>{game.cover_url ? <img src={game.cover_url} alt=""/> : <div className="rankingCoverFallback">N</div>}<div className="rankingGame"><b>{game.title}</b><small>{game.genre ?? "Videojuego"} · {game.platform ?? "Plataformas por confirmar"}</small></div><div className="rankingMetric"><b>{game.avg_score.toFixed(1)}</b><small>/ 10</small></div><div className="rankingMetric"><b>{game.review_count}</b><small>reseñas</small></div><div className="rankingMetric"><b>{game.helpful_total}</b><small>útiles</small></div></Link>)}{!games.length && <div className="panel emptyState"><h3>El ranking todavía está vacío</h3><p>Cuando la comunidad publique reseñas, los juegos aparecerán aquí automáticamente.</p><Link className="primaryBtn inlineBtn" href="/juegos">Explorar juegos</Link></div>}</section>
  </div>;
}
