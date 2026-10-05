import { apiRequest } from "./client";

export type CommunitySpot = {
  id: string;
  customer_id: string;
  pet_id?: string | null;
  pet_name?: string | null;
  title: string;
  category: string;
  address?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  unlocked_at: string;
};

type SpotsResponse = { spots?: CommunitySpot[]; total?: number };

export async function listCustomerSpots({ customerId: _customerId, petId, accessToken }: { customerId: string; petId?: string | null; accessToken?: string | null }) {
  const response = await apiRequest<CommunitySpot[] | SpotsResponse>("/spots", {
    query: { pet_id: petId, limit: 100, offset: 0 },
    apiKeyKind: "customer",
    accessToken
  });
  return Array.isArray(response) ? response : response.spots ?? [];
}

export async function createCommunitySpot({ customerId: _customerId, petId, title, category, address, notes, photoBase64, latitude, longitude, accessToken }: {
  customerId: string; petId?: string | null; title: string; category: string; address?: string | null; notes?: string | null;
  photoBase64?: string | null; latitude?: number | null; longitude?: number | null; accessToken?: string | null;
}): Promise<CommunitySpot | undefined> {
  const response = await apiRequest<CommunitySpot | { spot?: CommunitySpot }>("/spots", {
    method: "POST",
    body: { pet_id: petId, title, category, address, notes, photo_base64: photoBase64, latitude, longitude },
    apiKeyKind: "customer",
    accessToken
  });
  if ("spot" in response) return response.spot;
  return response as CommunitySpot;
}
