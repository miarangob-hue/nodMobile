export type UUID = string;

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export type Provider = {
  id: UUID;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  city?: string | null;
  address?: string | null;
  comuna?: string | null;
  comunas?: string[];
  status?: string;
  onboarding_step?: string | null;
  service_categories?: string[];
  rejection_reason?: string | null;
  review_notes?: string | null;
  onboarding_rejection_reason?: string | null;
  rejected_reason?: string | null;
};

export type Customer = {
  id: UUID;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  rut?: string | null;
  address?: string | null;
  city?: string | null;
  comuna?: string | null;
};

export type Pet = {
  id: UUID;
  customer_id: UUID;
  name: string;
  species?: string | null;
  breed?: string | null;
  size?: string | null;
  age_years?: number | null;
  photo_url?: string | null;
  notes?: string | null;
};

export type DiscoveryCandidate = {
  pet_id: UUID;
  display_name: string;
  age_months?: number | null;
  species?: string | null;
  breed?: string | null;
  sex?: string | null;
  size?: string | null;
  bio?: string | null;
  photos?: string[];
  distance_km?: number | null;
  comuna?: string | null;
  temperament_tags?: string[];
  looking_for?: string[];
  compatibility_score?: number | null;
};

export type PetMatch = {
  id: UUID;
  pet_ids?: UUID[];
  pet?: {
    id: UUID;
    display_name: string;
    photo_url?: string | null;
  };
  last_message?: {
    text?: string | null;
    created_at?: string | null;
  } | null;
  unread_count?: number;
  created_at?: string | null;
};

export type CustomerProvider = {
  id: UUID;
  full_name?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  completed_services?: number | null;
  price_from?: number | null;
  currency?: string | null;
  zones?: string[];
  bio?: string | null;
  verified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  verification_status?: string | null;
  background_check_status?: string | null;
};

export type BookingStatus =
  | "pending"
  | "requested"
  | "scheduled"
  | "accepted"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled"
  | "rejected"
  | string;

