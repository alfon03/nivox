import { createClient } from "@/lib/supabase/server";
import { getReputation } from "@/lib/reputation";

export type NotificationType = "follow" | "comment" | "reply" | "vote";

export function notificationCopy(type: NotificationType, username: string) {
  const messages: Record<NotificationType, string> = {
    follow: `${username} empezó a seguirte.`,
    comment: `${username} comentó tu publicación.`,
    reply: `${username} respondió a tu comentario.`,
    vote: `${username} votó tu publicación.`,
  };
  return messages[type];
}

export function notificationIcon(type: NotificationType) {
  return ({ follow: "person_add", comment: "chat_bubble", reply: "reply", vote: "arrow_upward" } as const)[type];
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  return count ?? 0;
}

export async function getPublicProfile(username: string) {
  const supabase = await createClient();
  const normalized = decodeURIComponent(username).trim().toLowerCase();
  const { data: profile } = await supabase.from("profiles").select("id,username,full_name,bio,avatar_url,role,created_at").eq("username", normalized).maybeSingle();
  if (!profile) return null;

  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: statsRows }, { data: posts }, { data: reviews }, followResult, { data: gamerStatsRows }, { data: gameHistoryRows }, { data: gamingAccounts }] = await Promise.all([
    supabase.rpc("nivox_profile_stats", { profile_id: profile.id }),
    supabase.from("community_posts").select("id,title,type,vote_count,comment_count,created_at").eq("author_id", profile.id).eq("status", "published").order("created_at", { ascending: false }).limit(8),
    supabase.from("game_reviews").select("id,game_slug,score,body,helpful_count,created_at").eq("author_id", profile.id).eq("status", "published").order("created_at", { ascending: false }).limit(6),
    user && user.id !== profile.id ? supabase.from("user_follows").select("follower_id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("nivox_gamer_profile_stats", { profile_id: profile.id }),
    supabase.from("user_games").select("game_slug,status,platform_played,playtime_minutes,started_on,completed_on,achievements_unlocked,achievements_total,completion_kind,updated_at").eq("user_id", profile.id).eq("show_on_profile", true).order("updated_at", { ascending: false }).limit(12),
    supabase.from("gaming_accounts").select("platform,handle").eq("user_id", profile.id).eq("is_public", true).order("platform"),
  ]);

  const reviewRows = reviews ?? [];
  const historyRows = gameHistoryRows ?? [];
  const gameSlugs = [...new Set([...reviewRows.map((review) => review.game_slug), ...historyRows.map((row) => row.game_slug)])];
  const { data: games } = gameSlugs.length ? await supabase.from("games").select("slug,title,platform,accent").in("slug", gameSlugs) : { data: [] as Array<{ slug:string;title:string;platform:string|null;accent:string|null }> };
  const gameMap = new Map((games ?? []).map((game) => [game.slug, game]));
  const publicReviews = reviewRows.map((review) => ({ ...review, score: Number(review.score), game_title: gameMap.get(review.game_slug)?.title ?? review.game_slug }));
  const gameHistory = historyRows.map((row) => ({ ...row, playtime_minutes: Number(row.playtime_minutes ?? 0), game_title: gameMap.get(row.game_slug)?.title ?? row.game_slug, game_platform: gameMap.get(row.game_slug)?.platform ?? null }));
  const stats = statsRows?.[0] ?? { followers: 0, following: 0, posts: 0, votes: 0, comments: 0 };
  const gamerStats = gamerStatsRows?.[0] ?? { games_visible: 0, completed_games: 0, platinum_games: 0, total_playtime_minutes: 0, achievements_unlocked: 0, achievements_total: 0 };
  const reputation = await getReputation(profile.id);

  return {
    profile,
    stats,
    posts: posts ?? [],
    reviews: publicReviews,
    viewerId: user?.id ?? null,
    isFollowing: Boolean(followResult.data),
    reputation,
    gamerStats,
    gameHistory,
    gamingAccounts: gamingAccounts ?? [],
  };
}

export async function getProfileConnections(username: string, mode: "followers" | "following") {
  const supabase = await createClient();
  const normalized = decodeURIComponent(username).trim().toLowerCase();
  const { data: profile } = await supabase.from("profiles").select("id,username").eq("username", normalized).maybeSingle();
  if (!profile) return null;

  const column = mode === "followers" ? "following_id" : "follower_id";
  const { data: rows } = await supabase.from("user_follows").select("follower_id,following_id,created_at").eq(column, profile.id).order("created_at", { ascending: false }).limit(100);
  const ids = (rows ?? []).map((row) => mode === "followers" ? row.follower_id : row.following_id).filter(Boolean);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,username,full_name,bio,avatar_url,role").in("id", ids) : { data: [] as Array<{ id: string; username: string; full_name: string | null; bio: string | null; avatar_url: string | null; role: string }> };
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
  return { profile, people: ids.map((id) => profileMap.get(id)).filter(Boolean) };
}
