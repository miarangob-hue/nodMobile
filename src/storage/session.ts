import * as SecureStore from "expo-secure-store";
import type { LoginResponse } from "../types/api";

const sessionKey = "nod.session";
const loginModeKey = "nod.loginMode";

export type Session = LoginResponse;

export async function saveSession(session: Session) {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function loadSession() {
  const raw = await SecureStore.getItemAsync(sessionKey);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(sessionKey);
}

export type SavedLoginMode = "customer" | "provider";

export async function saveLoginMode(mode: SavedLoginMode) {
  await SecureStore.setItemAsync(loginModeKey, mode);
}

export async function loadLoginMode(): Promise<SavedLoginMode | null> {
  const mode = await SecureStore.getItemAsync(loginModeKey);
  return mode === "customer" || mode === "provider" ? mode : null;
}
