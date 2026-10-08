import { createClient } from "@/lib/supabase/server";

export type ReputationSummary = {
  xp: number;
  level: number;
  current_level_xp: number;
  next_level_xp: number;
  progress_percent: number;
  achievement_count: number;
};

export type Achievement = {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sort_order: number;
  unlocked_at?: string;
};

export type XpEvent = {
  id: string;
  event_type: string;
  source_type: string;
  source_id: string;
  xp: number;
  created_at: string;
};

export type ReputationLeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  achievements: number;
};

export function levelTitle(level: number) {
  if (level >= 15) return "Leyenda";
  if (level >= 10) return "Maestro";
  if (level >= 7) return "Veterano";
  if (level >= 4) return "Aventurero";
  if (level >= 2) return "Jugador";
  return "Novato";
}


export function achievementMaterialIcon(code: string) {
  const icons: Record<string, string> = {
    first_post: "edit_note",
    ten_posts: "campaign",
    ten_comments: "forum",
    five_reviews: "rate_review",
    ten_completed: "task_alt",
    ten_followers: "group",
    twentyfive_votes: "arrow_upward",
    twentyfive_helpful: "thumb_up",
    xp_1000: "bolt",
    xp_3000: "workspace_premium",
  };
  return icons[code] ?? "military_tech";
}

export function xpEventCopy(type: string) {
  const labels: Record<string, string> = {
    post_created: "Publicación en la comunidad",
    comment_created: "Comentario publicado",
    review_created: "Reseña publicada",
    game_completed: "Juego completado",
    follower_received: "Nuevo seguidor",
    post_vote_received: "Voto recibido",
    review_helpful_received: "Reseña marcada como útil",
  };
  return labels[type] ?? "Actividad en NIVOX";
}

export async function getReputation(profileId: string) {
  const supabase = await createClient();
  const [{ data: summaryRows }, { data: unlockedRows }, { data: catalogRows }] = await Promise.all([
    supabase.rpc("nivox_reputation_summary", { target_profile_id: profileId }),
    supabase.from("user_achievements").select("achievement_code,unlocked_at").eq("user_id", profileId),
    supabase.from("achievement_catalog").select("code,name,description,icon,category,sort_order").order("sort_order"),
  ]);

  const summaryRow = summaryRows?.[0];
  const summary: ReputationSummary = {
    xp: Number(summaryRow?.xp ?? 0),
    level: Number(summaryRow?.level ?? 1),
    current_level_xp: Number(summaryRow?.current_level_xp ?? 0),
    next_level_xp: Number(summaryRow?.next_level_xp ?? 50),
    progress_percent: Number(summaryRow?.progress_percent ?? 0),
    achievement_count: Number(summaryRow?.achievement_count ?? 0),
  };

  const unlockedMap = new Map((unlockedRows ?? []).map((row) => [row.achievement_code, row.unlocked_at]));
  const achievements: Achievement[] = (catalogRows ?? []).map((item) => ({
    ...item,
    sort_order: Number(item.sort_order ?? 0),
    unlocked_at: unlockedMap.get(item.code),
  }));

  return { summary, achievements };
}

export async function getMyXpEvents(userId: string, limit = 12) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reputation_events")
    .select("id,event_type,source_type,source_id,xp,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as XpEvent[];
}

type ReputationLeaderboardRpcRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  xp: number | string | null;
  level: number | string | null;
  achievements: number | string | null;
};

export async function getReputationLeaderboard(limit = 25) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nivox_reputation_leaderboard", { limit_count: limit });
  return ((data ?? []) as ReputationLeaderboardRpcRow[]).map((row: ReputationLeaderboardRpcRow) => ({
    ...row,
    xp: Number(row.xp ?? 0),
    level: Number(row.level ?? 1),
    achievements: Number(row.achievements ?? 0),
  })) as ReputationLeaderboardRow[];
}
