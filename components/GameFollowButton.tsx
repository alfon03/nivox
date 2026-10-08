"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MaterialIcon } from "@/components/MaterialIcon";

export function GameFollowButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const { data } = await supabase
        .from("game_follows")
        .select("game_slug")
        .eq("user_id", user.id)
        .eq("game_slug", slug)
        .maybeSingle();
      if (!cancelled) {
        setFollowing(Boolean(data));
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  async function toggle() {
    setFeedback("");
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const result = following
      ? await supabase.from("game_follows").delete().eq("user_id", user.id).eq("game_slug", slug)
      : await supabase.from("game_follows").insert({ user_id: user.id, game_slug: slug });

    if (result.error) {
      setFeedback("No se pudo guardar el seguimiento.");
    } else {
      setFollowing(!following);
      setFeedback(following ? "Has dejado de seguir este juego." : "Ahora recibirás novedades de este juego.");
      router.refresh();
    }
    setLoading(false);
  }

  return <div className={compact ? "gameFollow compact" : "gameFollow"}>
    <button type="button" className={following ? "gameFollowBtn active" : "gameFollowBtn"} disabled={loading} onClick={toggle}>
      <MaterialIcon name={following ? "notifications_active" : "add_alert"} size={18} filled={following} />{following ? "Siguiendo" : "Seguir juego"}
    </button>
    {!compact && <span>Noticias, guías y cambios de lanzamiento en tus notificaciones.</span>}
    {feedback && !compact && <small>{feedback}</small>}
  </div>;
}
