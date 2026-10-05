import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { refreshLogin } from "./src/api/auth";
import { getProviderOnboarding } from "./src/api/onboarding";
import { CustomerAppScreen } from "./src/screens/CustomerAppScreen";
import { CompleteCustomerProfileScreen } from "./src/screens/CompleteCustomerProfileScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProviderDashboardScreen } from "./src/screens/ProviderDashboardScreen";
import { RegisterCustomerScreen } from "./src/screens/RegisterCustomerScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { RoleSelectionScreen } from "./src/screens/RoleSelectionScreen";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { clearSession, loadSession, saveSession, type Session } from "./src/storage/session";
import type { Customer, Provider } from "./src/types/api";
import { BrandLogo } from "./src/components/BrandLogo";
import {
  subscribeToPushNotifications,
  unregisterPushNotifications,
  type PushNotificationData
} from "./src/services/pushNotifications";

type Route = "loading" | "welcome" | "roleSelection" | "login" | "register" | "registerCustomer" | "completeCustomerProfile" | "customer" | "onboarding" | "verification" | "approved";

export default function App() {
  const [route, setRoute] = useState<Route>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isRefreshingProvider, setIsRefreshingProvider] = useState(false);
  const [pushIntent, setPushIntent] = useState<{ id: number; data: PushNotificationData } | null>(null);

  useEffect(() => {
    async function hydrate() {
      const storedSession = await loadSession();

      if (!storedSession) {
        setRoute("welcome");
        return;
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const activeSession =
        storedSession.expires_at <= nowInSeconds
          ? await refreshStoredSession(storedSession)
          : storedSession;

      setSession(activeSession);
      setProvider(getProviderFromSession(activeSession));
      setCustomer(getCustomerFromSession(activeSession));
      setRoute(activeSession ? getSessionRoute(activeSession) : "welcome");
    }

    void hydrate();
  }, []);

  useEffect(() => subscribeToPushNotifications({
    onResponse: (data) => setPushIntent({ id: Date.now(), data })
  }), []);

  useEffect(() => {
    if (!pushIntent || !session) return;
    setRoute(getSessionRoute(session));
  }, [pushIntent, session]);

  function handleLogin(nextSession: Session) {
    setSession(nextSession);
    setProvider(getProviderFromSession(nextSession));
    setCustomer(getCustomerFromSession(nextSession));
    setNotice(null);
    setRoute(getSessionRoute(nextSession));

    if (!getProviderFromSession(nextSession) && !getCustomerFromSession(nextSession)) {
      setNotice("La sesion no tiene un perfil asociado.");
    }
  }

  function handleRegistered(nextSession: Session) {
    const nextProvider = getProviderFromSession(nextSession);
    setSession(nextSession);
    setProvider(nextProvider);
    setCustomer(getCustomerFromSession(nextSession));

    if (nextProvider) {
      setNotice(`Cuenta creada para ${nextSession.user.email}. Completa el onboarding.`);
      setRoute("onboarding");
    } else {
      setNotice("Cuenta creada, pero la sesion no retorno un proveedor asociado.");
      setRoute("login");
    }
  }

  async function handleLogout() {
    try {
      await unregisterPushNotifications(session?.access_token);
    } catch (error) {
      console.warn("[NOD Push] No fue posible desregistrar el dispositivo al cerrar sesion.", error);
    } finally {
      await clearSession();
      setSession(null);
      setProvider(null);
      setCustomer(null);
      setPushIntent(null);
      setNotice(null);
      setRoute("login");
    }
  }

  async function handleCustomerProfileCompleted(nextCustomer: Customer) {
    setCustomer(nextCustomer);
    if (session) {
      const nextSession = { ...session, customer: nextCustomer };
      setSession(nextSession);
      await saveSession(nextSession);
    }
    setRoute("customer");
  }

  async function handleSubmittedForReview() {
    if (session?.provider) {
      const nextProvider = { ...session.provider, status: "pending_review", onboarding_step: "pending_review" };
      const nextSession = { ...session, provider: nextProvider };

      setSession(nextSession);
      setProvider(nextProvider);
      await saveSession(nextSession);
    }

    setNotice(null);
    setRoute("verification");
  }

  const handleRefreshProviderStatus = useCallback(async () => {
    const providerId = provider?.id ?? session?.provider?.id;

    if (!providerId) {
      return;
    }

    setIsRefreshingProvider(true);

    try {
      const response = await getProviderOnboarding(providerId, session?.access_token);
      const nextProvider = response.provider;
      setProvider(nextProvider);

      if (session) {
        const nextSession = { ...session, provider: nextProvider };
        setSession(nextSession);
        await saveSession(nextSession);
      }

      setRoute(getProviderRoute(nextProvider));
    } finally {
      setIsRefreshingProvider(false);
    }
  }, [provider?.id, session]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {notice && route !== "onboarding" ? <Text style={styles.notice}>{notice}</Text> : null}

      {route === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#EE7C2B" />
        </View>
      ) : null}

      {route === "login" ? (
        <>
          {notice ? <Text style={styles.inlineNotice}>{notice}</Text> : null}
          <LoginScreen
            onLogin={handleLogin}
            onRegister={() => setRoute("register")}
            onRegisterCustomer={() => setRoute("registerCustomer")}
          />
        </>
      ) : null}

      {route === "welcome" ? (
        <WelcomeScreen
          onLogin={() => setRoute("login")}
          onRegister={() => setRoute("roleSelection")}
        />
      ) : null}

      {route === "roleSelection" ? (
        <RoleSelectionScreen
          onBack={() => setRoute("welcome")}
          onLogin={() => setRoute("login")}
          onSelect={(role) => setRoute(role === "customer" ? "registerCustomer" : "register")}
        />
      ) : null}

      {route === "register" ? (
        <RegisterScreen onBack={() => setRoute("login")} onRegistered={handleRegistered} />
      ) : null}

      {route === "registerCustomer" ? (
        <RegisterCustomerScreen
          onBack={() => setRoute("login")}
          onGoogleAuthenticated={handleLogin}
        />
      ) : null}

      {route === "onboarding" && provider ? (
        <OnboardingScreen
          onLogout={handleLogout}
          onSubmittedForReview={handleSubmittedForReview}
          provider={provider}
          session={session}
        />
      ) : null}

      {route === "verification" && provider ? (
        <VerificationScreen
          isRefreshing={isRefreshingProvider}
          onLogout={handleLogout}
          onRefreshStatus={handleRefreshProviderStatus}
          provider={provider}
        />
      ) : null}

      {route === "approved" && provider ? (
        <ProviderDashboardScreen
          accessToken={session?.access_token}
          onLogout={handleLogout}
          provider={provider}
          pushIntent={pushIntent}
          onPushIntentHandled={() => setPushIntent(null)}
        />
      ) : null}

      {route === "customer" && customer ? (
        <CustomerAppScreen
          accessToken={session?.access_token}
          customer={customer}
          onLogout={handleLogout}
          pushIntent={pushIntent}
          onPushIntentHandled={() => setPushIntent(null)}
        />
      ) : null}

      {route === "completeCustomerProfile" && customer && session ? (
        <CompleteCustomerProfileScreen
          customer={customer}
          onComplete={(nextCustomer) => void handleCustomerProfileCompleted(nextCustomer)}
          session={session}
        />
      ) : null}
    </SafeAreaProvider>
  );
}

