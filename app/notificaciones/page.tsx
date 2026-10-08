import { redirect } from "next/navigation";
import { markAllNotificationsRead, openGameAlert, openNotification } from "@/app/social/actions";
import { createClient } from "@/lib/supabase/server";
import { notificationCopy, notificationIcon, type NotificationType } from "@/lib/social";
import { gameAlertCopy, gameAlertIcon, type GameAlertType } from "@/lib/game-alerts";
import { MaterialIcon } from "@/components/MaterialIcon";

export const dynamic = "force-dynamic";

type ActorRow = { id: string; username: string; avatar_url: string | null };
type AlertGameRow = { slug: string; title: string };

type TimelineItem =
  | { kind: "social"; id: string; created_at: string; read_at: string | null; type: NotificationType; actor_id: string; source_id: string; post_id: string | null }
  | { kind: "game"; id: string; created_at: string; read_at: string | null; type: GameAlertType; game_slug: string; source_id: string; href: string };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/notificaciones");

  await supabase.rpc("nivox_sync_my_release_alerts");
  const [{ data: socialRows }, { data: gameRows }] = await Promise.all([
    supabase.from("notifications").select("id,actor_id,type,source_type,source_id,post_id,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(80),
    supabase.from("game_alerts").select("id,game_slug,type,source_id,href,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(80),
  ]);

  const actorIds = [...new Set((socialRows ?? []).map((row) => row.actor_id))];
  const gameSlugs = [...new Set((gameRows ?? []).map((row) => row.game_slug))];
  const [{ data: actors }, { data: games }] = await Promise.all([
    actorIds.length ? supabase.from("profiles").select("id,username,avatar_url").in("id", actorIds) : Promise.resolve({ data: [] as Array<{ id: string; username: string; avatar_url: string | null }> }),
    gameSlugs.length ? supabase.from("games").select("slug,title").in("slug", gameSlugs) : Promise.resolve({ data: [] as Array<{ slug: string; title: string }> }),
  ]);
  const actorRows = (actors ?? []) as ActorRow[];
  const alertGameRows = (games ?? []) as AlertGameRow[];
  const actorMap = new Map<string, ActorRow>(actorRows.map((actor) => [actor.id, actor]));
  const gameMap = new Map<string, string>(alertGameRows.map((game) => [game.slug, game.title]));

  const timeline: TimelineItem[] = [
    ...(socialRows ?? []).map((row) => ({ kind: "social" as const, ...row, type: row.type as NotificationType })),
    ...(gameRows ?? []).map((row) => ({ kind: "game" as const, ...row, type: row.type as GameAlertType })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const unread = timeline.filter((row) => !row.read_at).length;

  return <div className="shell pageStack notificationsPage">
    <section className="adminTitleRow"><div><span className="eyebrow">TU ACTIVIDAD</span><h1>Notificaciones</h1><p className="muted">Comunidad y novedades de los juegos que sigues o tienes en wishlist.</p></div>{unread > 0 && <form action={markAllNotificationsRead}><button className="ghostBtn" type="submit">Marcar todo como leído</button></form>}</section>
    {timeline.length ? <div className="notificationList">{timeline.map((row) => {
      if (row.kind === "game") {
        const gameTitle = gameMap.get(row.game_slug) ?? row.game_slug;
        return <article className={`panel notificationCard gameNotification ${row.read_at ? "" : "unread"}`} key={`g-${row.id}`}><span className="notificationIcon"><MaterialIcon name={gameAlertIcon(row.type)} size={23} filled={!row.read_at}/></span><div className="notificationBody"><b>{gameAlertCopy(row.type, gameTitle, row.source_id)}</b><small>{new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}</small></div><form action={openGameAlert}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="href" value={row.href}/><button className="ghostBtn compactBtn" type="submit">Abrir</button></form></article>;
      }
      const actor = actorMap.get(row.actor_id) ?? { username: "Jugador NIVOX", avatar_url: null };
      const href = row.type === "follow" ? `/usuarios/${actor.username}` : row.post_id ? `/comunidad/${row.post_id}${row.type === "reply" || row.type === "comment" ? "#comentarios" : ""}` : "/comunidad";
      return <article className={`panel notificationCard ${row.read_at ? "" : "unread"}`} key={`s-${row.id}`}><span className="notificationIcon"><MaterialIcon name={notificationIcon(row.type)} size={23} filled={!row.read_at}/></span><div className="notificationBody"><b>{notificationCopy(row.type, `@${actor.username}`)}</b><small>{new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}</small></div><form action={openNotification}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="href" value={href}/><button className="ghostBtn compactBtn" type="submit">Abrir</button></form></article>;
    })}</div> : <div className="panel emptyState"><h3>Todo tranquilo por aquí</h3><p>Cuando alguien interactúe contigo o haya novedades de tus juegos, aparecerán aquí.</p></div>}
  </div>;
}
