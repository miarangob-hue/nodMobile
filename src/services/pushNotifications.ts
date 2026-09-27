import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true })
});

export async function registerPushNotifications({ userId, role, accessToken }: { userId: string; role: "customer" | "provider"; accessToken?: string | null }) {
  if (!Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("nod-alerts", { name: "Alertas NOD", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250] });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiRequest("/register-push-token", {
    method: "POST",
    body: { user_id: userId, role, token, platform: Platform.OS },
    apiKeyKind: role === "customer" ? "customer" : "provider",
    warnOnError: false,
    accessToken
  });
  return token;
}
