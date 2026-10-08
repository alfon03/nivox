import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { MaterialIcon } from "@/components/MaterialIcon";
import { communityPosts as fallbackCommunity, games as fallbackGames, guides as fallbackGuides, news as fallbackNews, type Game } from "@/lib/data";
import { fetchCommunityPosts } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function Title({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <span className="titleWithIcon"><MaterialIcon name={icon} size={22} />{children}</span>;
}

type HomeArticle = { id:string; slug:string; title:string; category:string; excerpt:string; published_at:string|null };
type HomeGuide = { id:string; slug:string; title:string; summary:string; game_slug:string|null; published_at:string|null };

export default async function HomePage() {
  let homepageGames: Game[] = fallbackGames;
  let latestNews: HomeArticle[] = [];
  let latestGuides: HomeGuide[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [{ data: gameRows }, { data: articleRows }, { data: guideRows }] = await Promise.all([
      supabase.from("games")
        .select("slug,title,genre,platform,score,accent,description,release_date,cover_url")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("articles")
        .select("id,slug,title,category,excerpt,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(4),
      supabase.from("guides")
        .select("id,slug,title,summary,game_slug,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(4),
    ]);

    if (gameRows?.length) {
      homepageGames = gameRows.map((g) => ({
        slug: g.slug,
        title: g.title,
        genre: g.genre ?? "Videojuego",
        platform: g.platform ?? "Plataformas por confirmar",
        score: g.score?.toString() ?? "",
        accent: g.accent ?? "sunset",
        description: g.description ?? "",
        cover_url: g.cover_url ?? null,
      }));
    }
    latestNews = (articleRows ?? []) as HomeArticle[];
    latestGuides = (guideRows ?? []) as HomeGuide[];
  }

  const community = isSupabaseConfigured() ? await fetchCommunityPosts({ sort: "popular", limit: 3 }) : { posts: [], userId: null };
  const trendGames = homepageGames.slice(0, 5);

  return (
    <div className="shell pageStack">
      <section className="heroGrid">
        <article className="heroCard">
          <div className="heroContent">
            <div className="heroIntro">
              <span className="eyebrow">DESTACADO</span>
              <span className="heroKicker">NIVOX · Especial</span>
            </div>
            <h1>Los videojuegos que definirán los próximos meses</h1>
            <p>Noticias, lanzamientos, guías y conversaciones de la comunidad en un solo sitio.</p>
            <div className="heroButtons">
              <Link className="primaryBtn" href="/noticias"><MaterialIcon name="newspaper" size={19} />Ver noticias</Link>
              <Link className="ghostBtn" href="/lanzamientos"><MaterialIcon name="event" size={19} />Próximos lanzamientos</Link>
              <Link className="ghostBtn" href="/comunidad"><MaterialIcon name="forum" size={19} />Comunidad</Link>
            </div>
          </div>
        </article>
        <aside className="trending panel">
          <div className="sectionTitle"><h2><Title icon="local_fire_department">Destacados</Title></h2><span>En NIVOX</span></div>
          {trendGames.map((g, i) => <Link href={`/juegos/${g.slug}`} className="trendRow" key={g.slug}><b>{i + 1}</b><span>{g.title}</span><small><MaterialIcon name="star" size={15} filled />{g.score || "—"}</small></Link>)}
        </aside>
      </section>

      <section>
        <div className="sectionTitle"><h2><Title icon="sports_esports">Juegos</Title></h2><Link href="/juegos">Ver todos</Link></div>
        <div className="gameGrid">{homepageGames.slice(0, 6).map((g) => <GameCard key={g.slug} game={g} />)}</div>
      </section>

      <section className="twoCol">
        <div className="panel sectionPanel">
          <div className="sectionTitle"><h2><Title icon="newspaper">Últimas noticias</Title></h2><Link href="/noticias">Ver todas</Link></div>
          <div className="newsGrid">
            {latestNews.length ? latestNews.map((n) => <Link href={`/noticias/${n.slug}`} className="newsCard" key={n.id}><span className="tag">{n.category}</span><h3>{n.title}</h3><p>{n.published_at ? new Date(n.published_at).toLocaleDateString("es-ES") : "NIVOX"}</p></Link>) : fallbackNews.map((n) => <article className="newsCard" key={n.title}><span className="tag">{n.tag}</span><h3>{n.title}</h3><p>{n.time}</p></article>)}
          </div>
        </div>
        <div className="panel sectionPanel">
          <div className="sectionTitle"><h2><Title icon="menu_book">Guías destacadas</Title></h2><Link href="/guias">Ver todas</Link></div>
          <div className="guideList">
            {latestGuides.length ? latestGuides.map((g) => <Link href={`/guias/${g.slug}`} key={g.id}><div className="guideIcon"><MaterialIcon name="arrow_outward" size={20} /></div><div><h3>{g.title}</h3><p>{g.game_slug ?? "NIVOX"} · Guía</p></div></Link>) : fallbackGuides.map((g) => <article key={g.title}><div className="guideIcon"><MaterialIcon name="arrow_outward" size={20} /></div><div><h3>{g.title}</h3><p>{g.game} · {g.meta}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="panel sectionPanel">
        <div className="sectionTitle"><h2><Title icon="groups">Comunidad NIVOX</Title></h2><Link href="/comunidad">Entrar</Link></div>
        <div className="communityGrid">
          {community.posts.length ? community.posts.map((p) => <Link href={`/comunidad/${p.id}`} className="postCard" key={p.id}><div className="postUser"><span className="avatar">{p.author.username[0]?.toUpperCase() ?? "N"}</span><div><b>@{p.author.username}</b><small>{p.game?.title ?? "Comunidad"}</small></div><span className="tag">{p.type}</span></div><h3>{p.title}</h3><p>{p.has_spoiler ? "Publicación marcada como spoiler." : p.body}</p><div className="postMeta inlineMetrics"><span><MaterialIcon name="arrow_upward" size={16} />{p.vote_count}</span><span><MaterialIcon name="chat_bubble" size={16} />{p.comment_count}</span></div></Link>) : fallbackCommunity.map((p) => <article className="postCard" key={p.title}><div className="postUser"><span className="avatar">{p.user[0]}</span><div><b>{p.user}</b><small>Nivel {p.level}</small></div><span className="tag">{p.type}</span></div><h3>{p.title}</h3><p>{p.body}</p><div className="postMeta inlineMetrics"><span><MaterialIcon name="arrow_upward" size={16} />{p.votes}</span><span><MaterialIcon name="chat_bubble" size={16} />{p.comments}</span></div></article>)}
        </div>
      </section>

      <section className="premiumBanner">
        <div><span className="eyebrow">PRÓXIMAMENTE</span><h2>NIVOX+</h2><p>Sin anuncios, estadísticas avanzadas, trackers, perfiles personalizados y más.</p></div>
        <button disabled>Muy pronto</button>
      </section>
    </div>
  );
}
