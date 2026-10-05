import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiRequest } from "../api/client";

export type PushRole = "customer" | "provider";
export type PushNotificationData = Record<string, unknown>;

type StoredPushRegistration = {
  deviceId?: string | null;
  userId: string;
  role: PushRole;
  token: string;
  platform: "android" | "ios";
};

const pushRegistrationKey = "nod.pushRegistration";
const androidChannelId = "nod-alerts";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true })
});

export async function registerPushNotifications({ userId, role, accessToken }: { userId: string; role: PushRole; accessToken?: string | null }) {
  if (!Device.isDevice || (Platform.OS !== "android" && Platform.OS !== "ios")) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(androidChannelId, {
      name: "Alertas NOD",
      description: "Reservas, mensajes y novedades de tus servicios NOD",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#EE7C2B",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default"
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn("[NOD Push] Falta configurar expo.extra.eas.projectId en app.json.");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const previous = await loadStoredPushRegistration();

  if (previous && (previous.userId !== userId || previous.role !== role || previous.token !== token)) {
    await unregisterStoredRegistration(previous, accessToken).catch((error) => {
      console.warn("[NOD Push] No fue posible eliminar el token anterior.", error);
    });
  }

  const response = await apiRequest<PushRegistrationResponse>("/register-push-token", {
    method: "POST",
    body: { role, token, platform: Platform.OS },
    apiKeyKind: role,
    warnOnError: true,
    accessToken
  });

  await SecureStore.setItemAsync(pushRegistrationKey, JSON.stringify({
    deviceId: getPushDeviceId(response),
    userId,
    role,
    token,
    platform: Platform.OS
  } satisfies StoredPushRegistration));

  return token;
}

export async function unregisterPushNotifications(accessToken?: string | null) {
  const registration = await loadStoredPushRegistration();
  if (!registration) return;

  await unregisterStoredRegistration(registration, accessToken);
  await SecureStore.deleteItemAsync(pushRegistrationKey);
  await Notifications.setBadgeCountAsync(0).catch(() => false);
}

export function subscribeToPushNotifications({
  onNotification,
  onResponse
}: {
  onNotification?: (data: PushNotificationData) => void;
  onResponse: (data: PushNotificationData) => void;
}) {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    onNotification?.(notification.request.content.data as PushNotificationData);
  });
  const opened = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse(response.notification.request.content.data as PushNotificationData);
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      onResponse(response.notification.request.content.data as PushNotificationData);
      void Notifications.clearLastNotificationResponseAsync();
    }
  });

  return () => {
    received.remove();
    opened.remove();
  };
}

function getExpoProjectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId ?? null;
}

async function loadStoredPushRegistration() {
  const raw = await SecureStore.getItemAsync(pushRegistrationKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredPushRegistration;
  } catch {
    await SecureStore.deleteItemAsync(pushRegistrationKey);
    return null;
  }
}

async function unregisterStoredRegistration(registration: StoredPushRegistration, accessToken?: string | null) {
  await apiRequest("/unregister-push-token", {
    method: "POST",
    body: { token: registration.token },
    apiKeyKind: registration.role,
    warnOnError: true,
    accessToken
  });
}

type PushRegistrationResponse = {
  id?: string;
  device_id?: string;
  push_device_id?: string;
  device?: { id?: string };
};

function getPushDeviceId(response: PushRegistrationResponse) {
  return response.device_id ?? response.push_device_id ?? response.device?.id ?? response.id ?? null;
}
