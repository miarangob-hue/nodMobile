import { apiRequest } from "./client";

export type CommunityPost = {
  id: string; caption: string; media_url?: string | null; location?: string | null; pet_type?: string | null;
  tags?: string[]; likes_count?: number; comments_count?: number; user_has_liked?: boolean; created_at?: string;
  author?: { id: string; display_name?: string | null; avatar_url?: string | null };
  pet?: { id: string; name?: string | null; photo_url?: string | null } | null;
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
