"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MaterialIcon } from "@/components/MaterialIcon";

type Status = "wishlist" | "playing" | "completed" | null;

const labels: Record<Exclude<Status, null>, { label: string; icon: string }> = {
  wishlist: { label: "Quiero jugar", icon: "favorite" },
  playing: { label: "Jugando", icon: "sports_esports" },
  completed: { label: "Completado", icon: "check_circle" },
};

export function GameLibraryButtons({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_games")
        .select("status")
        .eq("user_id", user.id)
        .eq("game_slug", slug)
        .maybeSingle();

      if (!cancelled && data?.status && ["wishlist", "playing", "completed"].includes(data.status)) {
        setStatus(data.status as Exclude<Status, null>);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [configured, slug]);

  async function choose(next: Exclude<Status, null>) {
    setFeedback("");
    if (!configured) {
      setFeedback("Configura Supabase para activar tu biblioteca.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const removing = status === next;
    const payload: Record<string, unknown> = {
      user_id: user.id,
      game_slug: slug,
      status: next,
      updated_at: new Date().toISOString(),
    };
    if (next !== "completed") {
      payload.completion_kind = "none";
      payload.completed_on = null;
    }
    const result = removing
      ? await supabase.from("user_games").delete().eq("user_id", user.id).eq("game_slug", slug)
      : await supabase.from("user_games").upsert(payload, { onConflict: "user_id,game_slug" });

    if (result.error) {
      setFeedback("No se pudo guardar. Revisa la configuración de Supabase.");
    } else {
      setStatus(removing ? null : next);
      setFeedback(removing ? "Eliminado de tu biblioteca." : next === "wishlist" ? "Guardado en wishlist. Te avisaremos cuando se acerque su lanzamiento." : "Guardado en Mi NIVOX.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="libraryActions" aria-label="Estado del juego">
        {(Object.keys(labels) as Exclude<Status, null>[]).map((item) => (
          <button disabled={loading} key={item} className={status === item ? "active" : ""} onClick={() => choose(item)}>
            <MaterialIcon name={status === item ? "check" : labels[item].icon} size={17} filled={status === item} />{labels[item].label}
          </button>
        ))}
      </div>
      {feedback && <p className="libraryFeedback">{feedback}</p>}
    </div>
  );
}
