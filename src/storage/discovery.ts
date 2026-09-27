import * as FileSystem from "expo-file-system/legacy";
import type { DiscoveryCandidate, PetMatch } from "../types/api";

export type DiscoveryDecision = "like" | "pass" | "super_like";

export type DiscoveryPreferences = {
  maxDistance: number;
  size: string;
};

export type DiscoveryReport = {
  candidate: DiscoveryCandidate;
  reason: string;
  createdAt: string;
};

export type DiscoveryMessage = {
  id: string;
  matchId: string;
  sender: "me" | "them";
  text: string;
  createdAt: string;
};

type StoredSwipe = {
  candidate: DiscoveryCandidate;
  decision: DiscoveryDecision;
  createdAt: string;
};

export type LocalDiscoveryState = {
  blockedPetIds: string[];
  matches: PetMatch[];
  messages: DiscoveryMessage[];
  preferences: DiscoveryPreferences;
  reports: DiscoveryReport[];
  swipes: StoredSwipe[];
};

const defaultState: LocalDiscoveryState = {
  blockedPetIds: [],
  matches: [],
  messages: [],
  preferences: { maxDistance: 10, size: "all" },
  reports: [],
  swipes: []
};

export async function loadLocalDiscovery(customerId: string, petId: string) {
  try {
    const raw = await FileSystem.readAsStringAsync(getPath(customerId, petId));
    const stored = JSON.parse(raw) as Partial<LocalDiscoveryState>;
    return {
      ...defaultState,
      ...stored,
      preferences: { ...defaultState.preferences, ...stored.preferences }
    };
  } catch {
    return { ...defaultState, preferences: { ...defaultState.preferences } };
  }
}

export async function saveLocalDiscovery(customerId: string, petId: string, state: LocalDiscoveryState) {
  await FileSystem.writeAsStringAsync(getPath(customerId, petId), JSON.stringify(state));
}

function getPath(customerId: string, petId: string) {
  const safeKey = `${customerId}-${petId}`.replace(/[^a-zA-Z0-9-]/g, "");
  return `${FileSystem.documentDirectory ?? ""}nod-discovery-${safeKey}.json`;
}
