import Link from "next/link";
import { redirect } from "next/navigation";
import { GameCard } from "@/components/GameCard";
import type { Game } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { communityTypeLabel } from "@/lib/community";
import { completionKindIcon, completionKindLabel, formatPlaytime, gamingPlatformLabels } from "@/lib/gamer-profile";
import { BrandIcon } from "@/components/BrandIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { achievementMaterialIcon, getMyXpEvents, getReputation, levelTitle, xpEventCopy } from "@/lib/reputation";

export const metadata = { title: "Mi NIVOX" };

type LibraryRow = { game_slug: string; status: "wishlist" | "playing" | "completed"; platform_played:string|null; playtime_minutes:number|null; achievements_unlocked:number|null; achievements_total:number|null; completion_kind:string|null; show_on_profile:boolean };
type CommunityRow = { id: string; title: string; type: string; vote_count: number; comment_count: number; created_at: string; status: string };
type ReviewRow = { id: string; game_slug: string; score: number; body: string; helpful_count: number; status: string; created_at: string };
type DbGameRow = { slug:string; title:string; genre:string|null; platform:string|null; score:number|null; accent:string|null; description:string|null; release_date:string|null };

export default async function MiNivoxPage() {
  if (!isSupabaseConfigured()) return <div className="shell pageStack"><section className="profileHero"><div className="profileAvatar">N</div><div><span className="eyebrow">CONFIGURACIÓN</span><h1>Mi NIVOX</h1><p>Conecta Supabase para activar cuentas y biblioteca persistente.</p></div></section></div>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/mi-nivox");

  const [{ data: profile }, { data: libraryData }, { data: communityData }, { data: reviewData }, { data: statsRows }, { data: followData }, { data: gamingAccounts }] = await Promise.all([
    supabase.from("profiles").select("username,full_name,bio,role,created_at").eq("id", user.id).maybeSingle(),
    supabase.from("user_games").select("game_slug,status,platform_played,playtime_minutes,achievements_unlocked,achievements_total,completion_kind,show_on_profile").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("community_posts").select("id,title,type,vote_count,comment_count,created_at,status").eq("author_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("game_reviews").select("id,game_slug,score,body,helpful_count,status,created_at").eq("author_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.rpc("nivox_profile_stats", { profile_id: user.id }),
    supabase.from("game_follows").select("game_slug,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("gaming_accounts").select("platform,handle,is_public").eq("user_id", user.id).order("platform"),
  ]);

  const library = (libraryData ?? []) as LibraryRow[];
  const communityPosts = (communityData ?? []) as CommunityRow[];
  const reviews = (reviewData ?? []) as ReviewRow[];
  const reviewGameSlugs = [...new Set(reviews.map((review) => review.game_slug))];
  const { data: reviewGames } = reviewGameSlugs.length ? await supabase.from("games").select("slug,title").in("slug", reviewGameSlugs) : { data: [] as Array<{slug:string;title:string}> };
  const reviewGameMap = new Map((reviewGames ?? []).map((game) => [game.slug, game.title]));
  const statusCount = (status: LibraryRow["status"]) => library.filter((item) => item.status === status).length;
  const followedSlugs = (followData ?? []).map((row) => row.game_slug);
  const allWantedSlugs = [...new Set([...library.map((row) => row.game_slug), ...followedSlugs])];
  const { data: dbGames } = allWantedSlugs.length ? await supabase.from("games").select("slug,title,genre,platform,score,accent,description,release_date").in("slug", allWantedSlugs) : { data: [] as DbGameRow[] };
  const dbGameRows = (dbGames ?? []) as DbGameRow[];
  const gameMap = new Map<string, DbGameRow>(dbGameRows.map((game) => [game.slug, game]));
  const toCard = (slug: string): Game | null => { const game = gameMap.get(slug); return game ? { slug: game.slug, title: game.title, genre: game.genre ?? "Videojuego", platform: game.platform ?? "—", score: game.score?.toString() ?? "", accent: game.accent ?? "sunset", description: game.description ?? "" } : null; };
  const selectedGames = library.map((row) => toCard(row.game_slug)).filter((game): game is Game => Boolean(game));
  const followedGames = followedSlugs.map((slug) => gameMap.get(slug)).filter(Boolean);
  const initial = (profile?.username || user.email || "N").slice(0, 1).toUpperCase();
  const joined = profile?.created_at ? new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(profile.created_at)) : "hoy";
  const socialStats = statsRows?.[0] ?? { followers: 0, following: 0 };
  const reputation = await getReputation(user.id);
  const xpEvents = await getMyXpEvents(user.id, 6);
  const totalMinutes = library.reduce((sum, item) => sum + Number(item.playtime_minutes ?? 0), 0);
  const specialCompletions = library.filter((item) => item.completion_kind && item.completion_kind !== "none").length;

  return <div className="shell pageStack">
    <section className="profileHero"><div className="profileAvatar">{initial}</div><div><span className="eyebrow">PERFIL NIVOX</span><h1>{profile?.username ?? "Jugador NIVOX"}</h1><p>{profile?.bio || `Miembro desde ${joined}`}</p><div className="profileConnectionLinks"><Link href={`/usuarios/${profile?.username}/seguidores`}><b>{Number(socialStats.followers)}</b> seguidores</Link><Link href={`/usuarios/${profile?.username}/siguiendo`}><b>{Number(socialStats.following)}</b> siguiendo</Link></div></div><div className="profileHeroActions"><Link className="ghostBtn" href="/perfil/editar">Editar perfil</Link>{profile?.username && <Link className="ghostBtn" href={`/usuarios/${profile.username}`}>Ver perfil público</Link>}<Link className="ghostBtn" href="/notificaciones">Notificaciones</Link></div></section>

    <section className="statsGrid"><div><b>{library.length}</b><span>En biblioteca</span></div><div><b>{statusCount("completed")}</b><span>Completados</span></div><div><b>{specialCompletions}</b><span>Platinos / 100 %</span></div><div><b>{Math.floor(totalMinutes / 60).toLocaleString("es-ES")} h</b><span>Tiempo registrado</span></div></section>

    <section className="panel reputationHero myReputationHero"><div className="levelOrb"><span>NIVEL</span><b>{reputation.summary.level}</b></div><div className="reputationHeroBody"><div className="reputationHeroTitle"><div><span className="eyebrow">{levelTitle(reputation.summary.level)}</span><h2>{reputation.summary.xp.toLocaleString("es-ES")} XP</h2></div><Link href="/logros">Todos los logros</Link></div><div className="xpProgress"><span style={{ width: `${reputation.summary.progress_percent}%` }} /></div><div className="xpProgressMeta"><span>{reputation.summary.current_level_xp.toLocaleString("es-ES")}</span><b>{reputation.summary.progress_percent}% hacia nivel {reputation.summary.level + 1}</b><span>{reputation.summary.next_level_xp.toLocaleString("es-ES")} XP</span></div><div className="myAchievementStrip">{reputation.achievements.filter((item) => item.unlocked_at).slice(0,6).map((item) => <span className="publicBadge" title={item.description} key={item.code}><b><MaterialIcon name={achievementMaterialIcon(item.code)} size={16} filled/></b>{item.name}</span>)}{!reputation.summary.achievement_count && <small>Tu primera insignia aparecerá aquí.</small>}</div></div><div className="achievementCounter"><b>{reputation.summary.achievement_count}</b><span>insignias</span></div></section>
    {xpEvents.length > 0 && <section className="panel miniXpPanel"><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="bolt" size={22}/>XP reciente</h2><Link href="/logros">Ver todo</Link></div><div className="miniXpList">{xpEvents.map((event) => <div key={event.id}><span>{xpEventCopy(event.event_type)}</span><b>+{event.xp} XP</b></div>)}</div></section>}

    <section><div className="sectionTitle"><div><h2 className="titleWithIcon"><MaterialIcon name="sports_esports" size={22}/>Mi historial gamer</h2><p className="muted">Añade horas, logros, plataforma y platinos a tus juegos.</p></div><span>{library.length} juegos</span></div>{library.length ? <div className="gameHistoryEditorList">{library.map((item) => { const game = gameMap.get(item.game_slug); if (!game) return null; return <Link className="panel gameHistoryEditorRow" href={`/mi-nivox/juegos/${item.game_slug}`} key={item.game_slug}><div><span className="tag">{item.status === "completed" ? "Completado" : item.status === "playing" ? "Jugando" : "Wishlist"}</span><h3>{game.title}</h3><p>{item.platform_played || game.platform || "Plataforma sin indicar"}</p></div><div className="historyQuickStats"><span className="inlineIconText"><MaterialIcon name="schedule" size={16}/>{formatPlaytime(item.playtime_minutes)}</span>{completionKindLabel(item.completion_kind) && <b className="inlineIconText"><MaterialIcon name={completionKindIcon(item.completion_kind)} size={16}/>{completionKindLabel(item.completion_kind)}</b>}{item.achievements_total != null && <span className="inlineIconText"><MaterialIcon name="military_tech" size={16}/>{item.achievements_unlocked ?? 0}/{item.achievements_total}</span>}<small>{item.show_on_profile ? "Visible en perfil" : "Privado"}</small></div></Link>; })}</div> : <div className="emptyState panel"><h3>Tu biblioteca está vacía</h3><Link className="primaryBtn inlineBtn" href="/juegos">Explorar juegos</Link></div>}</section>

    <section className="panel myGamingAccounts"><div className="sectionTitle"><div><h2 className="titleWithIcon"><MaterialIcon name="hub" size={22}/>Mis cuentas gamer</h2><p className="muted">Identificadores que puedes compartir en tu perfil.</p></div><Link href="/perfil/editar">Gestionar</Link></div>{gamingAccounts?.length ? <div className="gamingAccountChips">{gamingAccounts.map((account) => <span className={`gamingAccountChip ${account.is_public ? "" : "privateChip"}`} key={account.platform}><b><BrandIcon platform={account.platform} size={18}/>{gamingPlatformLabels[account.platform] ?? account.platform}</b><span>{account.handle}</span><small>{account.is_public ? "Público" : "Privado"}</small></span>)}</div> : <p className="muted">Todavía no has añadido ninguna cuenta de plataforma.</p>}</section>

    <section><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="sports_esports" size={22}/>Mis juegos</h2><span>{library.length} guardados</span></div>{selectedGames.length > 0 ? <div className="gameGrid">{selectedGames.map((game) => <GameCard key={game.slug} game={game} />)}</div> : null}</section>
    <section><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="notifications_active" size={22}/>Juegos que sigo</h2><Link href="/lanzamientos">Calendario</Link></div>{followedGames.length ? <div className="followedGameList">{followedGames.map((game) => game && <Link className="panel followedGameRow" href={`/juegos/${game.slug}`} key={game.slug}><div><h3>{game.title}</h3><p>{game.platform ?? "Plataformas por confirmar"}</p></div><span>{game.release_date ? new Date(`${game.release_date}T00:00:00`).toLocaleDateString("es-ES") : "Sin fecha"}</span></Link>)}</div> : <div className="emptyState panel"><h3>Aún no sigues ningún juego</h3><Link className="primaryBtn inlineBtn" href="/lanzamientos">Explorar lanzamientos</Link></div>}</section>
    <section><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="forum" size={22}/>Mis publicaciones</h2><Link href="/comunidad/nueva">Nueva publicación</Link></div>{communityPosts.length ? <div className="myCommunityList">{communityPosts.map((post) => <Link className="panel myCommunityRow" key={post.id} href={post.status === "published" ? `/comunidad/${post.id}` : "/comunidad"}><div><span className="tag">{communityTypeLabel(post.type)}</span><h3>{post.title}</h3><small>{new Date(post.created_at).toLocaleDateString("es-ES")} · {post.status === "hidden" ? "Ocultada" : "Publicada"}</small></div><div className="myCommunityMetrics"><span className="inlineIconText"><MaterialIcon name="arrow_upward" size={15}/>{post.vote_count}</span><span className="inlineIconText"><MaterialIcon name="chat_bubble" size={15}/>{post.comment_count}</span></div></Link>)}</div> : <div className="emptyState panel"><h3>Aún no has publicado</h3></div>}</section>
    <section><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="star" size={22} filled/>Mis reseñas</h2><Link href="/ranking">Ranking NIVOX</Link></div>{reviews.length ? <div className="profileReviewList">{reviews.map((review) => <Link className="panel profileReviewRow" key={review.id} href={`/juegos/${review.game_slug}#resenas`}><div><span className="tag">{Number(review.score).toFixed(1)}/10</span><h3>{reviewGameMap.get(review.game_slug) ?? review.game_slug}</h3><p>{review.body.length > 180 ? `${review.body.slice(0,180)}…` : review.body}</p></div><span className="inlineIconText"><MaterialIcon name="thumb_up" size={16}/>{review.helpful_count}</span></Link>)}</div> : <div className="emptyState panel"><h3>Aún no has publicado reseñas</h3></div>}</section>
    <section className="panel sectionPanel"><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="verified_user" size={22}/>Cuenta conectada</h2><span>{profile?.role === "admin" ? "Administrador" : "Miembro"}</span></div><p className="lead">Tu biblioteca y tu historial se guardan en Supabase y quedan asociados a <strong>{user.email}</strong>.</p>{profile?.role === "admin" && <Link className="ghostBtn inlineBtn" href="/admin">Abrir administración</Link>}</section>
  </div>;
}
