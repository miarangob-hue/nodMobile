import { apiRequest } from "./client";

export type HostingHost = {
  id: string;
  provider_id: string;
  host_name?: string | null;
  host_photo?: string | null;
  title?: string | null;
  bio?: string | null;
  property_type?: string | null;
  has_yard?: boolean;
  max_pets_capacity?: number;
  accepted_pet_types?: string[];
  accepted_pet_sizes?: string[];
  nightly_rate?: number;
  extra_pet_rate?: number;
  pickup_service_rate?: number;
  currency?: string;
  rules_and_amenities?: { amenities?: string[]; supervision_24_7?: boolean; emergency_transport?: boolean };
  photos?: Array<{ id?: string; label?: string; url?: string }>;
  address?: string | null;
  comuna?: string | null;
  rating?: number | null;
  review_count?: number;
  is_verified?: boolean;
  nights?: number;
  estimated_total?: number;
};

type HostingSearchResponse = { items?: HostingHost[]; total?: number; page?: number; total_pages?: number };
export type HostingDetail = { host: HostingHost; availability?: { blocked_dates?: string[]; custom_rates?: Array<{ date: string; rate: number }> }; booked_ranges?: Array<{ check_in: string; check_out: string; status: string }> };
export type HostingBooking = { id: string; status: string; total_amount?: number; currency?: string; check_in?: string; check_out?: string; hosting_profile_id?: string; host_name?: string; pet_names?: string[] };

export async function searchHosting({ comuna, checkIn, checkOut, pets = 1, accessToken }: { comuna?: string; checkIn?: string; checkOut?: string; pets?: number; accessToken?: string | null }) {
  const response = await apiRequest<HostingSearchResponse>("/hosting/search", { query: { comuna, check_in: checkIn, check_out: checkOut, pets }, apiKeyKind: "customer", accessToken });
  return { items: response.items ?? [], total: response.total ?? response.items?.length ?? 0 };
}

export function getHostingHost(id: string, from?: string, to?: string, accessToken?: string | null) {
  return apiRequest<HostingDetail>(`/hosting/hosts/${encodeURIComponent(id)}`, { query: { from, to }, apiKeyKind: "customer", accessToken });
}

export async function createHostingBooking({ hostingProfileId, customerId: _customerId, checkIn, checkOut, petIds, pickupRequired = false, specialInstructions, accessToken }: { hostingProfileId: string; customerId: string; checkIn: string; checkOut: string; petIds: string[]; pickupRequired?: boolean; specialInstructions?: string | null; accessToken?: string | null }): Promise<HostingBooking | undefined> {
  const response = await apiRequest<{ booking?: HostingBooking } | HostingBooking>("/hosting/bookings", {
    method: "POST", apiKeyKind: "customer", accessToken,
    body: { hosting_profile_id: hostingProfileId, check_in: checkIn, check_out: checkOut, pet_ids: petIds, pickup_required: pickupRequired, special_instructions: specialInstructions }
  });
  return "booking" in response ? response.booking : response as HostingBooking;
}

export async function getMyHostingBookings(accessToken?: string | null) {
  const response = await apiRequest<{ bookings?: HostingBooking[]; items?: HostingBooking[] } | HostingBooking[]>("/hosting/bookings/my-bookings", { apiKeyKind: "customer", accessToken });
  if (Array.isArray(response)) return response;
  return response.bookings ?? response.items ?? [];
}

export async function updateHostingBookingStatus(bookingId: string, status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED", accessToken?: string | null) {
  const response = await apiRequest<{ booking?: HostingBooking } | HostingBooking>(`/hosting/bookings/${encodeURIComponent(bookingId)}/status`, { method: "PUT", apiKeyKind: "customer", accessToken, body: { status } });
  return "booking" in response ? response.booking : response as HostingBooking;
}
