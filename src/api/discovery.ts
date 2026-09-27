import { apiRequest } from "./client";
import type { DiscoveryCandidate, PetMatch } from "../types/api";

type CandidatesResponse = {
  items?: DiscoveryCandidate[];
  candidates?: DiscoveryCandidate[];
  next_cursor?: string | null;
};

type SwipeResponse = {
  matched?: boolean;
  match?: PetMatch | null;
};

type MatchesResponse = {
  items?: PetMatch[];
  matches?: PetMatch[];
  next_cursor?: string | null;
};

export async function getDiscoveryCandidates({
  petId,
  customerId,
  cursor,
  limit = 20,
  accessToken
}: {
  petId: string;
  customerId: string;
  cursor?: string | null;
  limit?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<CandidatesResponse>("/discovery/candidates", {
    query: { pet_id: petId, customer_id: customerId, cursor, limit },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  });

  return {
    candidates: response.items ?? response.candidates ?? [],
    nextCursor: response.next_cursor ?? null
  };
}

export function createDiscoverySwipe({
  actorPetId,
  customerId,
  targetPetId,
  decision,
  accessToken
}: {
  actorPetId: string;
  customerId: string;
  targetPetId: string;
  decision: "like" | "pass" | "super_like";
  accessToken?: string | null;
}) {
  return apiRequest<SwipeResponse>("/discovery/swipes", {
    method: "POST",
    body: {
      actor_pet_id: actorPetId,
      customer_id: customerId,
      target_pet_id: targetPetId,
      decision
    },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  });
}

export async function getPetMatches({
  petId,
  customerId,
  cursor,
  limit = 20,
  accessToken
}: {
  petId: string;
  customerId: string;
  cursor?: string | null;
  limit?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<MatchesResponse>("/matches", {
    query: { pet_id: petId, customer_id: customerId, cursor, limit },
    apiKeyKind: "customer",
    warnOnError: false,
    accessToken
  });

  return {
    matches: response.items ?? response.matches ?? [],
    nextCursor: response.next_cursor ?? null
  };
}

export function undoDiscoverySwipe({ actorPetId, customerId, targetPetId, accessToken }: { actorPetId: string; customerId: string; targetPetId: string; accessToken?: string | null }) {
  return apiRequest<{ ok: boolean }>("/discovery/swipes/undo", { method: "POST", body: { actor_pet_id: actorPetId, customer_id: customerId, target_pet_id: targetPetId }, apiKeyKind: "customer", warnOnError: false, accessToken });
}

export function blockDiscoveryPet({ actorPetId, customerId, targetPetId, accessToken }: { actorPetId: string; customerId: string; targetPetId: string; accessToken?: string | null }) {
  return apiRequest<{ ok: boolean }>("/discovery/blocks", { method: "POST", body: { actor_pet_id: actorPetId, customer_id: customerId, target_pet_id: targetPetId }, apiKeyKind: "customer", warnOnError: false, accessToken });
}

export function reportDiscoveryPet({ actorPetId, customerId, targetPetId, reason, accessToken }: { actorPetId: string; customerId: string; targetPetId: string; reason: string; accessToken?: string | null }) {
  return apiRequest<{ ok: boolean }>("/discovery/reports", { method: "POST", body: { actor_pet_id: actorPetId, customer_id: customerId, target_pet_id: targetPetId, reason }, apiKeyKind: "customer", warnOnError: false, accessToken });
}

export function sendDiscoveryMessage({ matchId, customerId, text, accessToken }: { matchId: string; customerId: string; text: string; accessToken?: string | null }) {
  return apiRequest<{ id: string; created_at: string }>(`/matches/${matchId}/messages`, { method: "POST", body: { customer_id: customerId, text }, apiKeyKind: "customer", warnOnError: false, accessToken });
}