function getSessionRoute(session: Session | null): Route {
  if (!session) {
    return "login";
  }

  if (session.customer || session.roles?.some((role) => ["customer", "client"].includes(role))) {
    const customer = getCustomerFromSession(session);
    return session.is_new_user || !customer?.phone || !customer?.rut ? "completeCustomerProfile" : "customer";
  }

  return getProviderRoute(getProviderFromSession(session));
}

function getProviderFromSession(session: Session | null): Provider | null {
  if (!session) return null;
  if (session.provider) return session.provider;
  if (session.needs_onboarding || session.roles?.includes("provider")) {
    return { id: session.user.id, full_name: session.user.email, status: "onboarding", onboarding_step: "profile" };
  }
  return null;
}

function getCustomerFromSession(session: Session | null): Customer | null {
  if (!session) {
    return null;
  }

  if (session.customer) {
    return session.customer;
  }

  if (session.roles?.some((role) => ["customer", "client"].includes(role))) {
    return {
      id: session.user.id,
      email: session.user.email
    };
  }

  return null;
}

function getProviderRoute(provider: Provider | null): Route {
  if (!provider) {
    return "login";
  }

  if (isApprovedProvider(provider)) {
    return "approved";
  }

  if (provider.status === "pending_review" || provider.onboarding_step === "pending_review") {
    return "verification";
  }

  return "onboarding";
}

