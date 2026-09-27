import { useCallback, useEffect, useMemo, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BrandLogo } from "../components/BrandLogo";
import { registerPushNotifications } from "../services/pushNotifications";
import { getChileanComunas } from "../api/onboarding";
import {
  acceptBooking,
  cancelBooking,
  completeService,
  createProviderBankAccount,
  createEmergencyAlert,
  createServiceIncident,
  createServiceReport,
  createSupportTicket,
  getChatMessages,
  getEmergencyContacts,
  getNotifications,
  getOrCreateBookingChat,
  getProviderBalance,
  getProviderAvailability,
  getProviderBankAccounts,
  getProviderBookings,
  getProviderDashboard,
  getProviderDocuments,
  getProviderPerformance,
  getProviderPricing,
  getProviderProfile,
  getProviderReviews,
  getProviderReviewSummary,
  getProviderPayouts,
  getProviderServiceZones,
  getProviderTaxSummary,
  getServiceIncidents,
  getServicePhotos,
  getServiceRoute,
  getServiceSummary,
  getVeterinaryCoverage,
  getWalletTransactions,
  listSupportTickets,
  markChatRead,
  markNotificationRead,
  pauseService,
  rejectBooking,
  requestProviderPayout,
  resumeService,
  sendChatMessage,
  startService,
  updateServiceLocation,
  updateProviderProfile,
  updateProviderServiceZones,
  uploadServicePhoto
} from "../api/provider";
import type {
  Booking,
  BookingChat,
  BankAccount,
  ChatMessage,
  EmergencyContact,
  NotificationItem,
  Provider,
  ProviderAvailabilitySlot,
  ProviderBalance,
  ProviderPerformance,
  ProviderPricing,
  ProviderDocument,
  ProviderProfile,
  ProviderPayout,
  ProviderReview,
  ProviderReviewSummary,
  ProviderServiceZone,
  ProviderTaxSummary,
  ServiceIncident,
  ServiceLocation,
  ServicePhoto,
  ServiceSummary,
  SupportTicket,
  VeterinaryCoverage,
  WalletTransaction
} from "../types/api";

type Props = {
  provider: Provider;
  accessToken?: string | null;
  onLogout: () => void;
};

type BookingAction = "accept" | "reject" | "start" | "complete" | "cancel" | "photo" | "pause" | "resume" | "incident";
type DashboardView =
  | "home"
  | "requests"
  | "schedule"
  | "reservations"
  | "completed"
  | "availability"
  | "earnings"
  | "wallet"
  | "profile"
  | "reviews"
  | "notifications"
  | "support"
  | "documents"
  | "zones"
  | "metrics";
