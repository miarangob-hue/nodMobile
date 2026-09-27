import { ApiError } from "../api/client";

export function getFriendlyError(error: unknown, fallback = "Ocurrió un problema. Inténtalo nuevamente.") {
  if (error instanceof ApiError) {
    const apiMessage = getApiMessage(error);
    const normalizedMessage = apiMessage?.toLocaleLowerCase("es");

    if (normalizedMessage && /email|correo/.test(normalizedMessage) && /already|exists|registrad|uso|duplic/.test(normalizedMessage)) {
      return "Ya existe una cuenta con ese email. Prueba iniciar sesión.";
    }
    if (normalizedMessage && /rut/.test(normalizedMessage) && /already|exists|registrad|uso|duplic|unique/.test(normalizedMessage)) {
      return "Ese RUT ya está registrado. Prueba iniciar sesión o usa otro RUT.";
    }
    if (error.status === 400) return getApiMessage(error) ?? "Revisa los datos ingresados.";
    if (error.status === 401) return "Correo o contraseña incorrectos.";
    if (error.status === 403) return "No tienes permiso para realizar esta acción.";
    if (error.status === 404) return "No encontramos la información solicitada.";
    if (error.status === 409) return getApiMessage(error) ?? "Estos datos ya están registrados.";
    if (error.status >= 500) {
      return apiMessage && !/internal server error|unexpected error|service unavailable/i.test(apiMessage)
        ? apiMessage
        : "El servidor no pudo completar la solicitud. Revisa los datos ingresados e inténtalo nuevamente.";
    }
    return apiMessage ?? fallback;
  }

  if (error instanceof Error) {
    const message = error.message;
    if (/unknownhost|network request failed|failed to fetch|unable to resolve host|no address associated/i.test(message)) {
      return "No pudimos conectarnos. Revisa tu Internet e inténtalo nuevamente.";
    }
    if (/timeout|timed out/i.test(message)) {
      return "La conexión está tardando demasiado. Inténtalo nuevamente.";
    }
    return message || fallback;
  }

  return fallback;
}

function getApiMessage(error: ApiError) {
  const body = error.body as { error?: string; message?: string } | null;
  const message = body?.message ?? body?.error;
  return message && !/unknownhost|java\.|exception/i.test(message) ? message : null;
}