function VerificationScreen({
  provider,
  onLogout,
  onRefreshStatus,
  isRefreshing
}: {
  provider: Provider;
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
  isRefreshing: boolean;
}) {
  const providerName =
    provider.full_name ?? `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim() ?? "Proveedor";

  useEffect(() => {
    const timer = setInterval(() => {
      void onRefreshStatus();
    }, 30000);

    void onRefreshStatus();

    return () => clearInterval(timer);
  }, [onRefreshStatus]);

  return (
    <View style={styles.verificationScreen}>
      <View style={styles.verificationTopBar}>
        <BrandLogo size="medium" />
        <Pressable onPress={onLogout} style={styles.verificationLogout}>
          <Feather color="#626D84" name="log-out" size={18} />
        </Pressable>
      </View>

      <View style={styles.verificationContent}>
        <View style={styles.verificationIcon}>
          <Feather color="#EE7C2B" name="check-circle" size={34} />
        </View>
        <Text style={styles.verificationTitle}>Postulacion enviada</Text>
        <Text style={styles.verificationText}>
          {providerName}, recibimos tu informacion y ahora esta en verificacion.
        </Text>
        <View style={styles.verificationStatus}>
          <View style={styles.verificationStatusDot} />
          <Text style={styles.verificationStatusText}>En verificacion</Text>
        </View>
        <Pressable
          disabled={isRefreshing}
          onPress={() => void onRefreshStatus()}
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
        >
          {isRefreshing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Feather color="#ffffff" name="refresh-cw" size={18} />
              <Text style={styles.refreshButtonText}>Actualizar estado</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function isApprovedProvider(provider: Provider) {
  return ["approved", "active", "verified"].includes(String(provider.status ?? "").toLowerCase())
    || ["approved", "active", "verified"].includes(String(provider.onboarding_step ?? "").toLowerCase());
}

async function refreshStoredSession(storedSession: Session) {
  try {
    const role = storedSession.customer || storedSession.roles?.some((item) => ["customer", "client"].includes(item))
      ? "customer"
      : "provider";
    const session = await refreshLogin(storedSession.refresh_token, role);
    await saveSession(session);
    return session;
  } catch {
    await clearSession();
    return null;
  }
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    flex: 1,
    justifyContent: "center"
  },
  notice: {
    display: "none"
  },
  inlineNotice: {
    backgroundColor: "#FAEEDA",
    color: "#854F0B",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  verificationScreen: {
    backgroundColor: "#F1EFE8",
    flex: 1,
    padding: 20,
    paddingTop: 56
  },
  verificationTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  verificationLogo: {
    height: 56,
    width: 39
  },
  verificationLogout: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  verificationContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 64
  },
  verificationIcon: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 28,
    height: 64,
    justifyContent: "center",
    marginBottom: 24,
    width: 64
  },
  verificationTitle: {
    color: "#1D2330",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center"
  },
  verificationText: {
    color: "#626D84",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: "center"
  },
  verificationStatus: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  verificationStatusDot: {
    backgroundColor: "#854F0B",
    borderRadius: 5,
    height: 10,
    width: 10
  },
  verificationStatusText: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "800"
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 18
  },
  refreshButtonDisabled: {
    opacity: 0.65
  },
  refreshButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  dashboardScreen: {
    backgroundColor: "#FCFAF7",
    flex: 1
  },
  dashboardContainer: {
    padding: 20,
    paddingBottom: 36,
    paddingTop: 56
  },
  dashboardTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  dashboardKicker: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  dashboardName: {
    color: "#1D2330",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
    maxWidth: 260
  },
  dashboardIconButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  approvedHero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    overflow: "hidden",
    padding: 20
  },
  approvedHeroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24
  },
  serviceIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  approvedBadge: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  approvedBadgeText: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  serviceTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0
  },
  serviceSubtitle: {
    color: "#E7E0DA",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  heroStatsRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 22,
    padding: 14
  },
  heroStat: {
    flex: 1
  },
  heroStatValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  heroStatLabel: {
    color: "#888780",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  heroStatDivider: {
    backgroundColor: "rgba(255,255,255,0.16)",
    height: 36,
    marginHorizontal: 14,
    width: 1
  },
  dashboardGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16
  },
  dashboardCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 126,
    padding: 16
  },
  dashboardCardValue: {
    color: "#1D2330",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 18
  },
  dashboardCardLabel: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 4
  },
  dashboardSection: {
    marginTop: 24
  },
  dashboardSectionTitle: {
    color: "#1D2330",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  dashboardAction: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 14
  },
  dashboardActionIcon: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  dashboardActionCopy: {
    flex: 1
  },
  dashboardActionTitle: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "900"
  },
  dashboardActionText: {
    color: "#626D84",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3
  },
  enablementPanel: {
    alignItems: "flex-start",
    backgroundColor: "#EAF3DE",
    borderColor: "#F5C4B3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 16
  },
  enablementIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  enablementCopy: {
    flex: 1
  },
  enablementTitle: {
    color: "#EE7C2B",
    fontSize: 15,
    fontWeight: "900"
  },
  enablementText: {
    color: "#993C1D",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  approvedIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 28,
    height: 64,
    justifyContent: "center",
    marginBottom: 24,
    width: 64
  },
  approvedStatus: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderColor: "#F5C4B3",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  approvedStatusDot: {
    backgroundColor: "#EE7C2B",
    borderRadius: 5,
    height: 10,
    width: 10
  },
  approvedStatusText: {
    color: "#EE7C2B",
    fontSize: 13,
    fontWeight: "900"
  }
});