type ServicePosition = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
};
type WalkCoordinate = {
  latitude: number;
  longitude: number;
};
type ServiceEvidencePhoto = ServicePhoto | {
  id: string;
  booking_id: string;
  type: string;
  url: string;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
};
type SupportCategory = {
  key: string;
  title: string;
  description: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

const supportCategories: SupportCategory[] = [
  {
    key: "active_walk_issue",
    title: "Problema en paseo",
    description: "Ruta, mascota, cliente o evidencia durante un servicio.",
    subject: "Problema durante un paseo",
    message: "Necesito apoyo con un servicio en curso o recientemente iniciado.",
    priority: "high",
    icon: "navigation",
    color: "#EE7C2B"
  },
  {
    key: "payment_wallet",
    title: "Wallet y pagos",
    description: "Retiro, saldo pendiente, cuenta bancaria o liquidacion.",
    subject: "Consulta sobre wallet o pago",
    message: "Necesito revisar un movimiento, retiro o cuenta de pago.",
    priority: "medium",
    icon: "credit-card",
    color: "#185FA5"
  },
  {
    key: "veterinary_emergency",
    title: "Emergencia veterinaria",
    description: "Activar apoyo por salud o seguridad de la mascota.",
    subject: "Emergencia veterinaria",
    message: "Necesito asistencia veterinaria para una mascota asociada al servicio.",
    priority: "urgent",
    icon: "alert-triangle",
    color: "#854F0B"
  },
  {
    key: "account_verification",
    title: "Cuenta y verificacion",
    description: "Documentos, rechazo de validacion o datos del perfil.",
    subject: "Revision de cuenta provider",
    message: "Necesito ayuda con documentos, validacion o datos de mi perfil.",
    priority: "medium",
    icon: "shield",
    color: "#7c3aed"
  }
];

export function ProviderDashboardScreen({ provider, accessToken, onLogout }: Props) {
  useEffect(() => {
    void registerPushNotifications({ userId: provider.id, role: "provider", accessToken }).catch(() => null);
  }, [accessToken, provider.id]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailabilitySlot[]>([]);
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [performance, setPerformance] = useState<ProviderPerformance | null>(null);
  const [acceptedBookingIds, setAcceptedBookingIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<DashboardView>("home");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeWalkBooking, setActiveWalkBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionState, setActionState] = useState<{ bookingId: string; action: BookingAction } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const providerName =
    provider.full_name ?? `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim() ?? "Proveedor";
  const pendingBookings = useMemo(() => bookings.filter(isPendingBooking), [bookings]);
  const activeBookings = useMemo(
    () => bookings.filter((booking) => isActiveBooking(booking, acceptedBookingIds)),
    [acceptedBookingIds, bookings]
  );
  const inProgressBookings = useMemo(() => bookings.filter(isInProgressBooking), [bookings]);
  const currentWalkBooking = activeWalkBooking ?? inProgressBookings[0] ?? null;
  const completedBookings = useMemo(() => bookings.filter((booking) => booking.status === "completed"), [bookings]);
  const nextBooking = currentWalkBooking ?? activeBookings[0] ?? pendingBookings[0] ?? null;

  const loadDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const today = new Date();
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);

      const [nextBookings, slots, dashboard, nextBalance, nextPerformance] = await Promise.all([
        getProviderBookings({ providerId: provider.id, accessToken }),
        getProviderAvailability({
          providerId: provider.id,
          from: toDateParam(today),
          to: toDateParam(weekEnd),
          accessToken
        }).catch(() => []),
        getProviderDashboard({ providerId: provider.id, accessToken }).catch(() => null),
        getProviderBalance({ providerId: provider.id, accessToken }).catch(() => null),
        getProviderPerformance({ providerId: provider.id, accessToken }).catch(() => null)
      ]);

      const dashboardBookings = dashboard?.bookings?.length
        ? [...dashboard.bookings, ...nextBookings.filter((booking) => !dashboard.bookings?.some((item) => getBookingId(item) === getBookingId(booking)))]
        : nextBookings;
      const dashboardActiveService = dashboard?.active_service ?? null;
      const mergedBookings = dashboardActiveService ? replaceBooking(dashboardBookings, dashboardActiveService) : dashboardBookings;

      setBookings(sortBookings(activeWalkBooking ? replaceBooking(mergedBookings, activeWalkBooking) : mergedBookings));
      setAvailability(slots);
      setBalance(nextBalance);
      setPerformance(nextPerformance);
    } catch (currentError) {
      setError(getDashboardError(currentError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, activeWalkBooking, provider.id]);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadDashboard();
    }, 30000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  async function runBookingAction(booking: Booking, action: BookingAction) {
    const bookingId = getBookingId(booking);

    if (!bookingId) {
      showError("No se pudo identificar esta reserva.");
      return;
    }

    setActionState({ bookingId, action });
    setError(null);
    setNotice(null);

    try {
      let shouldReload = false;

      if (action === "accept") {
        const updatedBooking = await acceptBooking({ bookingId, providerId: provider.id, accessToken });
        replaceBookingLocally(mergeBooking(booking, updatedBooking, { status: "accepted" }));
        setAcceptedBookingIds((current) => [...new Set([...current, bookingId])]);
        setNotice("Solicitud aceptada.");
      }

      if (action === "reject") {
        const updatedBooking = await rejectBooking({
          bookingId,
          providerId: provider.id,
          reason: "Rechazado desde app provider",
          accessToken
        });
        replaceBookingLocally(mergeBooking(booking, updatedBooking, { status: "rejected" }));
        setNotice("Solicitud rechazada.");
      }

      if (action === "start") {
        setNotice("Abriendo camara para iniciar el paseo.");
        const photo = await takeServicePhoto("inicio");

        if (!photo) {
          return;
        }

        setNotice("Registrando ubicacion de inicio.");
        const location = await getCurrentServiceLocation();

        if (!location) {
          return;
        }

        const updatedBooking = await startService({
          bookingId,
          startPhotoBase64: photo.base64,
          startPhotoMime: photo.mimeType,
          startLatitude: location.latitude,
          startLongitude: location.longitude,
          startAddress: location.address,
          notes: "Iniciado desde app provider",
          accessToken
        });
        const activeBooking = mergeBooking(booking, updatedBooking, {
          start_address: location.address,
          start_latitude: location.latitude,
          start_longitude: location.longitude,
          start_photo_path: photo.uri,
          started_at: new Date().toISOString(),
          status: "in_progress"
        });
        replaceBookingLocally(activeBooking);
        setSelectedBooking(null);
        setActiveView("home");
        setActiveWalkBooking(activeBooking);
        setNotice("Servicio iniciado.");
      }

      if (action === "complete") {
        const photo = await takeServicePhoto("finalizacion");

        if (!photo) {
          return;
        }

        const location = await getCurrentServiceLocation();

        const updatedBooking = await completeService({
          bookingId,
          completionPhotoBase64: photo.base64,
          completionPhotoMime: photo.mimeType,
          completionLatitude: location?.latitude,
          completionLongitude: location?.longitude,
          notes: "Finalizado desde app provider",
          accessToken
        });
        const completedBooking = mergeBooking(booking, updatedBooking, {
          completed_at: new Date().toISOString(),
          completion_latitude: location?.latitude,
          completion_longitude: location?.longitude,
          completion_photo_path: photo.uri,
          status: "completed"
        });
        await createServiceReport({
          bookingId,
          petStatus: "Servicio finalizado correctamente",
          notes: "Reporte generado desde app provider",
          durationSeconds: estimateDurationSeconds(completedBooking),
          accessToken
        }).catch(() => null);
        replaceBookingLocally(completedBooking);
        setActiveWalkBooking(null);
        setSelectedBooking(null);
        setNotice("Servicio finalizado.");
      }

      if (action === "pause") {
        const updatedBooking = await pauseService({
          bookingId,
          reason: "Pausa registrada desde app provider",
          accessToken
        });
        const pausedBooking = mergeBooking(booking, updatedBooking, { status: "paused" });
        replaceBookingLocally(pausedBooking);
        setActiveWalkBooking(pausedBooking);
        setNotice("Paseo pausado.");
      }

      if (action === "resume") {
        const updatedBooking = await resumeService({ bookingId, accessToken });
        const resumedBooking = mergeBooking(booking, updatedBooking, { status: "in_progress" });
        replaceBookingLocally(resumedBooking);
        setActiveWalkBooking(resumedBooking);
        setNotice("Paseo reanudado.");
      }

      if (action === "incident") {
        setNotice("Abriendo camara para registrar el incidente.");
        const photo = await takeServicePhoto("durante el paseo");
        const location = await getCurrentServiceLocation();

        await createServiceIncident({
          bookingId,
          type: "provider_report",
          severity: "medium",
          notes: "Incidente reportado desde app provider",
          photoBase64: photo?.base64,
          photoMime: photo?.mimeType,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accessToken
        });
        setNotice("Incidente reportado.");
      }

      if (action === "cancel") {
        const updatedBooking = await cancelBooking({
          bookingId,
          reason: "Cancelado por proveedor desde app",
          accessToken
        });
        replaceBookingLocally(mergeBooking(booking, updatedBooking, { status: "cancelled" }));
        setActiveWalkBooking((current) => {
          const currentId = current ? getBookingId(current) : null;
          return currentId === bookingId ? null : current;
        });
        setNotice("Reserva cancelada.");
      }

      if (shouldReload) {
        await loadDashboard();
      }
    } catch (currentError) {
      showError(getDashboardError(currentError));
    } finally {
      setActionState(null);
    }
  }

  async function takeServicePhoto(stage: "inicio" | "finalizacion" | "durante el paseo") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      showError(`Necesitamos permiso de camara para tomar la foto de ${stage}.`);
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: false,
      mediaTypes: ["images"],
      quality: 0.75
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.Base64
    });

    return {
      base64,
      uri: result.assets[0].uri,
      mimeType: result.assets[0].mimeType ?? "image/jpeg"
    };
  }

  async function getCurrentServiceLocation() {
    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if (!servicesEnabled) {
      showError("Activa la ubicacion del dispositivo para iniciar el paseo.");
      return null;
    }

    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      showError("Necesitamos permiso de ubicacion para iniciar el paseo.");
      return null;
    }

    const position = await getServicePosition();

    if (!position) {
      showError("No pudimos obtener tu ubicacion. Sal al exterior, revisa GPS/senal e intenta de nuevo.");
      return null;
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      address: null
    };
  }

  function openBooking(booking: Booking) {
    if (isInProgressBooking(booking)) {
      setActiveWalkBooking(booking);
      setSelectedBooking(null);
      return;
    }

    setSelectedBooking(booking);
  }

  function closeBooking() {
    setSelectedBooking(null);
  }

  function replaceBookingLocally(updatedBooking: Booking) {
    setBookings((current) => replaceBooking(current, updatedBooking));
    setSelectedBooking((current) => {
      if (!current || getBookingId(current) !== getBookingId(updatedBooking)) {
        return current;
      }

      return updatedBooking;
    });
  }

  function showError(message: string) {
    setError(message);
    Alert.alert("No se pudo continuar", message);
  }

  async function addServiceEvidencePhoto(booking: Booking) {
    const bookingId = getBookingId(booking);

    if (!bookingId) {
      showError("No se pudo identificar esta reserva.");
      return null;
    }

    setActionState({ bookingId, action: "photo" });
    setError(null);
    setNotice("Abriendo camara.");

    try {
      const photo = await takeServicePhoto("durante el paseo");

      if (!photo) {
        return null;
      }

      const location = await getCurrentServiceLocation();
      const uploadedPhoto = await uploadServicePhoto({
        bookingId,
        type: "during",
        photoBase64: photo.base64,
        photoMime: photo.mimeType,
        latitude: location?.latitude,
        longitude: location?.longitude,
        notes: "Foto tomada durante el paseo",
        accessToken
      });

      setNotice("Foto agregada al paseo.");

      return uploadedPhoto ?? {
        id: `${bookingId}-${Date.now()}`,
        booking_id: bookingId,
        type: "during",
        url: photo.uri,
        latitude: location?.latitude,
        longitude: location?.longitude,
        created_at: new Date().toISOString()
      };
    } catch (currentError) {
      showError(getDashboardError(currentError));
      return null;
    } finally {
      setActionState(null);
    }
  }

  async function createWalkEmergencyAlert(booking: Booking) {
    const bookingId = getBookingId(booking);

    if (!bookingId) {
      showError("No se pudo identificar esta reserva.");
      return;
    }

    const location = await getCurrentServiceLocation();

    try {
      await createEmergencyAlert({
        bookingId,
        userId: provider.id,
        type: "walk_emergency",
        latitude: location?.latitude,
        longitude: location?.longitude,
        message: "Emergencia reportada desde paseo activo",
        accessToken
      });
      Alert.alert("Emergencia enviada", "El equipo de soporte recibio la alerta.");
    } catch (currentError) {
      showError(getDashboardError(currentError));
    }
  }

  if (activeWalkBooking) {
    return (
      <ActiveWalkView
        actionState={actionState}
        booking={activeWalkBooking}
        error={error}
        notice={notice}
        accessToken={accessToken}
        onAddPhoto={addServiceEvidencePhoto}
        onBack={() => setActiveWalkBooking(null)}
        onComplete={(booking) => runBookingAction(booking, "complete")}
        onEmergency={createWalkEmergencyAlert}
        onIncident={(booking) => runBookingAction(booking, "incident")}
        onPause={(booking) => runBookingAction(booking, "pause")}
        onResume={(booking) => runBookingAction(booking, "resume")}
      />
    );
  }

  if (selectedBooking) {
    return (
      <BookingDetailView
        actionState={actionState}
        acceptedBookingIds={acceptedBookingIds}
        booking={selectedBooking}
        error={error}
        notice={notice}
        accessToken={accessToken}
        onAction={runBookingAction}
        onBack={closeBooking}
        providerId={provider.id}
      />
    );
  }

  if (activeView !== "home") {
    return (
      <DashboardDrillDown
        actionState={actionState}
        acceptedBookingIds={acceptedBookingIds}
        availability={availability}
        bookings={getBookingsForView(activeView, bookings, acceptedBookingIds)}
        error={error}
        notice={notice}
        accessToken={accessToken}
        onAction={runBookingAction}
        onBack={() => setActiveView("home")}
        onOpenBooking={openBooking}
        provider={provider}
        title={getViewTitle(activeView)}
        view={activeView}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadDashboard()} />}
      >
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <BrandLogo size="small" />
            <Text numberOfLines={1} style={styles.providerName}>
              {providerName}
            </Text>
          </View>
          <Pressable onPress={onLogout} style={styles.iconButton}>
            <Feather color="#626D84" name="log-out" size={18} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.serviceIcon}>
              <Feather color="#ffffff" name="navigation" size={26} />
            </View>
            <View style={styles.approvedBadge}>
              <Feather color="#EE7C2B" name="check-circle" size={16} />
              <Text style={styles.approvedBadgeText}>Aprobado y habilitado</Text>
            </View>
          </View>

          <Text style={styles.serviceTitle}>Paseador de perros</Text>
          <Text style={styles.serviceSubtitle}>
            Gestiona solicitudes, agenda e inicio de servicios desde tu panel.
          </Text>

          <View style={styles.heroStatsRow}>
            <Pressable onPress={() => setActiveView("requests")} style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pendingBookings.length}</Text>
              <Text style={styles.heroStatLabel}>Solicitudes</Text>
            </Pressable>
            <View style={styles.heroStatDivider} />
            <Pressable onPress={() => setActiveView("schedule")} style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeBookings.length}</Text>
              <Text style={styles.heroStatLabel}>Activos</Text>
            </Pressable>
            <View style={styles.heroStatDivider} />
            <Pressable onPress={() => setActiveView("availability")} style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{availability.length}</Text>
              <Text style={styles.heroStatLabel}>Bloques libres</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.feedbackError}>
            <Feather color="#A32D2D" name="alert-circle" size={18} />
            <Text style={styles.feedbackErrorText}>{error}</Text>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.feedbackNotice}>
            <Feather color="#367D5F" name="check-circle" size={18} />
            <Text style={styles.feedbackNoticeText}>{notice}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#EE7C2B" />
          </View>
        ) : (
          <>
            {currentWalkBooking ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Paseo activo</Text>
                  <Pressable onPress={() => setActiveWalkBooking(currentWalkBooking)} style={styles.sectionLink}>
                    <Text style={styles.sectionLinkText}>Ver paseo</Text>
                    <Feather color="#EE7C2B" name="chevron-right" size={16} />
                  </Pressable>
                </View>
                <Pressable onPress={() => setActiveWalkBooking(currentWalkBooking)} style={styles.activeWalkSummary}>
                  <View style={styles.activeWalkSummaryIcon}>
                    <Feather color="#ffffff" name="navigation" size={22} />
                  </View>
                  <View style={styles.activeWalkSummaryCopy}>
                    <View style={styles.activeWalkSummaryStatus}>
                      <View style={styles.liveDot} />
                      <Text style={styles.activeWalkSummaryStatusText}>
                        {isPausedBooking(currentWalkBooking) ? "Pausado" : "En curso"}
                      </Text>
                    </View>
                    <Text style={styles.activeWalkSummaryTitle}>
                      {currentWalkBooking.product_name ?? currentWalkBooking.service_name ?? "Paseo de perros"}
                    </Text>
                    <Text style={styles.activeWalkSummaryMeta}>{formatBookingTime(currentWalkBooking)}</Text>
                  </View>
                  <Feather color="#EE7C2B" name="chevron-right" size={22} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Solicitudes nuevas</Text>
                <Pressable onPress={() => setActiveView("requests")} style={styles.sectionLink}>
                  <Text style={styles.sectionLinkText}>Ver todo</Text>
                  <Feather color="#EE7C2B" name="chevron-right" size={16} />
                </Pressable>
              </View>
              {pendingBookings.length === 0 ? (
                <EmptyState text="No tienes solicitudes pendientes." />
              ) : (
                pendingBookings.map((booking, index) => (
                  <BookingCard
                    actionState={actionState}
                    acceptedBookingIds={acceptedBookingIds}
                    booking={booking}
                    key={getBookingKey(booking, index)}
                    onAction={runBookingAction}
                    onOpen={openBooking}
                    variant="request"
                  />
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Agenda</Text>
                <Pressable onPress={() => setActiveView("schedule")} style={styles.sectionLink}>
                  <Text style={styles.sectionLinkText}>Ver agenda</Text>
                  <Feather color="#EE7C2B" name="chevron-right" size={16} />
                </Pressable>
              </View>
              {activeBookings.length === 0 ? (
                <EmptyState text="No hay paseos agendados o en curso." />
              ) : (
                activeBookings.map((booking, index) => (
                  <BookingCard
                    actionState={actionState}
                    acceptedBookingIds={acceptedBookingIds}
                    booking={booking}
                    key={getBookingKey(booking, index)}
                    onAction={runBookingAction}
                    onOpen={openBooking}
                    variant="active"
                  />
                ))
              )}
            </View>

            <View style={styles.dashboardGrid}>
              <Pressable onPress={() => setActiveView("reservations")} style={styles.dashboardCard}>
                <Feather color="#EE7C2B" name="calendar" size={22} />
                <Text style={styles.dashboardCardValue}>{bookings.length}</Text>
                <Text style={styles.dashboardCardLabel}>Total de reservas</Text>
              </Pressable>
              <Pressable onPress={() => setActiveView("completed")} style={styles.dashboardCard}>
                <Feather color="#185FA5" name="check-square" size={22} />
                <Text style={styles.dashboardCardValue}>{completedBookings.length}</Text>
                <Text style={styles.dashboardCardLabel}>Servicios finalizados</Text>
              </Pressable>
            </View>

            <View style={styles.dashboardGrid}>
              <Pressable onPress={() => setActiveView("wallet")} style={styles.dashboardCard}>
                <Feather color="#EE7C2B" name="dollar-sign" size={22} />
                <Text style={styles.dashboardCardValue}>{formatMoney(balance?.available ?? performance?.earnings ?? 0, balance?.currency)}</Text>
                <Text style={styles.dashboardCardLabel}>Saldo disponible</Text>
              </Pressable>
              <Pressable onPress={() => setActiveView("metrics")} style={styles.dashboardCard}>
                <Feather color="#185FA5" name="star" size={22} />
                <Text style={styles.dashboardCardValue}>{formatRating(performance?.avg_rating)}</Text>
                <Text style={styles.dashboardCardLabel}>Rating promedio</Text>
              </Pressable>
            </View>

            <View style={styles.quickGrid}>
              <QuickAction icon="briefcase" label="Wallet" onPress={() => setActiveView("wallet")} />
              <QuickAction icon="user" label="Perfil" onPress={() => setActiveView("profile")} />
              <QuickAction icon="credit-card" label="Pagos" onPress={() => setActiveView("earnings")} />
              <QuickAction icon="map-pin" label="Zonas" onPress={() => setActiveView("zones")} />
              <QuickAction icon="file-text" label="Docs" onPress={() => setActiveView("documents")} />
              <QuickAction icon="star" label="Resenas" onPress={() => setActiveView("reviews")} />
              <QuickAction icon="bell" label="Alertas" onPress={() => setActiveView("notifications")} />
              <QuickAction icon="life-buoy" label="Soporte" onPress={() => setActiveView("support")} />
            </View>

            <View style={styles.opsStrip}>
              <View style={styles.opsStripItem}>
                <Text style={styles.opsStripValue}>{formatPercent(performance?.acceptance_rate)}</Text>
                <Text style={styles.opsStripLabel}>Aceptacion</Text>
              </View>
              <View style={styles.opsStripDivider} />
              <View style={styles.opsStripItem}>
                <Text style={styles.opsStripValue}>{performance?.completed ?? completedBookings.length}</Text>
                <Text style={styles.opsStripLabel}>Completados</Text>
              </View>
              <View style={styles.opsStripDivider} />
              <View style={styles.opsStripItem}>
                <Text style={styles.opsStripValue}>{balance ? formatMoney(balance.pending, balance.currency) : "$0"}</Text>
                <Text style={styles.opsStripLabel}>Pendiente</Text>
              </View>
            </View>

            <View style={styles.enablementPanel}>
              <View style={styles.enablementIcon}>
                <Feather color="#EE7C2B" name="shield" size={20} />
              </View>
              <View style={styles.enablementCopy}>
                <Text style={styles.enablementTitle}>Habilitado para operar</Text>
                <Text style={styles.enablementText}>
                  {nextBooking
                    ? `Proximo servicio: ${formatBookingTime(nextBooking)}.`
                    : "Tu perfil esta listo para recibir nuevas solicitudes."}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ActiveWalkView({
  booking,
  actionState,
  error,
  notice,
  accessToken,
  onAddPhoto,
  onBack,
  onComplete,
  onEmergency,
  onIncident,
  onPause,
  onResume
}: {
  booking: Booking;
  actionState: { bookingId: string; action: BookingAction } | null;
  error: string | null;
  notice: string | null;
  accessToken?: string | null;
  onAddPhoto: (booking: Booking) => Promise<ServiceEvidencePhoto | null>;
  onBack: () => void;
  onComplete: (booking: Booking) => Promise<void>;
  onEmergency: (booking: Booking) => Promise<void>;
  onIncident: (booking: Booking) => Promise<void>;
  onPause: (booking: Booking) => Promise<void>;
  onResume: (booking: Booking) => Promise<void>;
}) {
  const bookingId = getBookingId(booking);
  const isCompleting = actionState?.bookingId === bookingId && actionState.action === "complete";
  const isAddingPhoto = actionState?.bookingId === bookingId && actionState.action === "photo";
  const isReportingIncident = actionState?.bookingId === bookingId && actionState.action === "incident";
  const isPausing = actionState?.bookingId === bookingId && actionState.action === "pause";
  const isResuming = actionState?.bookingId === bookingId && actionState.action === "resume";
  const isPaused = isPausedBooking(booking);
  const title = booking.product_name ?? booking.service_name ?? "Paseo de perros";
  const customer = booking.customer_name ?? booking.customer_email ?? "Cliente NOD";
  const startCoordinate = getStartCoordinate(booking);
  const completionCoordinate = getCompletionCoordinate(booking);
  const startPhotoUri = getPhotoUri(booking.start_photo_url ?? booking.start_photo_path);
  const completionPhotoUri = getPhotoUri(booking.completion_photo_url ?? booking.completion_photo_path);
  const [route, setRoute] = useState<ServiceLocation[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [servicePhotos, setServicePhotos] = useState<ServiceEvidencePhoto[]>([]);
  const [incidents, setIncidents] = useState<ServiceIncident[]>([]);
  const [summary, setSummary] = useState<ServiceSummary | null>(null);

  const refreshLiveData = useCallback(async () => {
    if (!bookingId) {
      return;
    }

    const [routeResponse, photosResponse, incidentResponse, summaryResponse] = await Promise.all([
      getServiceRoute({ bookingId, accessToken }).catch(() => null),
      getServicePhotos({ bookingId, accessToken }).catch(() => []),
      getServiceIncidents({ bookingId, accessToken }).catch(() => []),
      getServiceSummary({ bookingId, accessToken }).catch(() => null)
    ]);

    if (routeResponse) {
      setRoute(routeResponse.route);
      setDistanceMeters(routeResponse.distance_meters ?? null);
      setDurationSeconds(routeResponse.duration_seconds ?? null);
    }

    setServicePhotos(photosResponse);
    setIncidents(incidentResponse);
    setSummary(summaryResponse ?? null);
  }, [accessToken, bookingId]);

  useEffect(() => {
    void refreshLiveData();
    const timer = setInterval(() => {
      void refreshLiveData();
    }, 15000);

    return () => clearInterval(timer);
  }, [refreshLiveData]);

  useEffect(() => {
    if (!bookingId || !isInProgressBooking(booking) || isPaused) {
      return;
    }

    async function publishLocation() {
      const position = await getServicePosition();

      if (!position || !bookingId) {
        return;
      }

      const location = await updateServiceLocation({
        bookingId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: "accuracy" in position.coords ? position.coords.accuracy : undefined,
        heading: "heading" in position.coords ? position.coords.heading : undefined,
        speed: "speed" in position.coords ? position.coords.speed : undefined,
        recordedAt: new Date().toISOString(),
        accessToken
      }).catch(() => null);

      if (location) {
        setRoute((current) => appendRoutePoint(current, location));
      }
    }

    void publishLocation();
    const timer = setInterval(() => {
      void publishLocation();
    }, 20000);

    return () => clearInterval(timer);
  }, [accessToken, booking, bookingId, isPaused]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="none" keyboardShouldPersistTaps="handled">
        <DrillDownHeader onBack={onBack} title="Paseo activo" />
        <FeedbackMessages error={error} notice={notice} />

        <View style={styles.activeWalkHero}>
          <View style={styles.activeWalkHeader}>
            <View style={styles.activeWalkIcon}>
              <Feather color="#ffffff" name="navigation" size={28} />
            </View>
            <View style={styles.activeWalkPill}>
              <View style={styles.liveDot} />
              <Text style={styles.activeWalkPillText}>{isPaused ? "Pausado" : "En curso"}</Text>
            </View>
          </View>

          <Text style={styles.activeWalkTitle}>{title}</Text>
          <Text style={styles.activeWalkSubtitle}>{customer}</Text>

          <View style={styles.activeMetricRow}>
            <View style={styles.activeMetric}>
              <Text style={styles.activeMetricLabel}>Inicio</Text>
              <Text style={styles.activeMetricValue}>{formatStartedAt(booking)}</Text>
            </View>
            <View style={styles.activeMetric}>
              <Text style={styles.activeMetricLabel}>Distancia</Text>
              <Text numberOfLines={1} style={styles.activeMetricValue}>
                {formatDistance(distanceMeters ?? estimateDistance(route))}
              </Text>
            </View>
            <View style={styles.activeMetric}>
              <Text style={styles.activeMetricLabel}>Incidentes</Text>
              <Text style={styles.activeMetricValue}>{summary?.incidents_count ?? incidents.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailPanel}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>Mapa del paseo</Text>
            <Feather color="#EE7C2B" name="map" size={18} />
          </View>
          <WalkMap
            completionCoordinate={completionCoordinate}
            route={route}
            startCoordinate={startCoordinate}
          />
        </View>

        <View style={styles.detailPanel}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>Evidencias</Text>
            <Feather color="#EE7C2B" name="camera" size={18} />
          </View>
          <View style={styles.photoGrid}>
            <EvidencePhoto label="Inicio" timestamp={booking.started_at} uri={startPhotoUri} />
            {servicePhotos.map((photo) => (
              <EvidencePhoto
                key={photo.id}
                label={getEvidenceLabel(photo.type)}
                timestamp={photo.created_at}
                uri={getPhotoUri(photo.url)}
              />
            ))}
            <EvidencePhoto label="Cierre" timestamp={booking.completed_at} uri={completionPhotoUri} />
          </View>
          <ActionButton
            busy={isAddingPhoto}
            icon="plus"
            label="Agregar foto"
            onPress={() => {
              void onAddPhoto(booking).then((photo) => {
                if (photo) {
                  setServicePhotos((current) => [...current, photo]);
                }
              });
            }}
            variant="secondary"
          />
        </View>

        <View style={styles.detailPanel}>
          <Text style={styles.panelTitle}>Datos operativos</Text>
          <Detail icon="clock" text={formatBookingTime(booking)} />
          <Detail icon="activity" text={formatDuration(durationSeconds ?? estimateDurationSeconds(booking))} />
          <Detail icon="flag" text={`${summary?.checkpoints_count ?? route.length} puntos de ruta`} />
          <Detail icon="map-pin" text={booking.start_address ?? booking.address ?? "Ubicacion registrada al iniciar"} />
          <Detail icon="credit-card" text={formatPrice(booking)} />
          <Detail icon="hash" text={`Reserva ${shortBookingId(bookingId)}`} />
          {startCoordinate ? <Detail icon="crosshair" text={formatCoordinate(startCoordinate)} /> : null}
        </View>

        <View style={styles.detailPanel}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>Incidentes</Text>
            <Feather color="#854F0B" name="alert-triangle" size={18} />
          </View>
          {incidents.length === 0 ? (
            <Text style={styles.panelText}>No hay incidentes reportados.</Text>
          ) : (
            incidents.map((incident) => (
              <View key={incident.id} style={styles.incidentItem}>
                <Text style={styles.incidentTitle}>{getIncidentTypeLabel(incident.type)}</Text>
                <Text style={styles.incidentMeta}>
                  {getIncidentSeverityLabel(incident.severity)} · {formatEvidenceTime(incident.created_at)}
                </Text>
                {incident.notes ? <Text style={styles.panelText}>{incident.notes}</Text> : null}
              </View>
            ))
          )}
          <ActionButton
            busy={isReportingIncident}
            icon="alert-circle"
            label="Reportar incidente"
            onPress={() => void onIncident(booking).then(refreshLiveData)}
            variant="secondary"
          />
        </View>

        <View style={styles.detailPanel}>
          <Text style={styles.panelTitle}>Finalizar servicio</Text>
          <View style={styles.actionRow}>
            {isPaused ? (
              <ActionButton
                busy={isResuming}
                icon="play"
                label="Reanudar"
                onPress={() => void onResume(booking)}
                variant="primary"
              />
            ) : (
              <ActionButton
                busy={isPausing}
                icon="pause"
                label="Pausar"
                onPress={() => void onPause(booking)}
                variant="secondary"
              />
            )}
          </View>
          <ActionButton
            busy={isCompleting}
            icon="camera"
            label="Finalizar con foto"
            onPress={() => void onComplete(booking)}
            variant="primary"
          />
          <ActionButton
            busy={false}
            icon="alert-triangle"
            label="Reportar emergencia"
            onPress={() => void onEmergency(booking)}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function WalkMap({
  startCoordinate,
  completionCoordinate,
  route
}: {
  startCoordinate: WalkCoordinate | null;
  completionCoordinate: WalkCoordinate | null;
  route: ServiceLocation[];
}) {
  const routeCoordinates = route.map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
  const coordinate = routeCoordinates[routeCoordinates.length - 1] ?? startCoordinate ?? completionCoordinate;
  const visiblePoints = routeCoordinates.slice(-4);

  if (!coordinate) {
    return (
      <View style={styles.mapFallback}>
        <Feather color="#626D84" name="map-pin" size={24} />
        <Text style={styles.mapFallbackText}>Ubicacion pendiente de registrar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.routeMapFrame}>
      <View style={styles.routeMapGrid}>
        <View style={styles.routeLine} />
        <View style={[styles.routeMarker, styles.routeMarkerStart]}>
          <Feather color="#ffffff" name="play" size={12} />
        </View>
        {visiblePoints.map((point, index) => (
          <View
            key={`${point.latitude}-${point.longitude}-${index}`}
            style={[
              styles.routeDot,
              {
                left: `${20 + index * 18}%`,
                top: `${60 - index * 9}%`
              }
            ]}
          />
        ))}
        <View style={[styles.routeMarker, styles.routeMarkerCurrent]}>
          <Feather color="#ffffff" name={completionCoordinate ? "check" : "navigation"} size={13} />
        </View>
      </View>
      <View style={styles.routeMapFooter}>
        <InfoRow label="Ultima ubicacion" value={formatCoordinate(coordinate)} />
        {startCoordinate ? <InfoRow label="Inicio" value={formatCoordinate(startCoordinate)} /> : null}
        {completionCoordinate ? <InfoRow label="Cierre" value={formatCoordinate(completionCoordinate)} /> : null}
      </View>
    </View>
  );
}

function EvidencePhoto({ label, timestamp, uri }: { label: string; timestamp?: string | null; uri: string | null }) {
  return (
    <View style={styles.photoCard}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Feather color="#888780" name="image" size={22} />
        </View>
      )}
      <View style={styles.photoMeta}>
        <Text style={styles.photoLabel}>{label}</Text>
        <Text style={styles.photoTime}>{timestamp ? formatEvidenceTime(timestamp) : "Pendiente"}</Text>
      </View>
    </View>
  );
}

function BookingCard({
  booking,
  variant,
  actionState,
  acceptedBookingIds,
  onAction,
  onOpen
}: {
  booking: Booking;
  variant: "request" | "active";
  actionState: { bookingId: string; action: BookingAction } | null;
  acceptedBookingIds: string[];
  onAction: (booking: Booking, action: BookingAction) => Promise<void>;
  onOpen?: (booking: Booking) => void;
}) {
  const bookingId = getBookingId(booking);
  const isBusy = actionState?.bookingId === bookingId;
  const title = booking.product_name ?? booking.service_name ?? "Paseo de perros";
  const customer = booking.customer_name ?? booking.customer_email ?? "Cliente NOD";

  return (
    <View style={styles.bookingCard}>
      <Pressable onPress={() => onOpen?.(booking)} style={styles.bookingPressArea}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingIcon}>
            <Feather color="#EE7C2B" name="navigation" size={18} />
          </View>
          <View style={styles.bookingCopy}>
            <Text style={styles.bookingTitle}>{title}</Text>
            <Text style={styles.bookingMeta}>{customer}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{getStatusLabel(booking.status)}</Text>
          </View>
          <Feather color="#888780" name="chevron-right" size={20} />
        </View>

        <View style={styles.bookingDetails}>
          <Detail icon="clock" text={formatBookingTime(booking)} />
          <Detail icon="map-pin" text={booking.address ?? "Direccion por confirmar"} />
          <Detail icon="credit-card" text={formatPrice(booking)} />
        </View>

        {booking.notes ? <Text style={styles.bookingNotes}>{booking.notes}</Text> : null}

        <View style={styles.detailButton}>
          <Feather color="#EE7C2B" name="eye" size={16} />
          <Text style={styles.detailButtonText}>Abrir reserva</Text>
        </View>
      </Pressable>

      {isInProgressBooking(booking) ? (
        <View style={styles.actionRow}>
          <ActionButton
            busy={isBusy && actionState?.action === "complete"}
            icon="camera"
            label="Finalizar"
            onPress={() => void onAction(booking, "complete")}
            variant="primary"
          />
        </View>
      ) : isPendingBooking(booking) ? (
        <View style={styles.actionRow}>
          <ActionButton
            busy={isBusy && actionState?.action === "cancel"}
            icon="slash"
            label="Cancelar"
            onPress={() => void onAction(booking, "cancel")}
            variant="secondary"
          />
          <ActionButton
            busy={isBusy && actionState?.action === "accept"}
            icon="check"
            label="Aceptar"
            onPress={() => void onAction(booking, "accept")}
            variant="primary"
          />
        </View>
      ) : isAcceptedBooking(booking, acceptedBookingIds) ? (
        <View style={styles.actionRow}>
          <ActionButton
            busy={isBusy && actionState?.action === "start"}
            icon="play"
            label="Iniciar con foto"
            onPress={() => void onAction(booking, "start")}
            variant="primary"
          />
          <ActionButton
            busy={isBusy && actionState?.action === "cancel"}
            icon="slash"
            label="Cancelar"
            onPress={() => void onAction(booking, "cancel")}
            variant="secondary"
          />
        </View>
      ) : null}
    </View>
  );
}

function DashboardDrillDown({
  title,
  view,
  bookings,
  availability,
  actionState,
  acceptedBookingIds,
  error,
  notice,
  accessToken,
  provider,
  onBack,
  onOpenBooking,
  onAction
}: {
  title: string;
  view: DashboardView;
  bookings: Booking[];
  availability: ProviderAvailabilitySlot[];
  actionState: { bookingId: string; action: BookingAction } | null;
  acceptedBookingIds: string[];
  error: string | null;
  notice: string | null;
  accessToken?: string | null;
  provider: Provider;
  onBack: () => void;
  onOpenBooking: (booking: Booking) => void;
  onAction: (booking: Booking, action: BookingAction) => Promise<void>;
}) {
  const operationalViews: DashboardView[] = [
    "documents",
    "earnings",
    "metrics",
    "profile",
    "reviews",
    "notifications",
    "support",
    "wallet",
    "zones"
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="none" keyboardShouldPersistTaps="handled">
        <DrillDownHeader onBack={onBack} title={title} />
        <FeedbackMessages error={error} notice={notice} />

        {operationalViews.includes(view) ? (
          <OperationsPanel accessToken={accessToken} provider={provider} view={view} />
        ) : view === "availability" ? (
          <AvailabilityList availability={availability} />
        ) : bookings.length === 0 ? (
          <EmptyState text={getEmptyText(view)} />
        ) : (
          bookings.map((booking, index) => (
            <BookingCard
              actionState={actionState}
              acceptedBookingIds={acceptedBookingIds}
              booking={booking}
              key={getBookingKey(booking, index)}
              onAction={onAction}
              onOpen={onOpenBooking}
              variant={isPendingBooking(booking) ? "request" : "active"}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <Feather color="#EE7C2B" name={icon} size={18} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function OperationsPanel({
  view,
  provider,
  accessToken
}: {
  view: DashboardView;
  provider: Provider;
  accessToken?: string | null;
}) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [pricing, setPricing] = useState<ProviderPricing[]>([]);
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [payouts, setPayouts] = useState<ProviderPayout[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [taxSummary, setTaxSummary] = useState<ProviderTaxSummary | null>(null);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [zones, setZones] = useState<ProviderServiceZone[]>([]);
  const [performance, setPerformance] = useState<ProviderPerformance | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ProviderReviewSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [coverage, setCoverage] = useState<VeterinaryCoverage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOperations() {
      setIsLoading(true);

      try {
        if (view === "profile") {
          const [nextProfile, nextPricing] = await Promise.all([
            getProviderProfile({ providerId: provider.id, accessToken }).catch(() => null),
            getProviderPricing({ providerId: provider.id, accessToken }).catch(() => [])
          ]);
          setProfile(nextProfile ?? null);
          setPricing(nextPricing);
        }

        if (view === "earnings") {
          const [nextBalance, payoutResponse] = await Promise.all([
            getProviderBalance({ providerId: provider.id, accessToken }).catch(() => null),
            getProviderPayouts({ providerId: provider.id, accessToken }).catch(() => ({ payouts: [], total: 0 }))
          ]);
          setBalance(nextBalance);
          setPayouts(payoutResponse.payouts);
        }

        if (view === "wallet") {
          const [nextBalance, payoutResponse, transactionResponse, nextAccounts, nextTaxSummary] = await Promise.all([
            getProviderBalance({ providerId: provider.id, accessToken }).catch(() => null),
            getProviderPayouts({ providerId: provider.id, accessToken }).catch(() => ({ payouts: [], total: 0 })),
            getWalletTransactions({ providerId: provider.id, accessToken }).catch(() => ({ transactions: [], total: 0 })),
            getProviderBankAccounts({ providerId: provider.id, accessToken }).catch(() => []),
            getProviderTaxSummary({ providerId: provider.id, accessToken }).catch(() => null)
          ]);
          setBalance(nextBalance);
          setPayouts(payoutResponse.payouts);
          setWalletTransactions(transactionResponse.transactions);
          setBankAccounts(nextAccounts);
          setTaxSummary(nextTaxSummary ?? null);
        }

        if (view === "documents") {
          const nextDocuments = await getProviderDocuments({ providerId: provider.id, accessToken }).catch(() => []);
          setDocuments(nextDocuments);
        }

        if (view === "zones") {
          const [nextZones, nextProfile] = await Promise.all([
            getProviderServiceZones({ providerId: provider.id, accessToken }).catch(() => []),
            getProviderProfile({ providerId: provider.id, accessToken }).catch(() => null)
          ]);
          setZones(nextZones);
          setProfile(nextProfile ?? null);
        }

        if (view === "metrics") {
          const nextPerformance = await getProviderPerformance({ providerId: provider.id, accessToken }).catch(() => null);
          setPerformance(nextPerformance);
        }

        if (view === "reviews") {
          const [reviewResponse, summary] = await Promise.all([
            getProviderReviews({ providerId: provider.id, accessToken }).catch(() => ({
              reviews: [],
              total: 0,
              summary: undefined
            })),
            getProviderReviewSummary({ providerId: provider.id, accessToken }).catch(() => null)
          ]);
          setReviews(reviewResponse.reviews);
          setReviewSummary(summary ?? reviewResponse.summary ?? null);
        }

        if (view === "notifications") {
          const response = await getNotifications({ userId: provider.id, accessToken }).catch(() => ({
            notifications: [],
            total: 0
          }));
          setNotifications(response.notifications);
        }

        if (view === "support") {
          const [ticketResponse, nextContacts, nextCoverage] = await Promise.all([
            listSupportTickets({ userId: provider.id, accessToken }).catch(() => ({ tickets: [], total: 0 })),
            getEmergencyContacts({ accessToken }).catch(() => []),
            getVeterinaryCoverage({ providerId: provider.id, accessToken }).catch(() => null)
          ]);
          setTickets(ticketResponse.tickets);
          setContacts(nextContacts);
          setCoverage(nextCoverage ?? null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadOperations();
  }, [accessToken, provider.id, view]);

  if (isLoading) {
    return (
      <View style={styles.loadingPanel}>
        <ActivityIndicator color="#EE7C2B" />
      </View>
    );
  }

  if (view === "profile") {
    return (
      <ProviderProfilePanel
        accessToken={accessToken}
        onProfileChange={setProfile}
        pricing={pricing}
        profile={profile}
        provider={provider}
      />
    );
  }

  if (view === "earnings") {
    return (
      <EarningsPanel
        accessToken={accessToken}
        balance={balance}
        onBalanceChange={setBalance}
        onPayoutsChange={setPayouts}
        payouts={payouts}
        providerId={provider.id}
      />
    );
  }

  if (view === "wallet") {
    return (
      <WalletPanel
        accessToken={accessToken}
        balance={balance}
        bankAccounts={bankAccounts}
        onBankAccountsChange={setBankAccounts}
        onBalanceChange={setBalance}
        onPayoutsChange={setPayouts}
        payouts={payouts}
        provider={provider}
        taxSummary={taxSummary}
        transactions={walletTransactions}
      />
    );
  }

  if (view === "documents") {
    return <DocumentsPanel documents={documents} />;
  }

  if (view === "zones") {
    return (
      <ZonesPanel
        accessToken={accessToken}
        onZonesChange={setZones}
        profile={profile}
        providerId={provider.id}
        zones={zones}
      />
    );
  }

  if (view === "metrics") {
    return <MetricsPanel performance={performance} />;
  }

  if (view === "reviews") {
    return <ReviewsPanel reviews={reviews} summary={reviewSummary} />;
  }

  if (view === "notifications") {
    return (
      <NotificationsPanel
        accessToken={accessToken}
        notifications={notifications}
        onNotificationsChange={setNotifications}
      />
    );
  }

  return (
    <SupportPanel
      accessToken={accessToken}
      contacts={contacts}
      coverage={coverage}
      onTicketsChange={setTickets}
      provider={provider}
      tickets={tickets}
    />
  );
}

function ProviderProfilePanel({
  accessToken,
  onProfileChange,
  provider,
  profile,
  pricing
}: {
  accessToken?: string | null;
  onProfileChange: (profile: ProviderProfile | null) => void;
  provider: Provider;
  profile: ProviderProfile | null;
  pricing: ProviderPricing[];
}) {
  const displayName = profile?.full_name ?? provider.full_name ?? "Proveedor NOD";
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [experienceYears, setExperienceYears] = useState(String(profile?.experience_years ?? ""));
  const [languages, setLanguages] = useState((profile?.languages ?? ["Espanol"]).join(", "));
  const [cancellationPolicy, setCancellationPolicy] = useState(profile?.cancellation_policy ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBio(profile?.bio ?? "");
    setPhone(profile?.phone ?? "");
    setExperienceYears(String(profile?.experience_years ?? ""));
    setLanguages((profile?.languages ?? ["Espanol"]).join(", "));
    setCancellationPolicy(profile?.cancellation_policy ?? "");
  }, [profile]);

  async function saveProfile() {
    setIsSaving(true);

    try {
      const parsedExperience = Number.parseInt(experienceYears, 10);
      const updatedProfile = await updateProviderProfile({
        providerId: provider.id,
        bio: bio.trim(),
        phone: phone.trim(),
        experienceYears: Number.isNaN(parsedExperience) ? null : parsedExperience,
        languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
        cancellationPolicy: cancellationPolicy.trim(),
        accessToken
      });

      onProfileChange(updatedProfile ?? {
        ...(profile ?? { id: provider.id }),
        bio: bio.trim(),
        phone: phone.trim(),
        experience_years: Number.isNaN(parsedExperience) ? null : parsedExperience,
        languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
        cancellation_policy: cancellationPolicy.trim()
      });
      Alert.alert("Perfil actualizado", "Los datos publicos quedaron guardados.");
    } catch (currentError) {
      Alert.alert("No se pudo guardar", getDashboardError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <View style={styles.detailPanel}>
        <View style={styles.profileHeader}>
          {profile?.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoFallback}>
              <Feather color="#EE7C2B" name="user" size={24} />
            </View>
          )}
          <View style={styles.profileHeaderCopy}>
            <Text style={styles.panelTitle}>{displayName}</Text>
            <Text style={styles.panelText}>{profile?.bio ?? "Perfil publico listo para completar experiencia, zonas y servicios."}</Text>
          </View>
        </View>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <Feather color="#EE7C2B" name="star" size={22} />
          <Text style={styles.dashboardCardValue}>{formatRating(profile?.rating)}</Text>
          <Text style={styles.dashboardCardLabel}>Rating publico</Text>
        </View>
        <View style={styles.dashboardCard}>
          <Feather color="#185FA5" name="check-square" size={22} />
          <Text style={styles.dashboardCardValue}>{profile?.completed_services ?? 0}</Text>
          <Text style={styles.dashboardCardLabel}>Servicios</Text>
        </View>
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Datos publicos</Text>
        <TextInput
          keyboardType={Platform.OS === "android" ? "visible-password" : "phone-pad"}
          onChangeText={setPhone}
          placeholder="Telefono de contacto"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={styles.formInput}
          value={phone}
        />
        <TextInput
          keyboardType={Platform.OS === "android" ? "visible-password" : "number-pad"}
          onChangeText={setExperienceYears}
          placeholder="Años de experiencia"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={styles.formInput}
          value={experienceYears}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setLanguages}
          placeholder="Idiomas separados por coma"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={styles.formInput}
          value={languages}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setBio}
          placeholder="Descripcion para clientes"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={[styles.formInput, styles.formTextArea]}
          textAlignVertical="top"
          value={bio}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setCancellationPolicy}
          placeholder="Politica de cancelacion"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={[styles.formInput, styles.formTextAreaSmall]}
          textAlignVertical="top"
          value={cancellationPolicy}
        />
        <ActionButton
          busy={isSaving}
          icon="save"
          label="Guardar perfil"
          onPress={() => void saveProfile()}
          variant="primary"
        />
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Detalle operacional</Text>
        <InfoRow label="Verificado" value={profile?.verified ? "Si" : "Pendiente"} />
        <InfoRow label="Resenas" value={String(profile?.review_count ?? 0)} />
        <InfoRow label="Zonas" value={String(profile?.zones?.length ?? provider.comunas?.length ?? 0)} />
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Servicios y precios</Text>
        {pricing.length === 0 ? (
          <Text style={styles.panelText}>No hay tarifas configuradas.</Text>
        ) : (
          pricing.map((item) => (
            <InfoRow
              key={`${item.service_id}-${item.duration_minutes}`}
              label={item.service_name ?? `${item.duration_minutes} min`}
              value={formatMoney(item.price, item.currency ?? "CLP")}
            />
          ))
        )}
      </View>
    </>
  );
}

function WalletPanel({
  accessToken,
  balance,
  bankAccounts,
  onBankAccountsChange,
  onBalanceChange,
  onPayoutsChange,
  payouts,
  provider,
  taxSummary,
  transactions
}: {
  accessToken?: string | null;
  balance: ProviderBalance | null;
  bankAccounts: BankAccount[];
  onBankAccountsChange: (accounts: BankAccount[]) => void;
  onBalanceChange: (balance: ProviderBalance | null) => void;
  onPayoutsChange: (payouts: ProviderPayout[]) => void;
  payouts: ProviderPayout[];
  provider: Provider;
  taxSummary: ProviderTaxSummary | null;
  transactions: WalletTransaction[];
}) {
  const defaultAccount = bankAccounts.find((account) => account.is_default) ?? bankAccounts[0] ?? null;
  const monthEarnings = transactions
    .filter((transaction) => normalizeStatus(transaction.type) === "earning")
    .reduce((total, transaction) => total + transaction.amount, 0);

  async function addPlaceholderBankAccount() {
    const account = await createProviderBankAccount({
      providerId: provider.id,
      bankName: "Banco por confirmar",
      accountType: "cuenta_corriente",
      accountNumber: "00000000",
      holderName: provider.full_name ?? `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim(),
      rut: null,
      isDefault: bankAccounts.length === 0,
      accessToken
    }).catch(() => null);

    if (!account) {
      Alert.alert("Cuenta bancaria", "No se pudo registrar la cuenta. Revisa la API de bancos.");
      return;
    }

    onBankAccountsChange([account, ...bankAccounts]);
    Alert.alert("Cuenta bancaria", "Cuenta registrada para pagos.");
  }

  return (
    <>
      <View style={styles.walletHero}>
        <View style={styles.walletHeroTop}>
          <View style={styles.walletIcon}>
            <Feather color="#ffffff" name="briefcase" size={24} />
          </View>
          <Text style={styles.walletState}>Wallet provider</Text>
        </View>
        <Text style={styles.walletBalance}>{formatMoney(balance?.available ?? 0, balance?.currency)}</Text>
        <Text style={styles.walletCaption}>Disponible para retirar</Text>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <Feather color="#185FA5" name="trending-up" size={22} />
          <Text style={styles.dashboardCardValue}>{formatMoney(monthEarnings, balance?.currency)}</Text>
          <Text style={styles.dashboardCardLabel}>Ganado en movimientos</Text>
        </View>
        <View style={styles.dashboardCard}>
          <Feather color="#854F0B" name="clock" size={22} />
          <Text style={styles.dashboardCardValue}>{formatMoney(balance?.pending ?? 0, balance?.currency)}</Text>
          <Text style={styles.dashboardCardLabel}>Pendiente de liberacion</Text>
        </View>
      </View>

      <EarningsPanel
        accessToken={accessToken}
        balance={balance}
        onBalanceChange={onBalanceChange}
        onPayoutsChange={onPayoutsChange}
        payouts={payouts}
        providerId={provider.id}
      />

      <View style={styles.detailPanel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Cuenta de retiro</Text>
          <Feather color="#EE7C2B" name="credit-card" size={18} />
        </View>
        {defaultAccount ? (
          <>
            <InfoRow label={defaultAccount.bank_name} value={defaultAccount.account_type ?? "Cuenta"} />
            <InfoRow label="Numero" value={defaultAccount.account_number_masked ?? "Registrado"} />
            <InfoRow label="Estado" value={getStatusLabel(defaultAccount.status ?? "active")} />
          </>
        ) : (
          <Text style={styles.panelText}>No hay cuenta bancaria configurada.</Text>
        )}
        <ActionButton
          busy={false}
          icon="plus"
          label={defaultAccount ? "Agregar otra cuenta" : "Agregar cuenta"}
          onPress={addPlaceholderBankAccount}
          variant="secondary"
        />
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Movimientos</Text>
        {transactions.length === 0 ? (
          <Text style={styles.panelText}>Todavia no hay movimientos en la wallet.</Text>
        ) : (
          transactions.map((transaction) => (
            <InfoRow
              key={transaction.id}
              label={transaction.description ?? getTransactionTypeLabel(transaction.type)}
              value={`${formatMoney(transaction.amount, transaction.currency ?? balance?.currency)} · ${transaction.status}`}
            />
          ))
        )}
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Resumen tributario</Text>
        {taxSummary ? (
          <>
            <InfoRow label="Periodo" value={taxSummary.period} />
            <InfoRow label="Ingresos brutos" value={formatMoney(taxSummary.gross_earnings, taxSummary.currency ?? balance?.currency)} />
            <InfoRow label="Comisiones" value={formatMoney(taxSummary.platform_fees ?? 0, taxSummary.currency ?? balance?.currency)} />
            <InfoRow label="Pagado" value={formatMoney(taxSummary.payouts_total ?? 0, taxSummary.currency ?? balance?.currency)} />
          </>
        ) : (
          <Text style={styles.panelText}>Resumen tributario pendiente.</Text>
        )}
      </View>
    </>
  );
}

