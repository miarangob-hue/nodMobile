import { apiRequest } from "./client";

export type CommunityPost = {
  id: string; caption: string; media_url?: string | null; location?: string | null; pet_type?: string | null;
  tags?: string[]; likes_count?: number; comments_count?: number; user_has_liked?: boolean; created_at?: string;
  author?: { id: string; display_name?: string | null; avatar_url?: string | null };
  pet?: { id: string; name?: string | null; photo_url?: string | null } | null;
};

export type CommunityStats = {
  user_id: string;
  points: number;
  level: number;
  level_name: string;
  progress_pct: number;
  badges_unlocked: number;
  badges_total: number;
  global_rank?: number | null;
  commune?: string | null;
};

export type CommunityBadge = {
  key: string;
  name: string;
  description: string;
  icon?: string | null;
  unlocked: boolean;
  unlocked_at?: string | null;
  current: number;
  target: number;
};

export type CommunityRankingItem = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  points: number;
  level: number;
  level_name: string;
  badges_count?: number;
  commune?: string | null;
};

export type CommunityRanking = {
  period: "all_time" | "monthly" | "weekly";
  commune?: string | null;
  total: number;
  items: CommunityRankingItem[];
  my_rank?: CommunityRankingItem | null;
};

export async function getCommunityFeed({ userId: _userId, filter = "for_you", accessToken }: { userId?: string; filter?: "for_you" | "following" | "nearby"; accessToken?: string | null }) {
  const response = await apiRequest<{ posts?: CommunityPost[]; items?: CommunityPost[] }>("/feed", { query: { filter, pet_type: "all", page: 1, limit: 30 }, apiKeyKind: "customer", accessToken });
  return response.posts ?? response.items ?? [];
}

export async function createCommunityPost({ caption, mediaBase64, petId, location, accessToken }: { caption: string; mediaBase64?: string | null; petId?: string | null; location?: string | null; accessToken?: string | null }) {
  const response = await apiRequest<{ post?: CommunityPost } | CommunityPost>("/posts", { method: "POST", apiKeyKind: "customer", accessToken, body: { caption, media_base64: mediaBase64, pet_id: petId, location, pet_type: "dog" } });
  return "post" in response ? response.post : response as CommunityPost;
}

export function toggleCommunityLike(postId: string, accessToken?: string | null) {
  return apiRequest<{ liked: boolean; likes_count: number }>(`/posts/${encodeURIComponent(postId)}/like`, { method: "POST", apiKeyKind: "customer", accessToken });
}

export function addCommunityComment(postId: string, content: string, petId?: string | null, accessToken?: string | null) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", apiKeyKind: "customer", accessToken, body: { content, pet_id: petId } });
}

export async function getCommunityStats(accessToken?: string | null): Promise<CommunityStats> {
  const response = await apiRequest<Record<string, unknown>>("/community/stats", { apiKeyKind: "customer", accessToken });
  return {
    user_id: String(response.user_id ?? ""),
    points: Number(response.points ?? 0),
    level: Number(response.level ?? 1),
    level_name: String(response.level_name ?? "Cachorro"),
    progress_pct: Number(response.progress_pct ?? 0),
    badges_unlocked: Number(response.badges_unlocked ?? response.badges_count ?? 0),
    badges_total: Number(response.badges_total ?? 0),
    global_rank: response.global_rank == null ? (response.rank == null ? null : Number(response.rank)) : Number(response.global_rank),
    commune: response.commune == null ? null : String(response.commune)
  };
}

export async function getCommunityBadges(accessToken?: string | null): Promise<CommunityBadge[]> {
  const response = await apiRequest<{ badges?: Array<Partial<CommunityBadge> & { badge_key?: string; badge_name?: string; progress?: number; threshold?: number }> }>("/community/badges", { apiKeyKind: "customer", accessToken });
  return (response.badges ?? []).map((badge) => ({
    key: String(badge.key ?? badge.badge_key ?? "badge"),
    name: String(badge.name ?? badge.badge_name ?? "Medalla NOD"),
    description: String(badge.description ?? ""),
    icon: badge.icon ?? null,
    unlocked: Boolean(badge.unlocked),
    unlocked_at: badge.unlocked_at ?? null,
    current: Number(badge.current ?? badge.progress ?? 0),
    target: Number(badge.target ?? badge.threshold ?? 0)
  }));
}

export async function getCommunityRanking({ period = "all_time", commune, accessToken }: { period?: "all_time" | "monthly" | "weekly"; commune?: string | null; accessToken?: string | null }): Promise<CommunityRanking> {
  type RawRankingItem = Partial<CommunityRankingItem> & { position?: number; author?: { display_name?: string | null; avatar_url?: string | null } };
  const response = await apiRequest<{ period?: CommunityRanking["period"]; commune?: string | null; total?: number; total_users?: number; items?: RawRankingItem[]; ranking?: RawRankingItem[]; my_rank?: RawRankingItem | null }>("/community/ranking", {
    query: { period, commune, page: 1, limit: 20 }, apiKeyKind: "customer", accessToken
  });
  const normalizeItem = (item: RawRankingItem): CommunityRankingItem => ({
    rank: Number(item.rank ?? item.position ?? 0),
    user_id: String(item.user_id ?? ""),
    display_name: String(item.display_name ?? item.author?.display_name ?? "Tutor NOD"),
    avatar_url: item.avatar_url ?? item.author?.avatar_url ?? null,
    points: Number(item.points ?? 0),
    level: Number(item.level ?? 1),
    level_name: String(item.level_name ?? "Cachorro"),
    badges_count: item.badges_count == null ? undefined : Number(item.badges_count),
    commune: item.commune ?? null
  });
  return {
    period: response.period ?? period,
    commune: response.commune ?? commune,
    total: Number(response.total ?? response.total_users ?? 0),
    items: (response.items ?? response.ranking ?? []).map(normalizeItem),
    my_rank: response.my_rank ? normalizeItem(response.my_rank) : null
  };
}
