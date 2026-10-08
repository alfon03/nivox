import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveGameHistory } from "@/app/mi-nivox/actions";
import { createClient } from "@/lib/supabase/server";
import { completionKindIcon, completionKindLabel, formatPlaytime } from "@/lib/gamer-profile";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function GameHistoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/mi-nivox/juegos/${slug}`)}`);

  const [{ data: entry }, { data: game }] = await Promise.all([
    supabase.from("user_games").select("game_slug,status,platform_played,playtime_minutes,started_on,completed_on,achievements_unlocked,achievements_total,completion_kind,show_on_profile").eq("user_id", user.id).eq("game_slug", slug).maybeSingle(),
    supabase.from("games").select("slug,title,platform,cover_url").eq("slug", slug).maybeSingle(),
  ]);
  if (!game) notFound();
  if (!entry) redirect(`/juegos/${slug}?message=${encodeURIComponent("Añade el juego a tu biblioteca antes de registrar tu historial.")}`);

  const totalMinutes = Number(entry.playtime_minutes ?? 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return <div className="shell pageStack gamerHistoryPage">
    <Link className="backLink" href="/mi-nivox"><MaterialIcon name="arrow_back" size={17}/>Mi NIVOX</Link>
    {query.error && <div className="notice error">{query.error}</div>}
    {query.message && <div className="notice success">{query.message}</div>}
    <section className="panel gamerHistoryHero">
      <div>
        <span className="eyebrow">HISTORIAL GAMER</span>
        <h1>{game.title}</h1>
        <p>Registra tus horas, plataforma, logros y progreso. Tú decides si aparece en tu perfil público.</p>
      </div>
      <div className="historySnapshot"><b>{formatPlaytime(totalMinutes)}</b><span className="inlineIconText"><MaterialIcon name={completionKindIcon(entry.completion_kind) || (entry.status === "completed" ? "check_circle" : entry.status === "playing" ? "sports_esports" : "favorite")} size={18} filled/>{completionKindLabel(entry.completion_kind) || (entry.status === "completed" ? "Completado" : entry.status === "playing" ? "Jugando" : "Wishlist")}</span></div>
    </section>

    <form action={saveGameHistory} className="panel gamerHistoryForm">
      <input type="hidden" name="game_slug" value={slug}/>
      <input type="hidden" name="return_to" value={`/mi-nivox/juegos/${slug}`}/>
      <div className="historyFormGrid">
        <label>Plataforma en la que lo jugaste
          <input name="platform_played" maxLength={60} defaultValue={entry.platform_played ?? ""} placeholder={game.platform ?? "PS5, PC, Switch…"}/>
        </label>
        <label>Estado actual
          <input value={entry.status === "completed" ? "Completado" : entry.status === "playing" ? "Jugando" : "Quiero jugar"} disabled/>
          <small>Cambia el estado desde la ficha del juego.</small>
        </label>
        <label>Horas jugadas
          <input name="hours" type="number" min="0" max="166666" defaultValue={hours}/>
        </label>
        <label>Minutos
          <input name="minutes" type="number" min="0" max="59" defaultValue={minutes}/>
        </label>
        <label>Empezado el
          <input name="started_on" type="date" defaultValue={entry.started_on ?? ""}/>
        </label>
        <label>Terminado el
          <input name="completed_on" type="date" defaultValue={entry.completed_on ?? ""}/>
        </label>
        <label>Logros conseguidos
          <input name="achievements_unlocked" type="number" min="0" defaultValue={entry.achievements_unlocked ?? ""} placeholder="42"/>
        </label>
        <label>Logros totales
          <input name="achievements_total" type="number" min="0" defaultValue={entry.achievements_total ?? ""} placeholder="50"/>
        </label>
        <label className="historyWide">Completado especial
          <select name="completion_kind" defaultValue={entry.completion_kind ?? "none"}>
            <option value="none">Ninguno</option>
            <option value="platinum">Platino (PlayStation)</option>
            <option value="all_achievements">Todos los logros</option>
            <option value="hundred_percent">100 % completado</option>
          </select>
        </label>
      </div>
      <label className="privacyToggle"><input name="show_on_profile" type="checkbox" defaultChecked={entry.show_on_profile !== false}/><span><b>Mostrar este juego en mi perfil público</b><small>Las horas, logros y progreso serán visibles para otros usuarios.</small></span></label>
      <div className="historyPrivacyNote"><MaterialIcon name="info" size={18}/><span>Estos datos los introduces tú manualmente y NIVOX los mostrará como información no verificada.</span></div>
      <div className="formFooterActions"><Link className="ghostBtn" href={`/juegos/${slug}`}>Ver ficha del juego</Link><button className="primaryBtn" type="submit">Guardar historial</button></div>
    </form>
  </div>;
}
