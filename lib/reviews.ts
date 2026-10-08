import { createClient } from "@/lib/supabase/server";

export type ReviewSort = "helpful" | "recent" | "high" | "low";

export type GameReviewView = {
  id: string;
  game_slug: string;
  author_id: string;
  score: number;
  body: string;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  updated_at: string;
  status?: string;
  author: { username: string; full_name: string | null; avatar_url: string | null };
  myVote: boolean | null;
};


export type GameRankingRow = {
  game_slug: string;
  title: string;
  genre: string | null;
  platform: string | null;
  cover_url: string | null;
  avg_score: number;
  review_count: number;
  helpful_total: number;
};

export type ReviewSummary = {
  avg_score: number | null;
  review_count: number;
  bucket_9_10: number;
  bucket_7_8: number;
  bucket_5_6: number;
  bucket_3_4: number;
  bucket_1_2: number;
};

export async function fetchGameReviews(gameSlug: string, sort: ReviewSort = "helpful") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase.from("game_reviews")
    .select("id,game_slug,author_id,score,body,helpful_count,unhelpful_count,created_at,updated_at,status")
    .eq("game_slug", gameSlug)
    .eq("status", "published");

  if (sort === "recent") query = query.order("created_at", { ascending: false });
  else if (sort === "high") query = query.order("score", { ascending: false }).order("helpful_count", { ascending: false });
  else if (sort === "low") query = query.order("score", { ascending: true }).order("helpful_count", { ascending: false });
  else query = query.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });

  const [{ data: reviews }, { data: summaryRows }] = await Promise.all([
    query.limit(100),
    supabase.rpc("nivox_game_review_summary", { target_game_slug: gameSlug }),
  ]);

  const rows = reviews ?? [];
  const authorIds = [...new Set(rows.map((review) => review.author_id))];
  const reviewIds = rows.map((review) => review.id);
  const [{ data: profiles }, { data: votes }] = await Promise.all([
    authorIds.length ? supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", authorIds) : Promise.resolve({ data: [] as { id:string; username:string; full_name:string|null; avatar_url:string|null }[] }),
    user && reviewIds.length ? supabase.from("game_review_votes").select("review_id,is_helpful").eq("user_id", user.id).in("review_id", reviewIds) : Promise.resolve({ data: [] as { review_id:string; is_helpful:boolean }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const voteMap = new Map((votes ?? []).map((vote) => [vote.review_id, vote.is_helpful]));
  const hydrated: GameReviewView[] = rows.map((review) => ({
    ...review,
    score: Number(review.score),
    helpful_count: review.helpful_count ?? 0,
    unhelpful_count: review.unhelpful_count ?? 0,
    author: profileMap.get(review.author_id) ?? { username: "usuario", full_name: null, avatar_url: null },
    myVote: voteMap.has(review.id) ? Boolean(voteMap.get(review.id)) : null,
  }));

  const rawSummary = summaryRows?.[0];
  const summary: ReviewSummary = {
    avg_score: rawSummary?.avg_score == null ? null : Number(rawSummary.avg_score),
    review_count: Number(rawSummary?.review_count ?? 0),
    bucket_9_10: Number(rawSummary?.bucket_9_10 ?? 0),
    bucket_7_8: Number(rawSummary?.bucket_7_8 ?? 0),
    bucket_5_6: Number(rawSummary?.bucket_5_6 ?? 0),
    bucket_3_4: Number(rawSummary?.bucket_3_4 ?? 0),
    bucket_1_2: Number(rawSummary?.bucket_1_2 ?? 0),
  };

  let ownReview: { id: string; score: number; body: string; status: string } | null = null;
  if (user) {
    const publishedOwn = hydrated.find((review) => review.author_id === user.id);
    if (publishedOwn) {
      ownReview = { id: publishedOwn.id, score: publishedOwn.score, body: publishedOwn.body, status: publishedOwn.status ?? "published" };
    } else {
      const { data: hiddenOwn } = await supabase.from("game_reviews").select("id,score,body,status").eq("game_slug", gameSlug).eq("author_id", user.id).maybeSingle();
      if (hiddenOwn) ownReview = { id: hiddenOwn.id, score: Number(hiddenOwn.score), body: hiddenOwn.body, status: hiddenOwn.status };
    }
  }
  return { reviews: hydrated, summary, userId: user?.id ?? null, ownReview };
}

export async function fetchGameRankings(): Promise<GameRankingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nivox_game_rankings");
  return (data ?? []).map((row: any) => ({
    game_slug: row.game_slug as string,
    title: row.title as string,
    genre: row.genre as string | null,
    platform: row.platform as string | null,
    cover_url: row.cover_url as string | null,
    avg_score: Number(row.avg_score),
    review_count: Number(row.review_count),
    helpful_total: Number(row.helpful_total),
  }));
}
