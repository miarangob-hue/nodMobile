import { apiRequest } from "./client";

export const HOSTING_SERVICE_ID = "90e09214-ffeb-4a57-8ba7-e317c2be6d4e";

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
export type HostingDetail = { host: HostingHost; availability?: { from?: string; to?: string; blocked_dates?: string[]; custom_rates?: Array<{ date: string; rate: number }> }; booked_ranges?: Array<{ check_in: string; check_out: string; status: string; pets?: number }> };
export type HostingBooking = { id: string; status: string; total_amount?: number; currency?: string; check_in?: string; check_out?: string; hosting_profile_id?: string; host_name?: string; pet_names?: string[] };

export async function searchHosting({ comuna, checkIn, checkOut, pets = 1, accessToken: _accessToken }: { comuna?: string; checkIn?: string; checkOut?: string; pets?: number; accessToken?: string | null }) {
  const response = await apiRequest<HostingSearchResponse>("/search-hosting", {
    query: { comuna, check_in: checkIn, check_out: checkOut, pets, page: 1, page_size: 50 },
    warnOnError: false
  });
  return { items: response.items ?? [], total: response.total ?? response.items?.length ?? 0 };
}

export function getHostingHost(id: string, from?: string, to?: string, _accessToken?: string | null) {
  return apiRequest<HostingDetail>("/get-hosting-host", { query: { id, from, to }, warnOnError: false });
}

export async function createHostingBooking({ hostingProfileId, providerId, customerId: _customerId, checkIn, checkOut, petIds, price, currency = "CLP", specialInstructions, accessToken }: { hostingProfileId: string; providerId: string; customerId: string; checkIn: string; checkOut: string; petIds: string[]; price: number; currency?: string; specialInstructions?: string | null; accessToken?: string | null }): Promise<HostingBooking | undefined> {
  const response = await apiRequest<{ booking?: Record<string, unknown>; reservation?: Record<string, unknown> } | Record<string, unknown>>("/create-booking-request", {
    method: "POST", accessToken,
    body: {
      provider_id: providerId,
      service_id: HOSTING_SERVICE_ID,
      price,
      currency,
      starts_at: new Date(`${checkIn}T14:00:00`).toISOString(),
      ends_at: new Date(`${checkOut}T12:00:00`).toISOString(),
      notes: [specialInstructions, `hosting_profile_id=${hostingProfileId}`, `pet_ids=${petIds.join(",")}`].filter(Boolean).join("; ")
    }
  });
  const raw = ("booking" in response ? response.booking : "reservation" in response ? response.reservation : response) as Record<string, unknown> | undefined;
  return raw ? normalizeHostingBooking(raw) : undefined;
}

export async function getMyHostingBookings(customerId: string, accessToken?: string | null) {
  const response = await apiRequest<{ bookings?: Record<string, unknown>[]; data?: Record<string, unknown>[] } | Record<string, unknown>[]>("/get-customer-bookings", { query: { customer_id: customerId }, accessToken });
  const items = Array.isArray(response) ? response : response.bookings ?? response.data ?? [];
  return items.filter((item) => item.service_id === HOSTING_SERVICE_ID || String(item.notes ?? "").includes("hosting_profile_id=")).map(normalizeHostingBooking);
}

export async function updateHostingBookingStatus(bookingId: string, status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED", accessToken?: string | null) {
  if (status !== "CANCELLED") throw new Error("El ciclo Housing del cliente solo permite cancelar una reserva.");
  const response = await apiRequest<{ booking?: Record<string, unknown> } | Record<string, unknown>>("/cancel-booking", { method: "POST", accessToken, body: { booking_id: bookingId, reason: "Cancelada por el cliente desde NOD Mobile" } });
  const raw = ("booking" in response ? response.booking : response) as Record<string, unknown> | undefined;
  return raw ? normalizeHostingBooking(raw) : undefined;
}

function normalizeHostingBooking(raw: Record<string, unknown>): HostingBooking {
  return {
    id: String(raw.id ?? raw.booking_id ?? raw.reservation_id ?? ""),
    status: String(raw.status ?? "pending"),
    total_amount: Number(raw.total_amount ?? raw.price ?? 0),
    currency: String(raw.currency ?? "CLP"),
    check_in: String(raw.check_in ?? raw.starts_at ?? ""),
    check_out: String(raw.check_out ?? raw.ends_at ?? ""),
    hosting_profile_id: typeof raw.hosting_profile_id === "string" ? raw.hosting_profile_id : extractNoteValue(raw.notes, "hosting_profile_id"),
    host_name: typeof raw.host_name === "string" ? raw.host_name : typeof raw.provider_name === "string" ? raw.provider_name : undefined,
    pet_names: Array.isArray(raw.pet_names) ? raw.pet_names.map(String) : undefined
  };
}

function extractNoteValue(notes: unknown, key: string) {
  if (typeof notes !== "string") return undefined;
  return notes.match(new RegExp(`${key}=([^;]+)`))?.[1];
}
