import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { achievementMaterialIcon, getMyXpEvents, getReputation, getReputationLeaderboard, levelTitle, xpEventCopy } from "@/lib/reputation";
import { MaterialIcon } from "@/components/MaterialIcon";

export const metadata = { title: "Logros y niveles | NIVOX" };
export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  if (!isSupabaseConfigured()) {
    return <div className="shell pageStack"><section className="panel sectionPanel"><h1>Logros NIVOX</h1><p>Conecta Supabase para activar reputación, niveles e insignias.</p></section></div>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const leaderboard = await getReputationLeaderboard(25);
  const mine = user ? await getReputation(user.id) : null;
  const events = user ? await getMyXpEvents(user.id, 12) : [];

  return <div className="shell pageStack reputationPage">
    <section className="releaseHero">
      <div><span className="eyebrow">REPUTACIÓN NIVOX</span><h1>Niveles, XP e insignias</h1><p className="lead">Participa de forma útil, completa juegos y aporta a la comunidad. El XP se calcula desde actividad real y no puede editarse desde el navegador.</p></div>
      {!user && <Link className="primaryBtn" href="/auth/login?next=/logros">Entrar para participar</Link>}
    </section>

    {mine && <section className="panel reputationHero">
      <div className="levelOrb"><span>NIVEL</span><b>{mine.summary.level}</b></div>
      <div className="reputationHeroBody">
        <div className="reputationHeroTitle"><div><span className="eyebrow">{levelTitle(mine.summary.level)}</span><h2>{mine.summary.xp.toLocaleString("es-ES")} XP</h2></div><Link href="/mi-nivox">Mi NIVOX</Link></div>
        <div className="xpProgress"><span style={{ width: `${mine.summary.progress_percent}%` }} /></div>
        <div className="xpProgressMeta"><span>{mine.summary.current_level_xp.toLocaleString("es-ES")} XP</span><b>{mine.summary.progress_percent}% hacia nivel {mine.summary.level + 1}</b><span>{mine.summary.next_level_xp.toLocaleString("es-ES")} XP</span></div>
      </div>
      <div className="achievementCounter"><b>{mine.summary.achievement_count}</b><span>insignias</span></div>
    </section>}

    {mine && <section>
      <div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="military_tech" size={22}/>Mis insignias</h2><span>{mine.summary.achievement_count}/{mine.achievements.length}</span></div>
      <div className="achievementGrid">{mine.achievements.map((item) => <article key={item.code} className={`panel achievementCard ${item.unlocked_at ? "unlocked" : "locked"}`}><div className="achievementIcon"><MaterialIcon name={achievementMaterialIcon(item.code)} size={28} filled={Boolean(item.unlocked_at)}/></div><div><h3>{item.name}</h3><p>{item.description}</p><small>{item.unlocked_at ? `Desbloqueada · ${new Date(item.unlocked_at).toLocaleDateString("es-ES")}` : "Aún bloqueada"}</small></div></article>)}</div>
    </section>}

    {user && <section className="twoCol reputationTwoCol">
      <div className="panel sectionPanel"><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="bolt" size={22}/>XP reciente</h2><span>Privado</span></div>{events.length ? <div className="xpEventList">{events.map((event) => <div className="xpEvent" key={event.id}><div><b>{xpEventCopy(event.event_type)}</b><small>{new Date(event.created_at).toLocaleString("es-ES")}</small></div><strong>+{event.xp} XP</strong></div>)}</div> : <div className="emptyState"><h3>Todavía no tienes XP</h3><p>Publica, comenta, reseña o completa un juego para empezar.</p></div>}</div>
      <div className="panel sectionPanel"><div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="rule" size={22}/>Cómo se gana XP</h2><span>Automático</span></div><div className="xpRules"><p><b>+25 XP</b> publicación visible</p><p><b>+20 XP</b> reseña publicada</p><p><b>+15 XP</b> juego completado</p><p><b>+8 XP</b> comentario visible</p><p><b>+5 XP</b> nuevo seguidor</p><p><b>+4 XP</b> voto útil en una reseña</p><p><b>+3 XP</b> voto recibido en una publicación</p></div></div>
    </section>}

    <section>
      <div className="sectionTitle"><h2 className="titleWithIcon"><MaterialIcon name="trophy" size={22}/>Clasificación NIVOX</h2><span>Top {leaderboard.length}</span></div>
      <div className="reputationLeaderboard">{leaderboard.map((row, index) => <Link className="panel reputationRow" key={row.user_id} href={`/usuarios/${row.username}`}><span className={`reputationRank rank-${index + 1}`}>{index + 1}</span>{row.avatar_url ? <img src={row.avatar_url} alt="" /> : <span className="miniAvatar">{row.username.slice(0,1).toUpperCase()}</span>}<div className="reputationUser"><b>@{row.username}</b><small>{levelTitle(row.level)} · Nivel {row.level}</small></div><div className="reputationMetric"><b>{row.xp.toLocaleString("es-ES")}</b><small>XP</small></div><div className="reputationMetric"><b>{row.achievements}</b><small>insignias</small></div></Link>)}</div>
    </section>
  </div>;
}
