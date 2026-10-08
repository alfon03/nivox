import { createClient } from "@/lib/supabase/server";

export const COMMUNITY_TYPES = ["debate", "pregunta", "teoria", "captura", "coleccion"] as const;
export type CommunityType = typeof COMMUNITY_TYPES[number];

export function communityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    debate: "Debate",
    pregunta: "Pregunta",
    teoria: "Teoría",
    captura: "Captura",
    coleccion: "Colección",
  };
  return labels[type] ?? "Debate";
}

export function isCommunityType(value: string): value is CommunityType {
  return (COMMUNITY_TYPES as readonly string[]).includes(value);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateCommunityImageUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.local");
    if (url.origin !== project.origin) return "La imagen no pertenece al almacenamiento de NIVOX.";
    if (!url.pathname.startsWith("/storage/v1/object/public/community-media/")) return "La URL de imagen no es válida.";
    return null;
  } catch {
    return "La URL de imagen no es válida.";
  }
}

type FetchOptions = { sort?: string; type?: string; limit?: number };

export async function fetchCommunityPosts(options: FetchOptions = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from("community_posts")
    .select("id,author_id,title,body,type,game_slug,image_url,has_spoiler,vote_count,comment_count,created_at,updated_at,edited_at")
    .eq("status", "published")
    .limit(options.limit ?? 30);

  if (options.type && isCommunityType(options.type)) query = query.eq("type", options.type);
  query = options.sort === "popular"
    ? query.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false });

  const { data: posts, error } = await query;
  if (error || !posts?.length) return { posts: [], userId: user?.id ?? null };

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const gameSlugs = [...new Set(posts.map((p) => p.game_slug).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: games }, votes] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url").in("id", authorIds),
    gameSlugs.length ? supabase.from("games").select("slug,title").in("slug", gameSlugs) : Promise.resolve({ data: [] as { slug: string; title: string }[] }),
    user ? supabase.from("community_votes").select("post_id").eq("user_id", user.id).in("post_id", posts.map((p) => p.id)) : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const gameMap = new Map((games ?? []).map((g) => [g.slug, g]));
  const voted = new Set((votes.data ?? []).map((v) => v.post_id));

  return {
    userId: user?.id ?? null,
    posts: posts.map((post) => ({
      ...post,
      author: profileMap.get(post.author_id) ?? { id: post.author_id, username: "Jugador NIVOX", avatar_url: null },
      game: post.game_slug ? gameMap.get(post.game_slug) ?? null : null,
      votedByMe: voted.has(post.id),
    })),
  };
}

export async function fetchCommunityPost(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: post } = await supabase
    .from("community_posts")
    .select("id,author_id,title,body,type,game_slug,image_url,has_spoiler,vote_count,comment_count,created_at,updated_at,edited_at")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!post) return null;

  const [{ data: author }, { data: game }, { data: comments }, { data: myVote }] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url").eq("id", post.author_id).maybeSingle(),
    post.game_slug ? supabase.from("games").select("slug,title").eq("slug", post.game_slug).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("community_comments").select("id,post_id,author_id,parent_comment_id,body,created_at,updated_at,edited_at").eq("post_id", id).eq("status", "published").order("created_at", { ascending: true }),
    user ? supabase.from("community_votes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const commentRows = comments ?? [];
  const commentAuthorIds = [...new Set(commentRows.map((c) => c.author_id))];
  const { data: commentProfiles } = commentAuthorIds.length
    ? await supabase.from("profiles").select("id,username,avatar_url").in("id", commentAuthorIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
  const profileMap = new Map((commentProfiles ?? []).map((p) => [p.id, p]));
  const commentMap = new Map(commentRows.map((c) => [c.id, c]));

  return {
    userId: user?.id ?? null,
    post: {
      ...post,
      author: author ?? { id: post.author_id, username: "Jugador NIVOX", avatar_url: null },
      game: game ?? null,
      votedByMe: Boolean(myVote),
    },
    comments: commentRows.map((comment) => {
      const parent = comment.parent_comment_id ? commentMap.get(comment.parent_comment_id) : null;
      return {
        ...comment,
        author: profileMap.get(comment.author_id) ?? { id: comment.author_id, username: "Jugador NIVOX", avatar_url: null },
        parentAuthor: parent ? profileMap.get(parent.author_id) ?? null : null,
      };
    }),
  };
}


export async function fetchPersonalizedFeed(limit = 40) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fetchCommunityPosts({ sort: "recent", limit });

  const [{ data: follows }, { data: library }, { data: rows }] = await Promise.all([
    supabase.from("user_follows").select("following_id").eq("follower_id", user.id),
    supabase.from("user_games").select("game_slug").eq("user_id", user.id),
    supabase.from("community_posts")
      .select("id,author_id,title,body,type,game_slug,image_url,has_spoiler,vote_count,comment_count,created_at,updated_at,edited_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const posts = rows ?? [];
  if (!posts.length) return { posts: [], userId: user.id };
  const followed = new Set((follows ?? []).map((x) => x.following_id));
  const gameSlugs = new Set((library ?? []).map((x) => x.game_slug));
  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const usedGameSlugs = [...new Set(posts.map((p) => p.game_slug).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: games }, { data: votes }] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url").in("id", authorIds),
    usedGameSlugs.length ? supabase.from("games").select("slug,title").in("slug", usedGameSlugs) : Promise.resolve({ data: [] as { slug: string; title: string }[] }),
    supabase.from("community_votes").select("post_id").eq("user_id", user.id).in("post_id", posts.map((p) => p.id)),
  ]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const gameMap = new Map((games ?? []).map((g) => [g.slug, g]));
  const voted = new Set((votes ?? []).map((v) => v.post_id));
  const now = Date.now();

  const enriched = posts.map((post) => {
    const ageHours = Math.max(0, (now - new Date(post.created_at).getTime()) / 36e5);
    const recency = Math.max(0, 48 - ageHours) / 12;
    const score = (followed.has(post.author_id) ? 12 : 0)
      + (post.game_slug && gameSlugs.has(post.game_slug) ? 7 : 0)
      + Math.min(Number(post.vote_count ?? 0), 30) * 0.35
      + Math.min(Number(post.comment_count ?? 0), 20) * 0.25
      + recency;
    return {
      ...post,
      author: profileMap.get(post.author_id) ?? { id: post.author_id, username: "Jugador NIVOX", avatar_url: null },
      game: post.game_slug ? gameMap.get(post.game_slug) ?? null : null,
      votedByMe: voted.has(post.id),
      feedReason: followed.has(post.author_id) ? "Sigues a este jugador" : post.game_slug && gameSlugs.has(post.game_slug) ? "Está en tu biblioteca" : "Recomendado para ti",
      _score: score,
    };
  });

  enriched.sort((a, b) => b._score - a._score || +new Date(b.created_at) - +new Date(a.created_at));
  return { posts: enriched.slice(0, limit), userId: user.id };
}
