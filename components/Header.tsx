import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { MaterialIcon } from "@/components/MaterialIcon";

const nav = [
  ["Inicio", "/"],
  ["Noticias", "/noticias"],
  ["Juegos", "/juegos"],
  ["Lanzamientos", "/lanzamientos"],
  ["Ranking", "/ranking"],
  ["Guías", "/guias"],
  ["Comunidad", "/comunidad"],
  ["Para ti", "/feed"],
  ["Logros", "/logros"],
  ["Mi NIVOX", "/mi-nivox"],
] as const;

export async function Header() {
  let username: string | null = null;
  let role: string | null = null;
  let signedIn = false;
  let unread = 0;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);

    if (user) {
      await supabase.rpc("nivox_sync_my_release_alerts");
      const [{ data: profile }, notificationResult, gameAlertResult] = await Promise.all([
        supabase.from("profiles").select("username,role").eq("id", user.id).maybeSingle(),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        supabase.from("game_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
      ]);
      username = profile?.username ?? user.email?.split("@")[0] ?? "Jugador";
      role = profile?.role ?? null;
      unread = (notificationResult.count ?? 0) + (gameAlertResult.count ?? 0);
    }
  }

  return (
    <header className="siteHeader">
      <div className="topbar shell">
        <Link className="brand" href="/" aria-label="NIVOX inicio">
          <span className="brandMark">N</span><span>NIVOX</span>
        </Link>
        <form className="searchBox" action="/buscar" method="get">
          <MaterialIcon name="search" size={21} />
          <input name="q" aria-label="Buscar" placeholder="Buscar juegos, noticias, guías, usuarios..." />
        </form>
        <div className="accountActions">
          {signedIn ? (
            <>
              <Link className="notificationPill iconPill" href="/notificaciones" aria-label={`${unread} notificaciones sin leer`}><MaterialIcon name="notifications" size={21} filled={unread > 0} />{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}</Link>
              <Link className="profilePill" href={username ? `/usuarios/${username}` : "/mi-nivox"}><MaterialIcon name="account_circle" size={20} /> <span>{username}</span></Link>
              {role === "admin" && <Link className="adminPill" href="/admin"><MaterialIcon name="admin_panel_settings" size={18} /> <span>Admin</span></Link>}
              <form action={logout}><button className="headerLogout" type="submit"><MaterialIcon name="logout" size={18} /><span>Salir</span></button></form>
            </>
          ) : (
            <Link className="profilePill" href="/auth/login"><MaterialIcon name="login" size={19} /><span>Entrar</span></Link>
          )}
        </div>
      </div>
      <nav className="nav shell" aria-label="Navegación principal">
        {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
    </header>
  );
}
