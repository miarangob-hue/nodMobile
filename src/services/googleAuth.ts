import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes
} from "@react-native-google-signin/google-signin";
import { loginWithGoogleToken } from "../api/auth";
import { env } from "../config/env";

export type GoogleAuthRole = "customer" | "provider";

let configured = false;

function configureGoogleSignin() {
  if (configured) return;
  if (!env.googleWebClientId) {
    throw new Error("Falta configurar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }

  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId || undefined,
    offlineAccess: false
  });
  configured = true;
}

export async function authenticateWithGoogle(role: GoogleAuthRole) {
  configureGoogleSignin();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) return null;
  if (!response.data.idToken) {
    throw new Error("Google no entregó un token de identidad. Revisa el Web Client ID configurado.");
  }

  return loginWithGoogleToken(response.data.idToken, role);
}

export function isGoogleSignInCancellation(error: unknown) {
  return isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED;
}
