import { apiRequest } from "./client";
import type {
  Booking,
  BookingStatus,
  BookingChat,
  BankAccount,
  ChatMessage,
  EmergencyContact,
  NotificationItem,
  ProviderAvailabilitySlot,
  ProviderBalance,
  ProviderDashboard,
  ProviderDocument,
  ProviderPerformance,
  ProviderOnboardingResponse,
  ProviderPricing,
  ProviderProfile,
  ProviderPayout,
  ProviderReview,
  ProviderReviewSummary,
  ProviderServiceZone,
  ProviderTaxSummary,
  ServiceIncident,
  ServiceLocation,
  ServicePhoto,
  ServiceReport,
  ServiceSummary,
  SupportTicket,
  VeterinaryCoverage,
  WalletTransaction
} from "../types/api";

type ProviderBookingsResponse = {
  bookings?: Booking[];
};

type ProviderAvailabilityResponse = {
  availability?: ProviderAvailabilitySlot[];
  slots?: ProviderAvailabilitySlot[];
  blocks?: ProviderAvailabilitySlot[];
};

type ProviderDashboardResponse = {
  dashboard?: ProviderDashboard;
};

type ProviderBalanceResponse = {
  balance?: ProviderBalance;
};

type ProviderPerformanceResponse = {
  performance?: ProviderPerformance;
};

type ServiceRouteResponse = {
  route?: ServiceLocation[];
  locations?: ServiceLocation[];
  distance_meters?: number;
  duration_seconds?: number;
};

type ServicePhotosResponse = {
  photos?: ServicePhoto[];
};

type ServiceIncidentsResponse = {
  incidents?: ServiceIncident[];
};

type ServicePhotoResponse = {
  photo?: ServicePhoto;
};

type ServiceReportResponse = {
  report?: ServiceReport;
};

type ServiceSummaryResponse = {
  summary?: ServiceSummary;
};

type ProviderProfileResponse = {
  provider?: ProviderProfile;
};

type ProviderPricingResponse = {
  pricing?: ProviderPricing[];
};

type ProviderPayoutsResponse = {
  payouts?: ProviderPayout[];
  total?: number;
};

type ProviderPayoutResponse = {
  payout?: ProviderPayout;
};

type WalletTransactionsResponse = {
  transactions?: WalletTransaction[];
  movements?: WalletTransaction[];
  total?: number;
};

type BankAccountsResponse = {
  accounts?: BankAccount[];
  bank_accounts?: BankAccount[];
};

type BankAccountResponse = {
  account?: BankAccount;
  bank_account?: BankAccount;
};

type ProviderTaxSummaryResponse = {
  summary?: ProviderTaxSummary;
};

type ProviderDocumentsResponse = {
  documents?: ProviderDocument[];
};

type ProviderReviewsResponse = {
  reviews?: ProviderReview[];
  total?: number;
  summary?: ProviderReviewSummary;
};

type ProviderReviewSummaryResponse = {
  summary?: ProviderReviewSummary;
};

type BookingChatResponse = {
  chat?: BookingChat;
};

type ChatMessagesResponse = {
  messages?: ChatMessage[];
  next_cursor?: string | null;
};

type ChatMessageResponse = {
  message?: ChatMessage;
};

type NotificationsResponse = {
  notifications?: NotificationItem[];
  total?: number;
};

type SupportTicketsResponse = {
  tickets?: SupportTicket[];
  total?: number;
};

type SupportTicketResponse = {
  ticket?: SupportTicket;
};

type EmergencyContactsResponse = {
  contacts?: EmergencyContact[];
};

type VeterinaryCoverageResponse = {
  coverage?: VeterinaryCoverage;
};

type BookingMutationResponse = Booking | {
  booking?: Booking;
  data?: Booking;
  reservation?: Booking;
};

export async function getProviderBookings({
  providerId,
  status,
  accessToken
}: {
  providerId: string;
  status?: BookingStatus;
  accessToken?: string | null;
}) {
  const response = await apiRequest<Booking[] | ProviderBookingsResponse>("/get-provider-bookings", {
    query: { status },
    accessToken
  });

  // Accept/reject live in the independent provider backend. Only bookings
  // returned by that backend are actionable; IDs from nod-api are not valid
  // inputs for /accept-booking and would always produce "Booking not found".
  return Array.isArray(response) ? response : response.bookings ?? [];
}

