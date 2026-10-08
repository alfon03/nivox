import { GameCard } from "@/components/GameCard";
import { games as fallbackGames, type Game } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Juegos" };

export default async function JuegosPage() {
  let games: Game[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("games").select("slug,title,genre,platform,score,accent,description,cover_url").eq("status","published").order("title");
    games = (data ?? []).map(g => ({ slug:g.slug, title:g.title, genre:g.genre ?? "Videojuego", platform:g.platform ?? "—", score:g.score?.toString() ?? "", accent:g.accent ?? "sunset", description:g.description ?? "", cover_url:g.cover_url ?? null }));
  }
  if (!games.length) games = fallbackGames;
  return <div className="shell pageStack"><section className="pageHero compact gamesHeroWithAction"><div><span className="eyebrow">BASE DE DATOS</span><h1>Juegos</h1><p>Descubre juegos, consulta fichas, reseñas y organiza tu biblioteca.</p></div><div className="heroActionGroup"><a className="ghostBtn" href="/lanzamientos"><MaterialIcon name="event" size={18}/>Lanzamientos</a><a className="ghostBtn" href="/ranking"><MaterialIcon name="trophy" size={18}/>Ranking comunidad</a></div></section><div className="filters"><button className="active">Todos</button><button>PC</button><button>PlayStation</button><button>Xbox</button><button>Nintendo</button></div><section className="gameGrid large">{games.map(g=><GameCard key={g.slug} game={g}/>)}</section></div>;
}
