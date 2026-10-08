import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toggleFollow } from "@/app/social/actions";
import { communityTypeLabel } from "@/lib/community";
import { completionKindIcon, completionKindLabel, formatPlaytime, gamingPlatformLabels } from "@/lib/gamer-profile";
import { BrandIcon } from "@/components/BrandIcon";
import { MaterialIcon } from "@/components/MaterialIcon";
import { getPublicProfile } from "@/lib/social";
import { achievementMaterialIcon, levelTitle } from "@/lib/reputation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ message?: string; error?: string }> };

export async function generateMetadata({params}:{params:Promise<{username:string}>}):Promise<Metadata>{ const {username}=await params; return {title:`@${username}`,description:`Perfil gamer de @${username} en NIVOX.`,robots:{index:false,follow:true}}; }

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const query = await searchParams;
  const data = await getPublicProfile(username);
  if (!data) notFound();

  const { profile, stats, posts, reviews, viewerId, isFollowing, reputation, gamerStats, gameHistory, gamingAccounts } = data;
  const isOwn = viewerId === profile.id;
  const initial = profile.username.slice(0, 1).toUpperCase();
  const joined = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(profile.created_at));
  const totalHours = Math.floor(Number(gamerStats.total_playtime_minutes ?? 0) / 60);

  return <div className="shell pageStack publicProfilePage">
    {query.message && <div className="notice success">{query.message}</div>}
    {query.error && <div className="notice error">{query.error}</div>}
    <section className="profileHero publicProfileHero">
      {profile.avatar_url ? <img className="profileAvatar imageAvatar" src={profile.avatar_url} alt="" /> : <div className="profileAvatar">{initial}</div>}
      <div className="publicProfileIntro">
        <div className="profileNameRow"><div><span className="eyebrow">PERFIL NIVOX</span><h1>@{profile.username}</h1></div><div className="profileBadgesTop"><span className="levelChip">Nv. {reputation.summary.level} · {levelTitle(reputation.summary.level)}</span>{profile.role === "admin" && <span className="statusBadge published">Equipo NIVOX</span>}</div></div>
        {profile.full_name && <strong>{profile.full_name}</strong>}
        <p>{profile.bio || `Miembro de NIVOX desde ${joined}.`}</p>
        <div className="profileConnectionLinks"><Link href={`/usuarios/${profile.username}/seguidores`}><b>{Number(stats.followers)}</b> seguidores</Link><Link href={`/usuarios/${profile.username}/siguiendo`}><b>{Number(stats.following)}</b> siguiendo</Link></div>
      </div>
      <div className="profileHeroActions">
        {isOwn ? <Link className="ghostBtn" href="/perfil/editar">Editar perfil</Link> : viewerId ? <form action={toggleFollow}><input type="hidden" name="target_id" value={profile.id}/><input type="hidden" name="username" value={profile.username}/><input type="hidden" name="return_to" value={`/usuarios/${profile.username}`}/><button className={isFollowing ? "ghostBtn" : "primaryBtn"} type="submit">{isFollowing ? "Dejar de seguir" : "Seguir"}</button></form> : <Link className="primaryBtn" href={`/auth/login?next=/usuarios/${profile.username}`}>Seguir</Link>}
        {!isOwn && viewerId && <Link className="reportProfileLink" href={`/usuarios/${profile.username}/denunciar`}>Denunciar perfil</Link>}
      </div>
    </section>

    <section className="statsGrid profileStatsGrid"><div><b>{Number(stats.posts)}</b><span>Publicaciones</span></div><div><b>{Number(stats.votes)}</b><span>Votos recibidos</span></div><div><b>{reputation.summary.xp.toLocaleString("es-ES")}</b><span>XP</span></div><div><b>{reputation.summary.achievement_count}</b><span>Insignias</span></div></section>

    <section className="panel publicReputationCard"><div className="publicReputationHead"><div><span className="eyebrow">REPUTACIÓN</span><h2>Nivel {reputation.summary.level} · {levelTitle(reputation.summary.level)}</h2></div><Link href="/logros">Ver clasificación</Link></div><div className="xpProgress"><span style={{ width: `${reputation.summary.progress_percent}%` }} /></div><div className="xpProgressMeta"><span>{reputation.summary.xp.toLocaleString("es-ES")} XP</span><b>{reputation.summary.progress_percent}% hacia el siguiente nivel</b><span>{reputation.summary.next_level_xp.toLocaleString("es-ES")} XP</span></div><div className="publicBadgeStrip">{reputation.achievements.filter((item) => item.unlocked_at).slice(0,8).map((item) => <span title={item.description} className="publicBadge" key={item.code}><b><MaterialIcon name={achievementMaterialIcon(item.code)} size={16} filled/></b>{item.name}</span>)}{reputation.summary.achievement_count === 0 && <small>Aún no ha desbloqueado insignias.</small>}</div></section>

    <section className="panel gamerIdentityPanel">
      <div className="sectionTitle"><div><span className="eyebrow">HISTORIAL GAMER</span><h2>Estadísticas de jugador</h2></div><span>Datos declarados por el usuario</span></div>
      <div className="gamerStatsGrid"><div><b>{Number(gamerStats.games_visible)}</b><span>Juegos visibles</span></div><div><b>{Number(gamerStats.completed_games)}</b><span>Completados</span></div><div><b>{Number(gamerStats.platinum_games)}</b><span>Platinos / 100 %</span></div><div><b>{totalHours.toLocaleString("es-ES")} h</b><span>Tiempo registrado</span></div><div><b>{Number(gamerStats.achievements_unlocked)}</b><span>Logros registrados</span></div></div>
      {gamingAccounts.length > 0 && <div className="publicGamingAccounts"><h3>Encuéntrame en</h3><div className="gamingAccountChips">{gamingAccounts.map((account) => <span className="gamingAccountChip" key={account.platform}><b><BrandIcon platform={account.platform} size={18}/>{gamingPlatformLabels[account.platform] ?? account.platform}</b><span>{account.handle}</span></span>)}</div><small>Identificadores compartidos voluntariamente por @{profile.username}.</small></div>}
    </section>

    <section>
      <div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="sports_esports" size={22}/>Juegos y progreso</h2><span>{gameHistory.length ? `${gameHistory.length} visibles` : "Sin historial"}</span></div>
      {gameHistory.length ? <div className="publicGameHistoryGrid">{gameHistory.map((item) => <Link className="panel publicGameHistoryCard" href={`/juegos/${item.game_slug}`} key={item.game_slug}><div className="publicGameHistoryTop"><div><span className="tag">{item.status === "completed" ? "Completado" : item.status === "playing" ? "Jugando" : "Wishlist"}</span><h3>{item.game_title}</h3></div>{completionKindLabel(item.completion_kind) && <strong className="completionBadge inlineIconText"><MaterialIcon name={completionKindIcon(item.completion_kind)} size={17}/>{completionKindLabel(item.completion_kind)}</strong>}</div><div className="gameHistoryMeta">{item.platform_played && <span className="inlineIconText"><MaterialIcon name="videogame_asset" size={16}/>{item.platform_played}</span>}<span className="inlineIconText"><MaterialIcon name="schedule" size={16}/>{formatPlaytime(item.playtime_minutes)}</span>{item.achievements_total != null && <span className="inlineIconText"><MaterialIcon name="military_tech" size={16}/>{item.achievements_unlocked ?? 0}/{item.achievements_total} logros</span>}{item.completed_on && <span className="inlineIconText"><MaterialIcon name="event_available" size={16}/>{new Date(`${item.completed_on}T00:00:00`).toLocaleDateString("es-ES")}</span>}</div></Link>)}</div> : <div className="panel emptyState"><h3>No ha compartido su historial gamer</h3><p>Los juegos que decida hacer públicos aparecerán aquí.</p></div>}
    </section>

    <section><div className="sectionTitle"><h2>Reseñas recientes</h2><span>{reviews.length ? `${reviews.length} visibles` : "Sin reseñas"}</span></div>{reviews.length ? <div className="profileReviewList">{reviews.map((review) => <Link className="panel profileReviewRow" href={`/juegos/${review.game_slug}#resenas`} key={review.id}><div><span className="tag">{review.score.toFixed(1)}/10</span><h3>{review.game_title}</h3><p>{review.body.length > 180 ? `${review.body.slice(0,180)}…` : review.body}</p></div><span className="inlineIconText"><MaterialIcon name="thumb_up" size={16}/>{review.helpful_count}</span></Link>)}</div> : <div className="panel emptyState"><h3>Todavía no ha publicado reseñas</h3><p>Sus valoraciones de juegos aparecerán aquí.</p></div>}</section>
    <section><div className="sectionTitle"><h2>Actividad reciente</h2><span>{posts.length ? "Comunidad" : "Sin publicaciones"}</span></div>{posts.length ? <div className="myCommunityList">{posts.map((post) => <Link className="panel myCommunityRow" href={`/comunidad/${post.id}`} key={post.id}><div><span className="tag">{communityTypeLabel(post.type)}</span><h3>{post.title}</h3><small>{new Date(post.created_at).toLocaleDateString("es-ES")}</small></div><div className="myCommunityMetrics"><span className="inlineIconText"><MaterialIcon name="arrow_upward" size={15}/>{post.vote_count}</span><span className="inlineIconText"><MaterialIcon name="chat_bubble" size={15}/>{post.comment_count}</span></div></Link>)}</div> : <div className="panel emptyState"><h3>Todavía no ha publicado nada</h3><p>Cuando participe en la comunidad, su actividad pública aparecerá aquí.</p></div>}</section>
  </div>;
}