function EarningsPanel({
  accessToken,
  balance,
  onBalanceChange,
  onPayoutsChange,
  payouts,
  providerId
}: {
  accessToken?: string | null;
  balance: ProviderBalance | null;
  onBalanceChange: (balance: ProviderBalance | null) => void;
  onPayoutsChange: (payouts: ProviderPayout[]) => void;
  payouts: ProviderPayout[];
  providerId: string;
}) {
  const [isRequesting, setIsRequesting] = useState(false);
  const available = balance?.available ?? 0;

  async function requestPayout() {
    if (available <= 0) {
      Alert.alert("Sin saldo disponible", "Todavia no tienes saldo disponible para retirar.");
      return;
    }

    setIsRequesting(true);

    try {
      const payout = await requestProviderPayout({
        providerId,
        amount: available,
        currency: balance?.currency ?? "CLP",
        accessToken
      });

      if (payout) {
        onPayoutsChange([payout, ...payouts]);
        onBalanceChange(balance ? { ...balance, available: 0, pending: balance.pending + available } : balance);
      }

      Alert.alert("Solicitud enviada", "El retiro quedo registrado para revision.");
    } catch (currentError) {
      Alert.alert("No se pudo solicitar el pago", getDashboardError(currentError));
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <>
      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <Feather color="#EE7C2B" name="dollar-sign" size={22} />
          <Text style={styles.dashboardCardValue}>{formatMoney(balance?.available ?? 0, balance?.currency)}</Text>
          <Text style={styles.dashboardCardLabel}>Disponible</Text>
        </View>
        <View style={styles.dashboardCard}>
          <Feather color="#185FA5" name="clock" size={22} />
          <Text style={styles.dashboardCardValue}>{formatMoney(balance?.pending ?? 0, balance?.currency)}</Text>
          <Text style={styles.dashboardCardLabel}>Pendiente</Text>
        </View>
      </View>
      <ActionButton
        busy={isRequesting}
        icon="send"
        label="Solicitar pago"
        onPress={() => void requestPayout()}
        variant="primary"
      />
      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Pagos</Text>
        {payouts.length === 0 ? (
          <Text style={styles.panelText}>Todavia no hay pagos registrados.</Text>
        ) : (
          payouts.map((payout) => (
            <InfoRow
              key={payout.id}
              label={formatEvidenceTime(payout.paid_at ?? payout.created_at ?? "")}
              value={`${formatMoney(payout.amount, balance?.currency)} · ${payout.status}`}
            />
          ))
        )}
      </View>
    </>
  );
}

function ReviewsPanel({ reviews, summary }: { reviews: ProviderReview[]; summary: ProviderReviewSummary | null }) {
  return (
    <>
      <View style={styles.opsStrip}>
        <View style={styles.opsStripItem}>
          <Text style={styles.opsStripValue}>{formatRating(summary?.rating)}</Text>
          <Text style={styles.opsStripLabel}>Promedio</Text>
        </View>
        <View style={styles.opsStripDivider} />
        <View style={styles.opsStripItem}>
          <Text style={styles.opsStripValue}>{summary?.review_count ?? reviews.length}</Text>
          <Text style={styles.opsStripLabel}>Resenas</Text>
        </View>
      </View>
      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Comentarios</Text>
        {reviews.length === 0 ? (
          <Text style={styles.panelText}>Aun no hay resenas.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <InfoRow label={review.customer_name ?? "Cliente"} value={`${formatRating(review.rating)} estrellas`} />
              {review.comment ? <Text style={styles.panelText}>{review.comment}</Text> : null}
            </View>
          ))
        )}
      </View>
    </>
  );
}