export async function getProviderDashboard({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}): Promise<ProviderDashboard | null> {
  const response = await apiRequest<ProviderDashboard | ProviderDashboardResponse>("/get-provider-dashboard", {
    accessToken
  });

  return hasOwn(response, "dashboard")
    ? (response.dashboard as ProviderDashboard | undefined) ?? null
    : response as ProviderDashboard;
}

export async function getProviderBalance({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}): Promise<ProviderBalance | null> {
  const response = await apiRequest<ProviderBalance | ProviderBalanceResponse>("/get-provider-balance", {
    accessToken
  });

  return hasOwn(response, "balance")
    ? (response.balance as ProviderBalance | undefined) ?? null
    : response as ProviderBalance;
}

export async function getProviderPerformance({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}): Promise<ProviderPerformance | null> {
  const response = await apiRequest<ProviderPerformance | ProviderPerformanceResponse>("/get-provider-performance", {
    accessToken
  });

  return hasOwn(response, "performance")
    ? (response.performance as ProviderPerformance | undefined) ?? null
    : response as ProviderPerformance;
}

export async function getProviderProfile({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderDashboard | ProviderDashboardResponse>("/get-provider-dashboard", {
    accessToken
  });

  const dashboard = hasOwn(response, "dashboard")
    ? response.dashboard as ProviderDashboard | undefined
    : response as ProviderDashboard;
  return dashboard?.provider as ProviderProfile | undefined;
}

export async function updateProviderProfile({
  providerId,
  bio,
  phone,
  address,
  city,
  comuna,
  experienceYears,
  languages,
  cancellationPolicy,
  accessToken
}: {
  providerId: string;
  bio?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  comuna?: string | null;
  experienceYears?: number | null;
  languages?: string[];
  cancellationPolicy?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderProfile | ProviderProfileResponse>("/update-provider-profile", {
    method: "POST",
    body: {
      bio,
      phone,
      address,
      city,
      comuna,
      experience_years: experienceYears,
      languages,
      cancellation_policy: cancellationPolicy
    },
    accessToken
  });

  return hasOwn(response, "provider") ? response.provider as ProviderProfile | undefined : response as ProviderProfile;
}

export async function getProviderPricing({
  providerId,
  serviceId,
  accessToken
}: {
  providerId: string;
  serviceId?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderPricing[] | ProviderPricingResponse>("/update-provider-pricing", {
    query: { service_id: serviceId },
    accessToken
  });

  return Array.isArray(response) ? response : response.pricing ?? [];
}

export async function getProviderPayouts({
  providerId,
  limit = 20,
  offset = 0,
  accessToken
}: {
  providerId: string;
  limit?: number;
  offset?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderPayout[] | ProviderPayoutsResponse>("/get-provider-payouts", {
    query: { limit, offset },
    accessToken
  });

  return Array.isArray(response) ? { payouts: response, total: response.length } : {
    payouts: response.payouts ?? [],
    total: response.total ?? response.payouts?.length ?? 0
  };
}

export async function getWalletTransactions({
  providerId,
  limit = 30,
  offset = 0,
  accessToken
}: {
  providerId: string;
  limit?: number;
  offset?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<WalletTransaction[] | WalletTransactionsResponse>("/get-wallet-transactions", {
    query: { limit, offset },
    accessToken
  });

  return Array.isArray(response) ? {
    transactions: response,
    total: response.length
  } : {
    transactions: response.transactions ?? response.movements ?? [],
    total: response.total ?? response.transactions?.length ?? response.movements?.length ?? 0
  };
}

export async function getProviderBankAccounts({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BankAccount[] | BankAccountsResponse>("/get-provider-bank-accounts", {
    accessToken
  });

  return Array.isArray(response) ? response : response.accounts ?? response.bank_accounts ?? [];
}

export async function createProviderBankAccount({
  providerId,
  bankName,
  accountType,
  accountNumber,
  holderName,
  rut,
  isDefault,
  accessToken
}: {
  providerId: string;
  bankName: string;
  accountType?: string | null;
  accountNumber: string;
  holderName?: string | null;
  rut?: string | null;
  isDefault?: boolean;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BankAccount | BankAccountResponse>("/create-provider-bank-account", {
    method: "POST",
    body: {
      bank_name: bankName,
      account_type: accountType,
      account_number: accountNumber,
      holder_name: holderName,
      rut,
      is_default: isDefault
    },
    accessToken
  });

  return hasOwn(response, "account")
    ? response.account as BankAccount | undefined
    : hasOwn(response, "bank_account")
      ? response.bank_account as BankAccount | undefined
      : response as BankAccount;
}

export async function getProviderTaxSummary({
  providerId,
  period,
  accessToken
}: {
  providerId: string;
  period?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderTaxSummary | ProviderTaxSummaryResponse>("/get-provider-tax-summary", {
    query: { period },
    accessToken
  });

  return hasOwn(response, "summary")
    ? response.summary as ProviderTaxSummary | undefined
    : response as ProviderTaxSummary;
}

export async function getProviderDocuments({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderDocument[] | ProviderDocumentsResponse>("/get-provider-documents", {
    accessToken
  });

  return Array.isArray(response) ? response : response.documents ?? [];
}

export async function getProviderServiceZones({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}) {
  return readOnboardingZones(providerId, accessToken);
}

export async function updateProviderServiceZones({
  providerId,
  zones,
  accessToken
}: {
  providerId: string;
  zones: ProviderServiceZone[];
  accessToken?: string | null;
}) {
  const activeZones = zones.filter((zone) => zone.active !== false).map((zone) => zone.comuna);
  await apiRequest("/submit-provider-onboarding", {
    method: "POST",
    body: {
      step_key: "cat_dog_walker",
      answers: { dog_walker_zones: activeZones },
      status: "pending",
      submit_for_review: false
    },
    accessToken
  });
  const persistedZones = await readOnboardingZones(providerId, accessToken);
  const expected = [...activeZones].sort();
  const persisted = persistedZones.map((zone) => zone.comuna).sort();
  if (JSON.stringify(expected) !== JSON.stringify(persisted)) {
    throw new Error("La API respondió, pero no confirmó las zonas seleccionadas.");
  }
  return persistedZones;
}

async function readOnboardingZones(providerId: string, accessToken?: string | null) {
  const onboarding = await apiRequest<ProviderOnboardingResponse>("/get-provider-onboarding", {
    accessToken
  });
  const response = onboarding.steps.flatMap((step) => step.responses).find((item) => item.field_key === "dog_walker_zones");
  return Array.isArray(response?.value) ? response.value.map((comuna) => ({ comuna: String(comuna), active: true })) : [];
}

export async function getProviderReviews({
  providerId,
  limit = 20,
  offset = 0,
  accessToken
}: {
  providerId: string;
  limit?: number;
  offset?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderReview[] | ProviderReviewsResponse>("/get-provider-reviews", {
    query: { limit, offset },
    accessToken
  });

  return Array.isArray(response) ? { reviews: response, total: response.length, summary: undefined } : {
    reviews: response.reviews ?? [],
    total: response.total ?? response.reviews?.length ?? 0,
    summary: response.summary
  };
}

export async function getProviderReviewSummary({
  providerId,
  accessToken
}: {
  providerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderReviewSummary | ProviderReviewSummaryResponse>(
    "/get-provider-review-summary",
    {
      accessToken
    }
  );

  return hasOwn(response, "summary")
    ? response.summary as ProviderReviewSummary | undefined
    : response as ProviderReviewSummary;
}

export async function getOrCreateBookingChat({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingChat | BookingChatResponse>("/get-or-create-booking-chat", {
    method: "POST",
    body: { booking_id: bookingId },
    accessToken
  });

  return hasOwn(response, "chat") ? response.chat as BookingChat | undefined : response as BookingChat;
}

export async function getChatMessages({
  chatId: bookingId,
  limit = 30,
  before,
  accessToken
}: {
  chatId: string;
  limit?: number;
  before?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ChatMessage[] | ChatMessagesResponse>("/get-chat-messages", {
    query: { booking_id: bookingId, limit, before },
    accessToken
  });

  return Array.isArray(response) ? { messages: response, next_cursor: null } : {
    messages: response.messages ?? [],
    next_cursor: response.next_cursor ?? null
  };
}

export async function sendChatMessage({
  chatId: bookingId,
  senderId,
  text,
  accessToken
}: {
  chatId: string;
  senderId: string;
  text: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ChatMessage | ChatMessageResponse>("/send-chat-message", {
    method: "POST",
    body: { booking_id: bookingId, text },
    accessToken
  });

  return hasOwn(response, "message") ? response.message as ChatMessage | undefined : response as ChatMessage;
}

export async function markChatRead({
  chatId: bookingId,
  userId,
  messageId,
  accessToken
}: {
  chatId: string;
  userId: string;
  messageId?: string | null;
  accessToken?: string | null;
}) {
  return apiRequest<{ ok: boolean; read_at?: string }>("/mark-chat-read", {
    method: "POST",
    body: { booking_id: bookingId, message_id: messageId },
    accessToken
  });
}

export async function acceptBooking({
  bookingId,
  providerId,
  accessToken
}: {
  bookingId: string;
  providerId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse>("/accept-booking", {
    method: "POST",
    body: {
      booking_id: bookingId,
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function rejectBooking({
  bookingId,
  providerId,
  reason,
  accessToken
}: {
  bookingId: string;
  providerId: string;
  reason?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse>("/reject-booking", {
    method: "POST",
    body: {
      booking_id: bookingId,
      reason
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function startService({
  bookingId,
  startPhotoBase64,
  startPhotoMime,
  startLatitude,
  startLongitude,
  startAddress,
  notes,
  accessToken
}: {
  bookingId: string;
  startPhotoBase64: string;
  startPhotoMime: string;
  startLatitude: number;
  startLongitude: number;
  startAddress?: string | null;
  notes?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse>("/start-service", {
    method: "POST",
    body: {
      booking_id: bookingId,
      start_photo_base64: startPhotoBase64,
      start_photo_mime: startPhotoMime,
      start_latitude: startLatitude,
      start_longitude: startLongitude,
      start_address: startAddress,
      notes
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function completeService({
  bookingId,
  completionPhotoBase64,
  completionPhotoMime,
  completionLatitude,
  completionLongitude,
  notes,
  accessToken
}: {
  bookingId: string;
  completionPhotoBase64: string;
  completionPhotoMime: string;
  completionLatitude?: number | null;
  completionLongitude?: number | null;
  notes?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse & { completion_photo_url?: string | null }>(
    "/complete-service",
    {
      method: "POST",
      body: {
        booking_id: bookingId,
        completion_photo_base64: completionPhotoBase64,
        completion_photo_mime: completionPhotoMime,
        completion_latitude: completionLatitude,
        completion_longitude: completionLongitude,
        notes
      },
      accessToken
    }
  );

  return getBookingFromResponse(response);
}

export async function pauseService({
  bookingId,
  reason,
  accessToken
}: {
  bookingId: string;
  reason?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse>("/pause-service", {
    method: "POST",
    body: {
      booking_id: bookingId,
      reason
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function resumeService({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse>("/resume-service", {
    method: "POST",
    body: {
      booking_id: bookingId
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function cancelBooking({
  bookingId,
  reason,
  accessToken
}: {
  bookingId: string;
  reason?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<BookingMutationResponse>("/cancel-booking", {
    method: "POST",
    body: {
      booking_id: bookingId,
      reason
    },
    accessToken
  });

  return getBookingFromResponse(response);
}

export async function getProviderAvailability({
  providerId,
  from,
  to,
  accessToken
}: {
  providerId: string;
  from?: string;
  to?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderAvailabilitySlot[] | ProviderAvailabilityResponse>(
    "/get-provider-availability",
    {
      query: {
        from,
        to
      },
      accessToken
    }
  );

  if (Array.isArray(response)) {
    return response;
  }

  return response.availability ?? response.slots ?? response.blocks ?? [];
}

export async function getNotifications({
  userId,
  limit = 20,
  offset = 0,
  accessToken
}: {
  userId: string;
  limit?: number;
  offset?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<NotificationItem[] | NotificationsResponse>("/get-notifications", {
    query: { limit, offset },
    accessToken
  });

  return Array.isArray(response) ? { notifications: response, total: response.length } : {
    notifications: response.notifications ?? [],
    total: response.total ?? response.notifications?.length ?? 0
  };
}

export async function markNotificationRead({
  notificationId,
  notificationIds,
  accessToken
}: {
  notificationId?: string | null;
  notificationIds?: string[];
  accessToken?: string | null;
}) {
  return apiRequest<{ ok: boolean; read_at?: string }>("/mark-notification-read", {
    method: "POST",
    body: {
      notification_id: notificationId,
      notification_ids: notificationIds
    },
    accessToken
  });
}

export async function listSupportTickets({
  userId,
  status,
  limit = 20,
  offset = 0,
  accessToken
}: {
  userId: string;
  status?: string | null;
  limit?: number;
  offset?: number;
  accessToken?: string | null;
}) {
  const response = await apiRequest<SupportTicket[] | SupportTicketsResponse>("/list-support-tickets", {
    query: { status, limit, offset },
    accessToken
  });

  return Array.isArray(response) ? { tickets: response, total: response.length } : {
    tickets: response.tickets ?? [],
    total: response.total ?? response.tickets?.length ?? 0
  };
}

export async function createSupportTicket({
  userId,
  bookingId,
  category,
  subject,
  message,
  priority,
  attachments,
  accessToken
}: {
  userId: string;
  bookingId?: string | null;
  category: string;
  subject: string;
  message: string;
  priority?: string | null;
  attachments?: unknown[];
  accessToken?: string | null;
}) {
  const response = await apiRequest<SupportTicket | SupportTicketResponse>("/create-support-ticket", {
    method: "POST",
    body: {
      booking_id: bookingId,
      category,
      subject,
      message,
      priority,
      attachments
    },
    accessToken
  });

  return hasOwn(response, "ticket") ? response.ticket as SupportTicket | undefined : response as SupportTicket;
}

export async function getEmergencyContacts({
  bookingId,
  accessToken
}: {
  bookingId?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<EmergencyContact[] | EmergencyContactsResponse>("/get-emergency-contacts", {
    query: { booking_id: bookingId },
    accessToken
  });

  return Array.isArray(response) ? response : response.contacts ?? [];
}

export async function getVeterinaryCoverage({
  bookingId,
  providerId,
  accessToken
}: {
  bookingId?: string | null;
  providerId?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<VeterinaryCoverage | VeterinaryCoverageResponse>("/get-veterinary-coverage", {
    query: { booking_id: bookingId },
    accessToken
  });

  return hasOwn(response, "coverage")
    ? response.coverage as VeterinaryCoverage | undefined
    : response as VeterinaryCoverage;
}

export async function requestProviderPayout({
  providerId,
  amount,
  currency,
  accessToken
}: {
  providerId: string;
  amount?: number | null;
  currency?: string | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ProviderPayout | ProviderPayoutResponse>("/request-provider-payout", {
    method: "POST",
    body: {
      amount,
      currency
    },
    accessToken
  });

  return hasOwn(response, "payout") ? response.payout as ProviderPayout | undefined : response as ProviderPayout;
}

export async function createEmergencyAlert({
  bookingId,
  userId,
  type,
  latitude,
  longitude,
  message,
  accessToken
}: {
  bookingId: string;
  userId: string;
  type: string;
  latitude?: number | null;
  longitude?: number | null;
  message?: string;
  accessToken?: string | null;
}) {
  return apiRequest<{ alert?: { id: string; status: string; created_at: string } }>("/create-emergency-alert", {
    method: "POST",
    body: {
      booking_id: bookingId,
      type,
      latitude,
      longitude,
      message
    },
    accessToken
  });
}

export async function updateServiceLocation({
  bookingId,
  latitude,
  longitude,
  accuracy,
  heading,
  speed,
  recordedAt,
  accessToken
}: {
  bookingId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  recordedAt?: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<{ ok?: boolean; location?: ServiceLocation }>("/update-service-location", {
    method: "POST",
    body: {
      booking_id: bookingId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      recorded_at: recordedAt
    },
    accessToken
  });

  return response.location;
}

export async function getServiceRoute({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServiceLocation[] | ServiceRouteResponse>("/get-service-route", {
    query: { booking_id: bookingId },
    accessToken
  });

  if (Array.isArray(response)) {
    return { route: response, distance_meters: undefined, duration_seconds: undefined };
  }

  return {
    route: response.route ?? response.locations ?? [],
    distance_meters: response.distance_meters,
    duration_seconds: response.duration_seconds
  };
}

export async function getServicePhotos({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServicePhoto[] | ServicePhotosResponse>("/get-service-photos", {
    query: { booking_id: bookingId },
    accessToken
  });

  return Array.isArray(response) ? response : response.photos ?? [];
}

export async function getServiceIncidents({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServiceIncident[] | ServiceIncidentsResponse>("/get-service-incidents", {
    query: { booking_id: bookingId },
    accessToken
  });

  return Array.isArray(response) ? response : response.incidents ?? [];
}

export async function createServiceIncident({
  bookingId,
  type,
  severity,
  notes,
  photoBase64,
  photoMime,
  latitude,
  longitude,
  accessToken
}: {
  bookingId: string;
  type: string;
  severity?: string;
  notes?: string;
  photoBase64?: string | null;
  photoMime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accessToken?: string | null;
}): Promise<ServiceIncident | undefined> {
  const response = await apiRequest<ServiceIncident | { incident?: ServiceIncident }>("/create-service-incident", {
    method: "POST",
    body: {
      booking_id: bookingId,
      type,
      severity,
      notes,
      photo_base64: photoBase64,
      photo_mime: photoMime,
      latitude,
      longitude
    },
    accessToken
  });

  return hasOwn(response, "incident") ? response.incident as ServiceIncident | undefined : response as ServiceIncident;
}

export async function uploadServicePhoto({
  bookingId,
  type,
  photoBase64,
  photoMime,
  latitude,
  longitude,
  notes,
  accessToken
}: {
  bookingId: string;
  type: "start" | "during" | "completion" | "incident";
  photoBase64: string;
  photoMime: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  accessToken?: string | null;
}): Promise<ServicePhoto | undefined> {
  const response = await apiRequest<ServicePhoto | ServicePhotoResponse>("/upload-service-photo", {
    method: "POST",
    body: {
      booking_id: bookingId,
      type,
      photo_base64: photoBase64,
      photo_mime: photoMime,
      latitude,
      longitude,
      notes
    },
    accessToken
  });

  return hasOwn(response, "photo") ? (response.photo as ServicePhoto | undefined) : response as ServicePhoto;
}

export async function getServiceSummary({
  bookingId,
  accessToken
}: {
  bookingId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServiceSummary | ServiceSummaryResponse>("/get-service-summary", {
    query: { booking_id: bookingId },
    accessToken
  });

  return hasOwn(response, "summary") ? response.summary as ServiceSummary | undefined : response as ServiceSummary;
}

export async function createServiceReport({
  bookingId,
  petStatus,
  notes,
  distanceMeters,
  durationSeconds,
  accessToken
}: {
  bookingId: string;
  petStatus: string;
  notes?: string;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServiceReport | ServiceReportResponse>("/create-service-report", {
    method: "POST",
    body: {
      booking_id: bookingId,
      pet_status: petStatus,
      notes,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds
    },
    accessToken
  });

  return "report" in response ? response.report : response;
}

export async function submitServiceReport({
  reportId,
  accessToken
}: {
  reportId: string;
  accessToken?: string | null;
}) {
  const response = await apiRequest<ServiceReport | ServiceReportResponse>("/submit-service-report", {
    method: "POST",
    body: { report_id: reportId },
    accessToken
  });

  return "report" in response ? response.report : response;
}

function getBookingFromResponse(response: BookingMutationResponse | null | undefined) {
  if (!response) {
    return undefined;
  }

  if ("booking" in response || "data" in response || "reservation" in response) {
    return response.booking ?? response.data ?? response.reservation;
  }

  if ("status" in response && "provider_id" in response) {
    return response;
  }

  return undefined;
}

function hasOwn<T extends object, K extends PropertyKey>(value: T, key: K): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}
