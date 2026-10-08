import Link from "next/link";
import { GameFollowButton } from "@/components/GameFollowButton";
import { createClient } from "@/lib/supabase/server";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Lanzamientos" };
export const dynamic = "force-dynamic";

type Search = Promise<{ plataforma?: string }>;
type ReleaseGame = {
  slug: string;
  title: string;
  platform: string | null;
  genre: string | null;
  release_date: string;
  cover_url: string | null;
  accent: string | null;
};

const platformFilters = [
  ["Todas", ""],
  ["PC", "pc"],
  ["PlayStation", "playstation"],
  ["Xbox", "xbox"],
  ["Nintendo", "nintendo"],
] as const;

function matchesPlatform(platform: string | null, filter: string) {
  if (!filter) return true;
  const value = (platform ?? "").toLowerCase();
  if (filter === "playstation") return value.includes("playstation") || value.includes("ps5") || value.includes("ps4");
  if (filter === "nintendo") return value.includes("nintendo") || value.includes("switch");
  return value.includes(filter);
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(`${key}-01T00:00:00`));
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
}

export default async function LanzamientosPage({ searchParams }: { searchParams: Search }) {
  const query = await searchParams;
  const platform = query.plataforma ?? "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("slug,title,platform,genre,release_date,cover_url,accent")
    .eq("status", "published")
    .not("release_date", "is", null)
    .order("release_date", { ascending: true });

  const allGames = ((data ?? []) as ReleaseGame[]).filter((game) => matchesPlatform(game.platform, platform));
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcoming = allGames.filter((game) => game.release_date >= todayKey);
  const released = allGames.filter((game) => game.release_date < todayKey).reverse().slice(0, 12);
  const grouped = new Map<string, ReleaseGame[]>();
  for (const game of upcoming) {
    const key = monthKey(game.release_date);
    grouped.set(key, [...(grouped.get(key) ?? []), game]);
  }

  return <div className="shell pageStack releasesPage">
    <section className="pageHero compact releaseHero"><div><span className="eyebrow">CALENDARIO NIVOX</span><h1>Próximos lanzamientos</h1><p>Fechas de salida por plataforma. Sigue un juego para recibir noticias, guías y cambios de lanzamiento.</p></div><Link className="ghostBtn" href="/mi-nivox">Ver mi wishlist</Link></section>

    <nav className="releaseFilters" aria-label="Filtrar por plataforma">{platformFilters.map(([label, value]) => <Link key={label} className={platform === value ? "active" : ""} href={value ? `/lanzamientos?plataforma=${value}` : "/lanzamientos"}>{label}</Link>)}</nav>

    {upcoming.length ? <div className="releaseMonths">{[...grouped.entries()].map(([month, games]) => <section className="releaseMonth" key={month}><div className="sectionTitle"><h2>{monthLabel(month)}</h2><span>{games.length} {games.length === 1 ? "juego" : "juegos"}</span></div><div className="releaseList">{games.map((game) => <article className="panel releaseCard" key={game.slug}><div className={`releaseDate game-${game.accent ?? "sunset"}`}><b>{dateLabel(game.release_date).split(" ")[0]}</b><span>{dateLabel(game.release_date).split(" ")[1]}</span></div><div className="releaseInfo"><Link href={`/juegos/${game.slug}`}><h3>{game.title}</h3></Link><p>{game.genre ?? "Videojuego"} · {game.platform ?? "Plataformas por confirmar"}</p><small>{new Date(`${game.release_date}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</small></div><div className="releaseActions"><GameFollowButton slug={game.slug} compact /><Link className="ghostBtn compactBtn" href={`/juegos/${game.slug}`}>Ver ficha</Link></div></article>)}</div></section>)}</div> : <div className="panel emptyState"><h3>No hay próximos lanzamientos con este filtro</h3><p>Añade fechas desde Administración → Juegos o prueba otra plataforma.</p></div>}

    {released.length > 0 && <section><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="new_releases" size={22}/>Lanzamientos recientes</h2><span>Ya disponibles</span></div><div className="recentReleaseGrid">{released.map((game) => <Link className="panel recentRelease" href={`/juegos/${game.slug}`} key={game.slug}><span>{dateLabel(game.release_date)}</span><h3>{game.title}</h3><p>{game.platform ?? "—"}</p></Link>)}</div></section>}
  </div>;
}