function DocumentsPanel({ documents }: { documents: ProviderDocument[] }) {
  if (documents.length === 0) {
    return <EmptyState text="No hay documentos registrados." />;
  }

  return (
    <View style={styles.detailPanel}>
      <Text style={styles.panelTitle}>Documentos</Text>
      {documents.map((document) => (
        <View key={document.id} style={styles.documentItem}>
          <View style={styles.documentIcon}>
            <Feather color="#EE7C2B" name="file-text" size={18} />
          </View>
          <View style={styles.documentCopy}>
            <Text style={styles.documentTitle}>{document.title ?? getDocumentTypeLabel(document.type)}</Text>
            <Text style={styles.documentMeta}>
              {getStatusLabel(document.status)}
              {document.expires_at ? ` · vence ${formatEvidenceTime(document.expires_at)}` : ""}
            </Text>
            {document.rejection_reason ? (
              <Text style={styles.documentWarning}>{document.rejection_reason}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function ZonesPanel({
  accessToken,
  onZonesChange,
  profile,
  providerId,
  zones
}: {
  accessToken?: string | null;
  onZonesChange: (zones: ProviderServiceZone[]) => void;
  profile: ProviderProfile | null;
  providerId: string;
  zones: ProviderServiceZone[];
}) {
  const fallbackZones = useMemo<ProviderServiceZone[]>(
    () => profile?.zones?.map((zone) => ({ comuna: zone })) ?? [],
    [profile?.zones]
  );
  const [draftZones, setDraftZones] = useState<ProviderServiceZone[]>(zones.length > 0 ? zones : fallbackZones);
  const [newComuna, setNewComuna] = useState("");
  const [comunaCatalog, setComunaCatalog] = useState<Array<{ comuna: string; region: string }>>([]);
  const [newRadius, setNewRadius] = useState("5");
  const [isSaving, setIsSaving] = useState(false);
  const persistedZoneNames = zones.map((zone) => zone.comuna).sort().join("|");
  const draftZoneNames = draftZones.filter((zone) => zone.active !== false).map((zone) => zone.comuna).sort().join("|");
  const hasZoneChanges = persistedZoneNames !== draftZoneNames;

  useEffect(() => {
    setDraftZones(zones.length > 0 ? zones : fallbackZones);
  }, [profile, zones]);

  useEffect(() => {
    void getChileanComunas(accessToken).then(setComunaCatalog).catch(() => setComunaCatalog([]));
  }, [accessToken]);

  function addZone(selectedComuna?: string) {
    const comuna = (selectedComuna ?? newComuna).trim();
    const radius = Number.parseFloat(newRadius);

    if (!comuna) {
      Alert.alert("Zona requerida", "Ingresa la comuna para agregarla a tu cobertura.");
      return;
    }

    if (draftZones.some((zone) => normalizeStatus(zone.comuna) === normalizeStatus(comuna))) {
      Alert.alert("Zona duplicada", "Esa comuna ya esta en tu cobertura.");
      return;
    }

    setDraftZones((current) => [
      ...current,
      {
        comuna,
        radius_km: Number.isNaN(radius) ? null : radius,
        active: true
      }
    ]);
    setNewComuna("");
    setNewRadius("5");
  }

  function toggleZone(index: number) {
    setDraftZones((current) =>
      current.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, active: zone.active === false } : zone)
    );
  }

  function removeZone(index: number) {
    setDraftZones((current) => current.filter((_, zoneIndex) => zoneIndex !== index));
  }

  async function saveZones() {
    setIsSaving(true);

    try {
      const savedZones = await updateProviderServiceZones({
        providerId,
        zones: draftZones,
        accessToken
      });

      onZonesChange(savedZones.length > 0 ? savedZones : draftZones);
      setDraftZones(savedZones);
      Alert.alert("Zonas confirmadas", `La API confirmó ${savedZones.length} comuna${savedZones.length === 1 ? "" : "s"} para tu cobertura.`);
    } catch (currentError) {
      Alert.alert("No se pudieron guardar", getDashboardError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <View style={styles.detailPanel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Zonas de servicio</Text>
          <Feather color="#EE7C2B" name="map-pin" size={18} />
        </View>
        {draftZones.length === 0 ? (
          <Text style={styles.panelText}>No hay zonas configuradas.</Text>
        ) : (
          draftZones.map((zone, index) => (
            <View key={`${zone.comuna}-${index}`} style={styles.zoneItem}>
              <View style={styles.zonePin}>
                <Feather color="#EE7C2B" name="map-pin" size={16} />
              </View>
              <View style={styles.zoneCopy}>
                <Text style={styles.zoneTitle}>{zone.comuna}</Text>
                <Text style={styles.zoneMeta}>
                  {zone.radius_km ? `${zone.radius_km} km de cobertura` : "Cobertura comunal"}
                  {zone.active === false ? " · pausada" : ""}
                </Text>
              </View>
              <Pressable onPress={() => toggleZone(index)} style={styles.zoneIconButton}>
                <Feather color="#EE7C2B" name={zone.active === false ? "play" : "pause"} size={14} />
              </Pressable>
              <Pressable onPress={() => removeZone(index)} style={styles.zoneIconButton}>
                <Feather color="#A32D2D" name="trash-2" size={14} />
              </Pressable>
            </View>
          ))
        )}
        <ActionButton
          busy={isSaving}
          icon="save"
          label={hasZoneChanges ? `Guardar cambios (${draftZones.filter((zone) => zone.active !== false).length})` : "Zonas guardadas"}
          onPress={() => void saveZones()}
          variant="primary"
        />
        {hasZoneChanges ? <Text style={styles.unsavedZoneText}>Tienes cambios pendientes. Presiona Guardar cambios para enviarlos a la API.</Text> : null}
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Agregar zona</Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setNewComuna}
          placeholder="Buscar comuna o región"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={styles.formInput}
          value={newComuna}
        />
        <ScrollView nestedScrollEnabled style={styles.zoneCatalogList}>
          {comunaCatalog.filter((item) => !newComuna.trim() || normalizeStatus(`${item.comuna} ${item.region}`).includes(normalizeStatus(newComuna))).slice(0, 40).map((item) => {
            const selected = draftZones.some((zone) => normalizeStatus(zone.comuna) === normalizeStatus(item.comuna));
            return <Pressable disabled={selected} key={item.comuna} onPress={() => addZone(item.comuna)} style={[styles.zoneCatalogRow, selected && styles.zoneCatalogRowSelected]}><View style={styles.zoneCopy}><Text style={styles.zoneTitle}>{item.comuna}</Text><Text style={styles.zoneMeta}>{item.region}</Text></View>{selected ? <Feather color="#367D5F" name="check-circle" size={17} /> : <Feather color="#EE7C2B" name="plus-circle" size={17} />}</Pressable>;
          })}
        </ScrollView>
        <TextInput
          keyboardType={Platform.OS === "android" ? "visible-password" : "decimal-pad"}
          onChangeText={setNewRadius}
          placeholder="Radio en km"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={styles.formInput}
          value={newRadius}
        />
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Reglas operativas</Text>
        <Detail icon="navigation" text="Las solicitudes se priorizan dentro de estas comunas." />
        <Detail icon="clock" text="La disponibilidad semanal define si se reciben reservas nuevas." />
        <Detail icon="shield" text="Los paseos activos mantienen tracking y evidencia por foto." />
      </View>
    </>
  );
}

function MetricsPanel({ performance }: { performance: ProviderPerformance | null }) {
  return (
    <>
      <View style={styles.opsStrip}>
        <View style={styles.opsStripItem}>
          <Text style={styles.opsStripValue}>{formatPercent(performance?.acceptance_rate)}</Text>
          <Text style={styles.opsStripLabel}>Aceptacion</Text>
        </View>
        <View style={styles.opsStripDivider} />
        <View style={styles.opsStripItem}>
          <Text style={styles.opsStripValue}>{formatRating(performance?.avg_rating)}</Text>
          <Text style={styles.opsStripLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <Feather color="#EE7C2B" name="check-square" size={22} />
          <Text style={styles.dashboardCardValue}>{performance?.completed ?? 0}</Text>
          <Text style={styles.dashboardCardLabel}>Finalizados</Text>
        </View>
        <View style={styles.dashboardCard}>
          <Feather color="#854F0B" name="slash" size={22} />
          <Text style={styles.dashboardCardValue}>{performance?.cancelled ?? 0}</Text>
          <Text style={styles.dashboardCardLabel}>Cancelados</Text>
        </View>
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Ingresos</Text>
        <InfoRow label="Total registrado" value={formatMoney(performance?.earnings ?? 0, "CLP")} />
        <Detail icon="trending-up" text="Mantener alta aceptacion mejora la prioridad de asignacion." />
      </View>
    </>
  );
}

function NotificationsPanel({
  accessToken,
  notifications,
  onNotificationsChange
}: {
  accessToken?: string | null;
  notifications: NotificationItem[];
  onNotificationsChange: (notifications: NotificationItem[]) => void;
}) {
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null);

  if (notifications.length === 0) {
    return <EmptyState text="No tienes notificaciones recientes." />;
  }

  async function markRead(notificationId?: string) {
    const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);
    const targetIds = notificationId ? [notificationId] : unreadIds;

    if (targetIds.length === 0) {
      return;
    }

    setBusyNotificationId(notificationId ?? "all");

    try {
      await markNotificationRead({
        notificationId,
        notificationIds: notificationId ? undefined : targetIds,
        accessToken
      });

      const readAt = new Date().toISOString();
      onNotificationsChange(
        notifications.map((notification) =>
          targetIds.includes(notification.id) ? { ...notification, read_at: notification.read_at ?? readAt } : notification
        )
      );
    } catch (currentError) {
      Alert.alert("No se pudo actualizar", getDashboardError(currentError));
    } finally {
      setBusyNotificationId(null);
    }
  }

  return (
    <View style={styles.detailPanel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>Notificaciones</Text>
        <Pressable
          disabled={busyNotificationId === "all"}
          onPress={() => void markRead()}
          style={styles.markAllButton}
        >
          <Feather color="#EE7C2B" name="check-circle" size={14} />
          <Text style={styles.markAllButtonText}>Marcar todas</Text>
        </Pressable>
      </View>
      {notifications.map((notification) => (
        <View key={notification.id} style={styles.notificationItem}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationTitleRow}>
              {!notification.read_at ? <View style={styles.unreadDot} /> : null}
              <Text style={styles.notificationTitle}>{notification.title}</Text>
            </View>
            {!notification.read_at ? (
              <Pressable
                disabled={busyNotificationId === notification.id}
                onPress={() => void markRead(notification.id)}
                style={styles.iconButtonTiny}
              >
                {busyNotificationId === notification.id ? (
                  <ActivityIndicator color="#EE7C2B" size="small" />
                ) : (
                  <Feather color="#EE7C2B" name="check" size={14} />
                )}
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.panelText}>{notification.body}</Text>
        </View>
      ))}
    </View>
  );
}

function SupportPanel({
  provider,
  contacts,
  coverage,
  onTicketsChange,
  tickets,
  accessToken
}: {
  provider: Provider;
  contacts: EmergencyContact[];
  coverage: VeterinaryCoverage | null;
  onTicketsChange: (tickets: SupportTicket[]) => void;
  tickets: SupportTicket[];
  accessToken?: string | null;
}) {
  const [creatingCategory, setCreatingCategory] = useState<string | null>(null);
  const openTickets = tickets.filter((ticket) => !["closed", "resolved", "cancelled"].includes(normalizeStatus(ticket.status)));

  async function openSupportTicket(category: SupportCategory) {
    setCreatingCategory(category.key);
    const ticket = await createSupportTicket({
      userId: provider.id,
      category: category.key,
      subject: category.subject,
      message: category.message,
      priority: category.priority,
      accessToken
    }).catch(() => null).finally(() => setCreatingCategory(null));

    if (ticket) {
      onTicketsChange([ticket, ...tickets]);
    }

    Alert.alert("Soporte", ticket ? "Ticket creado correctamente." : "No se pudo crear el ticket.");
  }

  return (
    <>
      <View style={styles.supportHero}>
        <View style={styles.supportHeroIcon}>
          <Feather color="#ffffff" name="life-buoy" size={24} />
        </View>
        <View style={styles.supportHeroCopy}>
          <Text style={styles.supportHeroTitle}>Centro de soporte</Text>
          <Text style={styles.supportHeroText}>
            {openTickets.length > 0
              ? `${openTickets.length} ticket${openTickets.length === 1 ? "" : "s"} abierto${openTickets.length === 1 ? "" : "s"}.`
              : "Sin tickets abiertos."}
          </Text>
        </View>
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Acciones rapidas</Text>
        {supportCategories.map((category) => (
          <Pressable
            disabled={creatingCategory === category.key}
            key={category.key}
            onPress={() => void openSupportTicket(category)}
            style={styles.supportAction}
          >
            <View style={styles.supportActionIcon}>
              <Feather color={category.color} name={category.icon} size={18} />
            </View>
            <View style={styles.supportActionCopy}>
              <Text style={styles.supportActionTitle}>{category.title}</Text>
              <Text style={styles.supportActionText}>{category.description}</Text>
            </View>
            {creatingCategory === category.key ? (
              <ActivityIndicator color="#EE7C2B" />
            ) : (
              <Feather color="#888780" name="chevron-right" size={18} />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.detailPanel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Cobertura veterinaria</Text>
          <Feather color={coverage?.active ? "#EE7C2B" : "#888780"} name="shield" size={18} />
        </View>
        <Text style={styles.panelText}>
          {coverage?.active
            ? `Activa por ${formatMoney(coverage.amount ?? 0, coverage.currency ?? "CLP")}.`
            : "Cobertura no disponible para este proveedor."}
        </Text>
        {coverage?.provider_name ? <InfoRow label="Proveedor" value={coverage.provider_name} /> : null}
        {coverage?.policy_number ? <InfoRow label="Poliza" value={coverage.policy_number} /> : null}
        {coverage?.emergency_phone ? <InfoRow label="Emergencia vet" value={coverage.emergency_phone} /> : null}
        <InfoRow label="Clinicas asociadas" value={String(coverage?.clinics?.length ?? 0)} />
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.panelTitle}>Contactos de emergencia</Text>
        {contacts.length === 0 ? (
          <Text style={styles.panelText}>No hay contactos configurados.</Text>
        ) : (
          contacts.map((contact) => (
            <View key={`${contact.type}-${contact.phone}`} style={styles.contactItem}>
              <View style={styles.contactAvatar}>
                <Feather color="#EE7C2B" name={getContactIcon(contact.type)} size={18} />
              </View>
              <View style={styles.contactCopy}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>{getContactTypeLabel(contact.type)} · {contact.availability ?? "Disponible segun operacion"}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
                {contact.description ? <Text style={styles.panelText}>{contact.description}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.detailPanel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Tickets</Text>
          <Text style={styles.ticketCounter}>{openTickets.length} abiertos</Text>
        </View>
        {tickets.length === 0 ? (
          <Text style={styles.panelText}>No hay tickets abiertos.</Text>
        ) : (
          tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketTopRow}>
                <Text style={styles.ticketSubject}>{ticket.subject ?? getSupportCategoryLabel(ticket.category)}</Text>
                <View style={styles.ticketStatusPill}>
                  <Text style={styles.ticketStatusText}>{getStatusLabel(ticket.status)}</Text>
                </View>
              </View>
              <Text style={styles.ticketMeta}>
                {getPriorityLabel(ticket.priority)} · {formatEvidenceTime(ticket.updated_at ?? ticket.created_at)}
              </Text>
              {ticket.message ? <Text style={styles.panelText}>{ticket.message}</Text> : null}
            </View>
          ))
        )}
      </View>
    </>
  );
}

function BookingChatPanel({
  bookingId,
  providerId,
  accessToken
}: {
  bookingId: string;
  providerId: string;
  accessToken?: string | null;
}) {
  const [chat, setChat] = useState<BookingChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const loadChat = useCallback(async () => {
    const nextChat = await getOrCreateBookingChat({ bookingId, accessToken }).catch(() => null);

    if (!nextChat) {
      return;
    }

    setChat(nextChat);
    const response = await getChatMessages({ chatId: nextChat.id, accessToken }).catch(() => ({
      messages: [],
      next_cursor: null
    }));
    setMessages(response.messages);
    const latestMessage = response.messages[response.messages.length - 1];
    await markChatRead({
      chatId: nextChat.id,
      userId: providerId,
      messageId: latestMessage?.id,
      accessToken
    }).catch(() => null);
  }, [accessToken, bookingId, providerId]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  async function sendMessage() {
    const text = draft.trim();

    if (!chat || !text) {
      return;
    }

    setIsSending(true);

    try {
      const message = await sendChatMessage({
        chatId: chat.id,
        senderId: providerId,
        text,
        accessToken
      });

      if (message) {
        setMessages((current) => [...current, message]);
      }

      setDraft("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View style={styles.detailPanel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>Chat con cliente</Text>
        <Feather color="#EE7C2B" name="message-circle" size={18} />
      </View>
      {messages.length === 0 ? (
        <Text style={styles.panelText}>Sin mensajes todavia.</Text>
      ) : (
        <View style={styles.chatList}>
          {messages.slice(-4).map((message) => (
            <View
              key={message.id}
              style={[styles.chatBubble, message.sender_id === providerId ? styles.chatBubbleOwn : styles.chatBubbleOther]}
            >
              <Text style={message.sender_id === providerId ? styles.chatTextOwn : styles.chatTextOther}>
                {message.text ?? "Adjunto"}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.chatComposer}>
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setDraft}
          placeholder="Escribe un mensaje"
          placeholderTextColor="#888780"
          showSoftInputOnFocus
          style={styles.chatInput}
          value={draft}
        />
        <Pressable disabled={isSending || !draft.trim()} onPress={() => void sendMessage()} style={styles.chatSendButton}>
          {isSending ? <ActivityIndicator color="#ffffff" /> : <Feather color="#ffffff" name="send" size={17} />}
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

function BookingDetailView({
  booking,
  actionState,
  acceptedBookingIds,
  error,
  notice,
  accessToken,
  onBack,
  onAction,
  providerId
}: {
  booking: Booking;
  actionState: { bookingId: string; action: BookingAction } | null;
  acceptedBookingIds: string[];
  error: string | null;
  notice: string | null;
  accessToken?: string | null;
  onBack: () => void;
  onAction: (booking: Booking, action: BookingAction) => Promise<void>;
  providerId: string;
}) {
  const title = booking.product_name ?? booking.service_name ?? "Paseo de perros";
  const customer = booking.customer_name ?? booking.customer_email ?? "Cliente NOD";
  const bookingId = getBookingId(booking);
  const isBusy = actionState?.bookingId === bookingId;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="none" keyboardShouldPersistTaps="handled">
        <DrillDownHeader onBack={onBack} title="Detalle de reserva" />
        <FeedbackMessages error={error} notice={notice} />

        <View style={styles.detailHero}>
          <View style={styles.detailHeroIcon}>
            <Feather color="#ffffff" name="navigation" size={26} />
          </View>
          <Text style={styles.detailHeroTitle}>{title}</Text>
          <View style={styles.detailStatusPill}>
            <Text style={styles.detailStatusText}>{getStatusLabel(booking.status)}</Text>
          </View>
        </View>

        <View style={styles.detailPanel}>
          <Detail icon="user" text={customer} />
          <Detail icon="clock" text={formatBookingTime(booking)} />
          <Detail icon="map-pin" text={booking.address ?? "Direccion por confirmar"} />
          <Detail icon="credit-card" text={formatPrice(booking)} />
          <Detail icon="hash" text={`Reserva ${bookingId ?? "sin identificador"}`} />
        </View>

        {booking.notes ? (
          <View style={styles.detailPanel}>
            <Text style={styles.panelTitle}>Notas</Text>
            <Text style={styles.panelText}>{booking.notes}</Text>
          </View>
        ) : null}

        {bookingId ? (
          <BookingChatPanel accessToken={accessToken} bookingId={bookingId} providerId={providerId} />
        ) : null}

        <View style={styles.detailPanel}>
          <Text style={styles.panelTitle}>Acciones</Text>
          {isInProgressBooking(booking) ? (
            <View style={styles.actionRow}>
              <ActionButton
                busy={isBusy && actionState?.action === "complete"}
                icon="camera"
                label="Finalizar"
                onPress={() => void onAction(booking, "complete")}
                variant="primary"
              />
            </View>
          ) : null}

          {!isInProgressBooking(booking) && isPendingBooking(booking) ? (
            <View style={styles.actionRow}>
              <ActionButton
                busy={isBusy && actionState?.action === "cancel"}
                icon="slash"
                label="Cancelar"
                onPress={() => void onAction(booking, "cancel")}
                variant="secondary"
              />
              <ActionButton
                busy={isBusy && actionState?.action === "accept"}
                icon="check"
                label="Aceptar"
                onPress={() => void onAction(booking, "accept")}
                variant="primary"
              />
            </View>
          ) : null}

          {!isInProgressBooking(booking) && isAcceptedBooking(booking, acceptedBookingIds) ? (
            <View style={styles.actionRow}>
              <ActionButton
                busy={isBusy && actionState?.action === "start"}
                icon="play"
                label="Iniciar con foto"
                onPress={() => void onAction(booking, "start")}
                variant="primary"
              />
              <ActionButton
                busy={isBusy && actionState?.action === "cancel"}
                icon="slash"
                label="Cancelar"
                onPress={() => void onAction(booking, "cancel")}
                variant="secondary"
              />
            </View>
          ) : null}

          {!isPendingBooking(booking) && !isAcceptedBooking(booking, acceptedBookingIds) && !isInProgressBooking(booking) ? (
            <Text style={styles.panelText}>Esta reserva no tiene acciones pendientes.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DrillDownHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.drillHeader}>
      <Pressable onPress={onBack} style={styles.iconButton}>
        <Feather color="#1D2330" name="arrow-left" size={18} />
      </Pressable>
      <View style={styles.drillHeaderCopy}>
        <Text style={styles.kicker}>Dashboard</Text>
        <Text style={styles.drillTitle}>{title}</Text>
      </View>
    </View>
  );
}

function AvailabilityList({ availability }: { availability: ProviderAvailabilitySlot[] }) {
  if (availability.length === 0) {
    return <EmptyState text="No hay bloques libres configurados para los proximos dias." />;
  }

  return (
    <View style={styles.availabilityList}>
      {availability.map((slot, index) => (
        <View key={slot.id ?? `${slot.starts_at ?? slot.start}-${index}`} style={styles.availabilityCard}>
          <View style={styles.availabilityIcon}>
            <Feather color="#EE7C2B" name="clock" size={18} />
          </View>
          <View style={styles.availabilityCopy}>
            <Text style={styles.availabilityTitle}>Bloque disponible</Text>
            <Text style={styles.availabilityText}>{formatAvailabilitySlot(slot)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  busy,
  variant,
  onPress
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  busy: boolean;
  variant: "primary" | "secondary";
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={[styles.actionButton, variant === "primary" ? styles.actionButtonPrimary : styles.actionButtonSecondary]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? "#ffffff" : "#1D2330"} />
      ) : (
        <>
          <Feather color={variant === "primary" ? "#ffffff" : "#1D2330"} name={icon} size={17} />
          <Text style={variant === "primary" ? styles.actionButtonPrimaryText : styles.actionButtonSecondaryText}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Feather color="#626D84" name={icon} size={15} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function FeedbackMessages({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {error ? (
        <View style={styles.feedbackError}>
          <Feather color="#A32D2D" name="alert-circle" size={18} />
          <Text style={styles.feedbackErrorText}>{error}</Text>
        </View>
      ) : null}

      {notice ? (
        <View style={styles.feedbackNotice}>
          <Feather color="#367D5F" name="check-circle" size={18} />
          <Text style={styles.feedbackNoticeText}>{notice}</Text>
        </View>
      ) : null}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Feather color="#888780" name="inbox" size={24} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function sortBookings(bookings: Booking[]) {
  return [...bookings].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function replaceBooking(bookings: Booking[], updatedBooking: Booking) {
  const updatedBookingId = getBookingId(updatedBooking);

  if (!updatedBookingId) {
    return sortBookings([updatedBooking, ...bookings]);
  }

  let didReplace = false;
  const updatedBookings = bookings.map((booking) => {
    if (getBookingId(booking) !== updatedBookingId) {
      return booking;
    }

    didReplace = true;
    return updatedBooking;
  });

  return sortBookings(didReplace ? updatedBookings : [updatedBooking, ...bookings]);
}

function mergeBooking(booking: Booking, updatedBooking: Booking | undefined, fallback: Partial<Booking>) {
  return {
    ...booking,
    ...(updatedBooking ?? {}),
    ...fallback
  };
}

function getBookingId(booking: Booking) {
  return booking.id ?? booking.booking_id ?? booking.reservation_id ?? null;
}

function getBookingKey(booking: Booking, index: number) {
  return getBookingId(booking) ?? `${booking.provider_id}-${booking.starts_at}-${index}`;
}

function getBookingsForView(view: DashboardView, bookings: Booking[], acceptedBookingIds: string[]) {
  if (view === "requests") {
    return bookings.filter(isPendingBooking);
  }

  if (view === "schedule") {
    return bookings.filter((booking) => isActiveBooking(booking, acceptedBookingIds));
  }

  if (view === "completed") {
    return bookings.filter((booking) => booking.status === "completed");
  }

  return bookings;
}

function appendRoutePoint(route: ServiceLocation[], location: ServiceLocation) {
  const lastPoint = route[route.length - 1];

  if (
    lastPoint &&
    Math.abs(lastPoint.latitude - location.latitude) < 0.00001 &&
    Math.abs(lastPoint.longitude - location.longitude) < 0.00001
  ) {
    return route;
  }

  return [...route, location];
}

function getViewTitle(view: DashboardView) {
  const titles: Record<DashboardView, string> = {
    home: "Dashboard",
    requests: "Solicitudes",
    schedule: "Agenda",
    reservations: "Reservas",
    completed: "Finalizados",
    availability: "Disponibilidad",
    earnings: "Pagos",
    wallet: "Wallet",
    profile: "Perfil",
    reviews: "Resenas",
    notifications: "Alertas",
    support: "Soporte",
    documents: "Documentos",
    zones: "Zonas",
    metrics: "Metricas"
  };

  return titles[view];
}

function getEmptyText(view: DashboardView) {
  const messages: Record<DashboardView, string> = {
    home: "No hay informacion disponible.",
    requests: "No tienes solicitudes pendientes.",
    schedule: "No hay paseos agendados o en curso.",
    reservations: "No hay reservas registradas.",
    completed: "Todavia no tienes servicios finalizados.",
    availability: "No hay bloques libres configurados para los proximos dias.",
    earnings: "No hay informacion de pagos disponible.",
    wallet: "No hay informacion de wallet disponible.",
    profile: "No hay informacion de perfil disponible.",
    reviews: "Aun no hay resenas.",
    notifications: "No tienes notificaciones recientes.",
    support: "No hay informacion de soporte disponible.",
    documents: "No hay documentos registrados.",
    zones: "No hay zonas configuradas.",
    metrics: "No hay metricas disponibles."
  };

  return messages[view];
}

function isPendingBooking(booking: Booking) {
  const status = normalizeStatus(booking.status);

  return (
    [
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
    ].includes(status) ||
    (status.includes("pending") && !status.includes("payment")) ||
    status.includes("requested") ||
    status.includes("awaiting")
  );
}

function isActiveBooking(booking: Booking, acceptedBookingIds: string[] = []) {
  const status = normalizeStatus(booking.status);
  return isAcceptedBooking(booking, acceptedBookingIds) || ["in_progress", "started"].includes(status);
}

function isAcceptedBooking(booking: Booking, acceptedBookingIds: string[]) {
  const bookingId = getBookingId(booking);
  const providerStatus = normalizeStatus(
    booking.provider_status ?? booking.provider_response_status ?? booking.acceptance_status ?? ""
  );

  if (bookingId && acceptedBookingIds.includes(bookingId)) {
    return true;
  }

  if (
    booking.accepted_by_provider === true ||
    Boolean(booking.provider_accepted_at) ||
    providerStatus === "accepted"
  ) {
    return true;
  }

  const status = normalizeStatus(booking.status);
  return status === "accepted";
}

function isInProgressBooking(booking: Booking) {
  const status = normalizeStatus(booking.status);
  return ["in_progress", "started", "paused"].includes(status) || (Boolean(booking.started_at) && !booking.completed_at);
}

function isPausedBooking(booking: Booking) {
  return normalizeStatus(booking.status) === "paused";
}

function formatBookingTime(booking: Booking) {
  const startsAt = new Date(booking.starts_at);
  const endsAt = new Date(booking.ends_at);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "Horario por confirmar";
  }

  const date = new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(startsAt);
  const start = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(startsAt);
  const end = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(endsAt);

  return `${date}, ${start} - ${end}`;
}

function formatAvailabilitySlot(slot: ProviderAvailabilitySlot) {
  const startsAt = new Date(slot.starts_at ?? slot.start ?? "");
  const endsAt = new Date(slot.ends_at ?? slot.end ?? "");

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "Horario disponible";
  }

  const date = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(startsAt);
  const start = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(startsAt);
  const end = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(endsAt);

  return `${date}, ${start} - ${end}`;
}

function formatPrice(booking: Booking) {
  if (booking.price == null) {
    return booking.payment_status ? `Pago ${booking.payment_status}` : "Precio por confirmar";
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: booking.currency ?? "CLP",
    maximumFractionDigits: 0
  }).format(booking.price);
}

function formatMoney(amount: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatRating(rating?: number | null) {
  if (typeof rating !== "number" || Number.isNaN(rating)) {
    return "0.0";
  }

  return rating.toFixed(1);
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0%";
  }

  return `${Math.round(value * (value <= 1 ? 100 : 1))}%`;
}

function formatDistance(distanceMeters?: number | null) {
  if (!distanceMeters || distanceMeters < 1) {
    return "0 m";
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function formatDuration(durationSeconds?: number | null) {
  if (!durationSeconds || durationSeconds < 1) {
    return "Duracion en curso";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours} h ${remainingMinutes} min`;
  }

  return `${Math.max(minutes, 1)} min`;
}

function estimateDurationSeconds(booking: Booking) {
  const startedAt = new Date(booking.started_at ?? "").getTime();

  if (Number.isNaN(startedAt)) {
    return null;
  }

  const endedAt = booking.completed_at ? new Date(booking.completed_at).getTime() : Date.now();

  if (Number.isNaN(endedAt) || endedAt <= startedAt) {
    return null;
  }

  return Math.round((endedAt - startedAt) / 1000);
}

function estimateDistance(route: ServiceLocation[]) {
  return route.reduce((distance, point, index) => {
    const previousPoint = route[index - 1];

    if (!previousPoint) {
      return distance;
    }

    return distance + getDistanceMeters(previousPoint, point);
  }, 0);
}

function getDistanceMeters(from: WalkCoordinate, to: WalkCoordinate) {
  const earthRadius = 6371000;
  const fromLatitude = degreesToRadians(from.latitude);
  const toLatitude = degreesToRadians(to.latitude);
  const latitudeDelta = degreesToRadians(to.latitude - from.latitude);
  const longitudeDelta = degreesToRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function getStartCoordinate(booking: Booking): WalkCoordinate | null {
  return getCoordinate(booking.start_latitude, booking.start_longitude);
}

function getCompletionCoordinate(booking: Booking): WalkCoordinate | null {
  return getCoordinate(booking.completion_latitude, booking.completion_longitude);
}

function getCoordinate(latitude?: number | null, longitude?: number | null): WalkCoordinate | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return { latitude, longitude };
}

function formatCoordinate(coordinate: WalkCoordinate) {
  return `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;
}

function getPhotoUri(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/^(https?:|file:|content:|data:)/.test(path)) {
    return path;
  }

  return null;
}

function formatEvidenceTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Registrada";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function getEvidenceLabel(type: string) {
  const labels: Record<string, string> = {
    completion: "Cierre",
    during: "Durante",
    incident: "Incidente",
    start: "Inicio"
  };

  return labels[normalizeStatus(type)] ?? "Foto";
}

function getIncidentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    dog_behavior: "Comportamiento",
    health: "Salud",
    leash: "Correa",
    location: "Ubicacion",
    provider_report: "Reporte del paseador",
    weather: "Clima"
  };

  return labels[normalizeStatus(type)] ?? "Incidente";
}

function getIncidentSeverityLabel(severity?: string | null) {
  const labels: Record<string, string> = {
    high: "Alta",
    low: "Baja",
    medium: "Media"
  };

  return labels[normalizeStatus(severity ?? "")] ?? "Severidad media";
}

function getTransactionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    adjustment: "Ajuste",
    earning: "Ingreso por servicio",
    payout: "Retiro",
    refund: "Reembolso"
  };

  return labels[normalizeStatus(type)] ?? "Movimiento";
}

function getDocumentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    background_check: "Antecedentes",
    bank_account: "Cuenta bancaria",
    identity: "Identidad",
    service_certificate: "Certificado de servicio",
    tax: "Tributario"
  };

  return labels[normalizeStatus(type)] ?? "Documento";
}

function getSupportCategoryLabel(category?: string | null) {
  const match = supportCategories.find((item) => item.key === category);
  return match?.title ?? "Ticket de soporte";
}

function getPriorityLabel(priority?: string | null) {
  const labels: Record<string, string> = {
    high: "Prioridad alta",
    low: "Prioridad baja",
    medium: "Prioridad media",
    urgent: "Urgente"
  };

  return labels[normalizeStatus(priority ?? "")] ?? "Prioridad media";
}

function getContactTypeLabel(type: string) {
  const labels: Record<string, string> = {
    operations: "Operaciones",
    support: "Soporte",
    veterinary: "Veterinaria",
    emergency: "Emergencia"
  };

  return labels[normalizeStatus(type)] ?? "Contacto";
}

function getContactIcon(type: string): keyof typeof Feather.glyphMap {
  const icons: Record<string, keyof typeof Feather.glyphMap> = {
    emergency: "alert-triangle",
    operations: "radio",
    support: "life-buoy",
    veterinary: "heart"
  };

  return icons[normalizeStatus(type)] ?? "phone";
}

function formatStartedAt(booking: Booking) {
  const startedAt = new Date(booking.started_at ?? "");

  if (Number.isNaN(startedAt.getTime())) {
    return "Ahora";
  }

  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(startedAt);
}

function shortBookingId(bookingId: string | null) {
  if (!bookingId) {
    return "NOD";
  }

  return bookingId.slice(0, 8);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    requested: "Pendiente",
    request: "Pendiente",
    created: "Pendiente",
    new: "Pendiente",
    pending_acceptance: "Por aceptar",
    pending_confirmation: "Por confirmar",
    pending_provider: "Por aceptar",
    provider_pending: "Por aceptar",
    awaiting_acceptance: "Por aceptar",
    awaiting_provider: "Por aceptar",
    booking_requested: "Solicitado",
    scheduled: "Por aceptar",
    accepted: "Aceptado",
    in_progress: "En curso",
    paused: "Pausado",
    started: "En curso",
    completed: "Finalizado",
    cancelled: "Cancelado",
    rejected: "Rechazado"
  };

  return labels[normalizeStatus(status)] ?? status;
}

function normalizeStatus(status: string) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function getServicePosition(): Promise<ServicePosition | null> {
  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
        mayShowUserSettingsDialog: true,
        timeInterval: 1000
      }),
      25000,
      "location_timeout"
    );
  } catch {
    const lastKnownPosition = await Location.getLastKnownPositionAsync({
      maxAge: 24 * 60 * 60 * 1000,
      requiredAccuracy: 10000
    });

    if (lastKnownPosition) {
      return lastKnownPosition;
    }

    if (__DEV__) {
      return {
        coords: {
          latitude: -33.44889,
          longitude: -70.66927
        }
      };
    }

    return null;
  }
}

function getDashboardError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo actualizar el dashboard.";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#FCFAF7",
    flex: 1
  },
  container: {
    padding: 20,
    paddingBottom: 36,
    paddingTop: 56
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  brandBlock: {
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0
  },
  logoMark: {
    height: 52,
    width: 36
  },
  kicker: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  providerName: {
    color: "#1D2330",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
    maxWidth: 260
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  hero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    overflow: "hidden",
    padding: 20
  },
  heroHeader: {
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
    marginHorizontal: 12,
    width: 1
  },
  feedbackError: {
    alignItems: "flex-start",
    backgroundColor: "#FCEBEB",
    borderColor: "#FCEBEB",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 12
  },
  feedbackErrorText: {
    color: "#A32D2D",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  feedbackNotice: {
    alignItems: "flex-start",
    backgroundColor: "#EAF3DE",
    borderColor: "#F5C4B3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 12
  },
  feedbackNoticeText: {
    color: "#367D5F",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 28
  },
  section: {
    marginTop: 24
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sectionTitle: {
    color: "#1D2330",
    fontSize: 18,
    fontWeight: "900"
  },
  sectionMeta: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "900"
  },
  sectionLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    paddingVertical: 4
  },
  sectionLinkText: {
    color: "#EE7C2B",
    fontSize: 13,
    fontWeight: "900"
  },
  drillHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 20
  },
  drillHeaderCopy: {
    flex: 1
  },
  drillTitle: {
    color: "#1D2330",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    padding: 20
  },
  emptyStateText: {
    color: "#626D84",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center"
  },
  activeWalkHero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    overflow: "hidden",
    padding: 20
  },
  activeWalkHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24
  },
  activeWalkIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  activeWalkPill: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  liveDot: {
    backgroundColor: "#367D5F",
    borderRadius: 999,
    height: 8,
    width: 8
  },
  activeWalkPillText: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  activeWalkTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0
  },
  activeWalkSubtitle: {
    color: "#E7E0DA",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8
  },
  activeMetricRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22
  },
  activeMetric: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    padding: 12
  },
  activeMetricLabel: {
    color: "#888780",
    fontSize: 12,
    fontWeight: "900"
  },
  activeMetricValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8
  },
  activeWalkSummary: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#F5C4B3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  activeWalkSummaryIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  activeWalkSummaryCopy: {
    flex: 1
  },
  activeWalkSummaryStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 5
  },
  activeWalkSummaryStatusText: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  activeWalkSummaryTitle: {
    color: "#1D2330",
    fontSize: 16,
    fontWeight: "900"
  },
  activeWalkSummaryMeta: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  walletHero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    gap: 8,
    padding: 20
  },
  walletHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  walletIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  walletState: {
    color: "#EAF3DE",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  walletBalance: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 12
  },
  walletCaption: {
    color: "#E7E0DA",
    fontSize: 13,
    fontWeight: "800"
  },
  bookingCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  bookingPressArea: {
    borderRadius: 8
  },
  bookingHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  bookingIcon: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  bookingCopy: {
    flex: 1
  },
  bookingTitle: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "900"
  },
  bookingMeta: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  statusPill: {
    backgroundColor: "#F1EFE8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillText: {
    color: "#626D84",
    fontSize: 11,
    fontWeight: "900"
  },
  bookingDetails: {
    gap: 8,
    marginTop: 14
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  detailText: {
    color: "#626D84",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  bookingNotes: {
    backgroundColor: "#FCFAF7",
    borderRadius: 8,
    color: "#626D84",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    padding: 10
  },
  detailButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingVertical: 4
  },
  detailButtonText: {
    color: "#EE7C2B",
    fontSize: 13,
    fontWeight: "900"
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 44,
    justifyContent: "center"
  },
  actionButtonPrimary: {
    backgroundColor: "#EE7C2B"
  },
  actionButtonSecondary: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderWidth: 1
  },
  actionButtonPrimaryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  actionButtonSecondaryText: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900"
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
  opsStrip: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 12,
    padding: 14
  },
  opsStripItem: {
    flex: 1
  },
  opsStripValue: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  opsStripLabel: {
    color: "#626D84",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center"
  },
  opsStripDivider: {
    backgroundColor: "#E7E0DA",
    height: 34,
    width: 1
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 7,
    minHeight: 74,
    justifyContent: "center",
    padding: 10
  },
  quickActionText: {
    color: "#1D2330",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  detailHero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    padding: 20
  },
  detailHeroIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    marginBottom: 18,
    width: 52
  },
  detailHeroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0
  },
  detailStatusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF3DE",
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  detailStatusText: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  detailPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 16
  },
  panelTitle: {
    color: "#1D2330",
    fontSize: 16,
    fontWeight: "900"
  },
  panelHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  panelText: {
    color: "#626D84",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  formInput: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "800",
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  formTextArea: {
    minHeight: 112
  },
  formTextAreaSmall: {
    minHeight: 84
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  profileHeaderCopy: {
    flex: 1
  },
  profilePhoto: {
    backgroundColor: "#E7E0DA",
    borderRadius: 8,
    height: 62,
    width: 62
  },
  profilePhotoFallback: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  infoRow: {
    alignItems: "center",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  infoRowLabel: {
    color: "#626D84",
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  infoRowValue: {
    color: "#1D2330",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },
  reviewItem: {
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10
  },
  incidentItem: {
    backgroundColor: "#FAEEDA",
    borderColor: "#FAEEDA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  incidentTitle: {
    color: "#854F0B",
    fontSize: 14,
    fontWeight: "900"
  },
  incidentMeta: {
    color: "#854F0B",
    fontSize: 12,
    fontWeight: "800"
  },
  documentItem: {
    alignItems: "center",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12
  },
  documentIcon: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  documentCopy: {
    flex: 1,
    gap: 3
  },
  documentTitle: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900"
  },
  documentMeta: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800"
  },
  documentWarning: {
    color: "#A32D2D",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  zoneItem: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  zonePin: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  zoneCopy: {
    flex: 1
  },
  zoneIconButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  zoneTitle: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900"
  },
  zoneMeta: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3
  },
  zoneCatalogList: { borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, maxHeight: 300 },
  zoneCatalogRow: { alignItems: "center", backgroundColor: "#ffffff", borderBottomColor: "#E7E0DA", borderBottomWidth: 1, flexDirection: "row", minHeight: 54, paddingHorizontal: 12, paddingVertical: 8 },
  zoneCatalogRowSelected: { backgroundColor: "#EAF3DE" },
  unsavedZoneText: { color: "#854F0B", fontSize: 12, fontWeight: "800", lineHeight: 17, textAlign: "center" },
  notificationItem: {
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10
  },
  notificationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  notificationTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8
  },
  notificationTitle: {
    color: "#1D2330",
    flex: 1,
    fontSize: 14,
    fontWeight: "900"
  },
  unreadDot: {
    backgroundColor: "#EE7C2B",
    borderRadius: 4,
    height: 8,
    width: 8
  },
  iconButtonTiny: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  markAllButton: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  markAllButtonText: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  supportHero: {
    alignItems: "center",
    backgroundColor: "#1D2330",
    borderRadius: 8,
    flexDirection: "row",
    gap: 14,
    padding: 18
  },
  supportHeroIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  supportHeroCopy: {
    flex: 1
  },
  supportHeroTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900"
  },
  supportHeroText: {
    color: "#E7E0DA",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  supportAction: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  supportActionIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  supportActionCopy: {
    flex: 1
  },
  supportActionTitle: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900"
  },
  supportActionText: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3
  },
  contactItem: {
    alignItems: "flex-start",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12
  },
  contactAvatar: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  contactCopy: {
    flex: 1,
    gap: 3
  },
  contactName: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900"
  },
  contactMeta: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800"
  },
  contactPhone: {
    color: "#EE7C2B",
    fontSize: 15,
    fontWeight: "900"
  },
  ticketCounter: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  ticketCard: {
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 12
  },
  ticketTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  ticketSubject: {
    color: "#1D2330",
    flex: 1,
    fontSize: 14,
    fontWeight: "900"
  },
  ticketMeta: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800"
  },
  ticketStatusPill: {
    backgroundColor: "#EAF3DE",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  ticketStatusText: {
    color: "#EE7C2B",
    fontSize: 11,
    fontWeight: "900"
  },
  chatList: {
    gap: 8
  },
  chatBubble: {
    borderRadius: 8,
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  chatBubbleOwn: {
    alignSelf: "flex-end",
    backgroundColor: "#EE7C2B"
  },
  chatBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#F1EFE8"
  },
  chatTextOwn: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  chatTextOther: {
    color: "#1D2330",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  chatComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  chatInput: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1D2330",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 44,
    paddingHorizontal: 12
  },
  chatSendButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  availabilityList: {
    gap: 12
  },
  availabilityCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  availabilityIcon: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  availabilityCopy: {
    flex: 1
  },
  availabilityTitle: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "900"
  },
  availabilityText: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "700",
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
    marginTop: 16,
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
  routeMapFrame: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  routeMapGrid: {
    backgroundColor: "#E6F1FB",
    height: 210,
    overflow: "hidden",
    position: "relative"
  },
  routeLine: {
    backgroundColor: "#EE7C2B",
    borderRadius: 999,
    height: 5,
    left: "18%",
    position: "absolute",
    top: "54%",
    transform: [{ rotate: "-18deg" }],
    width: "64%"
  },
  routeMarker: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    width: 36
  },
  routeMarkerStart: {
    backgroundColor: "#185FA5",
    left: "12%",
    top: "58%"
  },
  routeMarkerCurrent: {
    backgroundColor: "#EE7C2B",
    right: "12%",
    top: "34%"
  },
  routeDot: {
    backgroundColor: "#ffffff",
    borderColor: "#EE7C2B",
    borderRadius: 6,
    borderWidth: 3,
    height: 12,
    position: "absolute",
    width: 12
  },
  routeMapFooter: {
    padding: 12
  },
  mapFallback: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    height: 180,
    justifyContent: "center",
    padding: 20
  },
  mapFallbackText: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
    textAlign: "center"
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  photoCard: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    overflow: "hidden"
  },
  photoPreview: {
    aspectRatio: 1,
    backgroundColor: "#E7E0DA",
    width: "100%"
  },
  photoPlaceholder: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: "#E7E0DA",
    justifyContent: "center",
    width: "100%"
  },
  photoMeta: {
    padding: 10
  },
  photoLabel: {
    color: "#1D2330",
    fontSize: 13,
    fontWeight: "900"
  },
  photoTime: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  }
});
