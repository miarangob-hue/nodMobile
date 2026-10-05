export function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeBookingStatus(value: string | null | undefined) {
  return normalizeText(value).replace(/[\s-]+/g, "_");
}
