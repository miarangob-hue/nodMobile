import { normalizeBookingStatus } from "./normalization";

const upcomingStatuses = new Set(["pending", "requested", "scheduled", "accepted"]);
const activeStatuses = new Set(["in_progress", "started", "paused"]);
const terminalStatuses = new Set(["completed", "cancelled", "rejected"]);

export function isUpcomingStatus(status: string | null | undefined) {
  return upcomingStatuses.has(normalizeBookingStatus(status));
}

export function isActiveStatus(status: string | null | undefined) {
  return activeStatuses.has(normalizeBookingStatus(status));
}

export function isTerminalStatus(status: string | null | undefined) {
  return terminalStatuses.has(normalizeBookingStatus(status));
}

export function canProviderAcceptStatus(status: string | null | undefined) {
  const normalized = normalizeBookingStatus(status);
  return [
    "pending",
    "requested",
    "request",
    "created",
    "new",
    "pending_acceptance",
    "pending_confirmation",
    "pending_provider",
    "provider_pending",
    "awaiting_acceptance",
    "awaiting_provider",
    "booking_requested",
    "scheduled"
  ].includes(normalized) || (normalized.includes("pending") && !normalized.includes("payment"))
    || normalized.includes("requested")
    || normalized.includes("awaiting");
}