export type Booking = {
  id?: UUID;
  booking_id?: UUID;
  reservation_id?: UUID;
  provider_id: UUID;
  customer_id?: UUID | null;
  customer_name?: string | null;
  customer_email?: string | null;
  pet_id?: UUID | null;
  pet_name?: string | null;
  service_id?: UUID | null;
  product_id?: UUID | null;
  service_name?: string | null;
  product_name?: string | null;
  price?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  payment_method?: "mercadopago" | "nod_credits" | string | null;
  payment_provider?: string | null;
  refund_status?: string | null;
  refund_destination?: "original_payment_method" | "nod_credits" | string | null;
  status: BookingStatus;
  provider_status?: string | null;
  provider_response_status?: string | null;
  acceptance_status?: string | null;
  provider_accepted_at?: string | null;
  accepted_at?: string | null;
  accepted_by_provider?: boolean | null;
  starts_at: string;
  ends_at: string;
  start_photo_path?: string | null;
  start_latitude?: number | null;
  start_longitude?: number | null;
  start_address?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  start_photo_url?: string | null;
  start_photo_base64?: string | null;
  completion_photo_path?: string | null;
  completion_photo_url?: string | null;
  completion_photo_base64?: string | null;
  completion_latitude?: number | null;
  completion_longitude?: number | null;
  completion_address?: string | null;
  completion_notes?: string | null;
  notes?: string | null;
  address?: string | null;
  comuna?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type CustomerBooking = Booking & {
  provider_name?: string | null;
  provider_photo_url?: string | null;
  pet_name?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
};

export type ServiceLocation = {
  booking_id: UUID;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  recorded_at: string;
};

export type ServicePhoto = {
  id: UUID;
  booking_id: UUID;
  type: "start" | "during" | "completion" | "incident" | string;
  url: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  created_at: string;
};

export type ServiceReport = {
  id: UUID;
  booking_id: UUID;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  route_url?: string | null;
  photos?: ServicePhoto[];
  pet_status?: string | null;
  notes?: string | null;
  incidents?: unknown[];
  created_at?: string | null;
};

export type ServiceIncident = {
  id: UUID;
  booking_id: UUID;
  type: string;
  severity?: "low" | "medium" | "high" | string;
  notes?: string | null;
  photo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
};

export type ServiceSummary = {
  booking_id: UUID;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  photos_count?: number | null;
  incidents_count?: number | null;
  checkpoints_count?: number | null;
  pet_status?: string | null;
};

export type ProviderBalance = {
  available: number;
  pending: number;
  currency: string;
};

export type ProviderPerformance = {
  completed: number;
  cancelled: number;
  acceptance_rate: number;
  avg_rating: number;
  earnings: number;
};

export type ProviderDashboard = {
  provider?: Provider;
  today?: Record<string, unknown>;
  bookings?: Booking[];
  earnings?: Record<string, unknown>;
  rating?: Record<string, unknown>;
  active_service?: Booking | null;
};

export type ProviderProfile = {
  id: UUID;
  full_name?: string | null;
  bio?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  comuna?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  completed_services?: number | null;
  experience_years?: number | null;
  languages?: string[];
  zones?: string[];
  services?: Array<{ id?: UUID; name?: string; slug?: string }>;
  cancellation_policy?: string | null;
  verified?: boolean;
};

export type ProviderPricing = {
  service_id: UUID;
  service_name?: string | null;
  duration_minutes: number;
  price: number;
  currency?: string | null;
  extra_pet_price?: number | null;
};

export type ProviderPayout = {
  id: UUID;
  amount: number;
  status: string;
  currency?: string | null;
  bank_account_id?: UUID | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type WalletTransaction = {
  id: UUID;
  provider_id?: UUID;
  booking_id?: UUID | null;
  type: "earning" | "payout" | "refund" | "adjustment" | string;
  amount: number;
  currency?: string | null;
  status: string;
  description?: string | null;
  created_at: string;
};

export type BankAccount = {
  id: UUID;
  provider_id?: UUID;
  bank_name: string;
  account_type?: string | null;
  account_number_masked?: string | null;
  holder_name?: string | null;
  rut?: string | null;
  is_default?: boolean;
  status?: string | null;
  created_at?: string | null;
};

export type ProviderTaxSummary = {
  provider_id: UUID;
  period: string;
  gross_earnings: number;
  platform_fees?: number | null;
  payouts_total?: number | null;
  currency?: string | null;
  document_url?: string | null;
};

export type ProviderReview = {
  id: UUID;
  booking_id?: UUID | null;
  provider_id?: UUID | null;
  customer_name?: string | null;
  pet_name?: string | null;
  rating: number;
  comment?: string | null;
  reply?: string | null;
  created_at: string;
};

export type ProviderReviewSummary = {
  rating: number;
  review_count: number;
  distribution?: Record<string, number>;
};

export type BookingChat = {
  id: UUID;
  booking_id: UUID;
  participants?: unknown[];
};

export type ChatMessage = {
  id: UUID;
  chat_id: UUID;
  sender_id: UUID;
  text?: string | null;
  attachment_url?: string | null;
  read_at?: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: UUID;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
};

export type SupportTicket = {
  id: UUID;
  status: string;
  priority?: "low" | "medium" | "high" | "urgent" | string | null;
  category?: string | null;
  subject?: string | null;
  message?: string | null;
  booking_id?: UUID | null;
  updated_at?: string | null;
  created_at: string;
};

export type EmergencyContact = {
  name: string;
  phone: string;
  type: string;
  email?: string | null;
  availability?: string | null;
  description?: string | null;
};

export type VeterinaryCoverage = {
  active: boolean;
  amount?: number | null;
  currency?: string | null;
  terms_url?: string | null;
  provider_name?: string | null;
  policy_number?: string | null;
  emergency_phone?: string | null;
  clinics?: unknown[];
};

export type ProviderDocument = {
  id: UUID;
  type: string;
  status: string;
  title?: string | null;
  url?: string | null;
  expires_at?: string | null;
  rejection_reason?: string | null;
  updated_at?: string | null;
};

export type ProviderServiceZone = {
  id?: UUID;
  comuna: string;
  radius_km?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean;
};

export type ProviderAvailabilitySlot = {
  id?: UUID;
  starts_at?: string;
  ends_at?: string;
  start?: string;
  end?: string;
  available?: boolean;
};

export type AuthUser = {
  id: UUID;
  email: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: AuthUser;
  roles: string[];
  is_new_user?: boolean;
  needs_onboarding?: boolean;
  customer?: Customer | null;
  provider: Provider | null;
};

export type RegisterProviderPayload = {
  rut: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  legal_entity_type?: "natural" | "juridica";
};

export type RegisterProviderResponse = {
  user_id: UUID;
  email: string;
  legal_entity_type: string;
  provider: Provider;
};

export type RegisterCustomerPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  rut?: string;
  address?: string;
  city?: string;
  comuna?: string;
};

export type RegisterCustomerResponse = {
  user_id: UUID;
  email: string;
  customer: Customer;
};

export type FieldType = "text" | "textarea" | "select" | "multiselect" | "file" | string;

export type OnboardingField = {
  id: UUID;
  key: string;
  label: string;
  help_text?: string | null;
  field_type: FieldType;
  required: boolean;
  sort_order: number;
  options?: Record<string, unknown>;
  validation?: Record<string, unknown>;
};

export type OnboardingStep = {
  id: UUID;
  key: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
  is_active: boolean;
  applies_to: string;
  service_categories: string[];
  fields: OnboardingField[];
};

export type OnboardingStepProgress = {
  step_id: UUID;
  key: string;
  title: string;
  sort_order: number;
  status: string;
  notes?: string | null;
  updated_at?: string | null;
  responses: Array<{
    field_id: UUID;
    field_key?: string | null;
    label?: string | null;
    value: unknown | null;
    file_document_id?: UUID | null;
  }>;
};

export type ProviderOnboardingResponse = {
  provider: Provider;
  steps: OnboardingStepProgress[];
};

export type ProviderRejection = {
  [key: string]: unknown;
  id?: UUID;
  provider_id?: UUID;
  step_key?: string | null;
  field_key?: string | null;
  title?: string | null;
  action?: string | null;
  reason?: string | null;
  message?: string | null;
  notes?: string | null;
  status?: string | null;
  rejected_items?: ProviderRejection[];
  created_at?: string | null;
};

export type ProviderRejectionsResponse = {
  [key: string]: unknown;
  provider_id?: UUID;
  status?: string | null;
  current_rejection?: ProviderRejection | null;
  rejections?: ProviderRejection[];
  rejection?: ProviderRejection | null;
  rejection_history?: ProviderRejection[];
  review_history?: ProviderRejection[];
  reasons?: ProviderRejection[];
  message?: string | null;
  reason?: string | null;
  notes?: string | null;
};

export type SubmitOnboardingPayload = {
  provider_id: UUID;
  step_key?: string;
  answers?: Record<string, unknown>;
  status?: "pending" | "in_progress" | "completed";
  submit_for_review?: boolean;
};

export type UploadFileResponse = {
  uri: string;
  document_id: UUID;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  uploaded_at?: string;
  signed_url?: string | null;
};
