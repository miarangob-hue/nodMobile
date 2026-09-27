const RUT_WITH_DASH = /^\d{1,8}-[\dK]$/;

export function formatChileanRut(value: string) {
  const clean = value.toUpperCase().replace(/[^0-9K]/g, "").slice(0, 9);

  if (clean.length <= 1) {
    return clean;
  }

  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${verifier}`;
}

export function normalizeChileanRut(value: string) {
  return value.toUpperCase().replace(/\./g, "").replace(/\s/g, "");
}

export function isValidChileanRut(value: string) {
  const normalized = normalizeChileanRut(value);

  if (!RUT_WITH_DASH.test(normalized)) {
    return false;
  }

  const [body, verifier] = normalized.split("-");
  return getChileanRutVerifier(body) === verifier;
}

export function getChileanRutVerifier(body: string) {
  if (!/^\d{1,8}$/.test(body)) {
    return "";
  }

  let sum = 0;
  let multiplier = 2;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const result = 11 - (sum % 11);
  if (result === 11) return "0";
  if (result === 10) return "K";
  return String(result);
}
