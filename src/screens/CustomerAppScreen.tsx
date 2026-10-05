import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { ApiError } from "../api/client";
import {
  cancelCustomerBooking,
  cancelAccountDeletionRequest,
  createBooking,
  createAccountDeletionRequest,
  createCustomerPet,
  createCustomerReview,
  createCustomerSupportTicket,
  getCustomerBookings,
  getCurrentAccountDeletionRequest,
  getCustomerPets,
  getCustomerProfile,
  getCustomerServicePhotos,
  getCustomerServiceRoute,
  getCustomerWallet,
  getCustomerNotifications,
  markCustomerNotificationRead,
  searchProviders,
  updateCustomerProfile,
  type AccountDeletionRequest,
  type CustomerBenefit,
  type PaymentMethod
} from "../api/customer";
import { getChatMessages, getOrCreateBookingChat, markChatRead, sendChatMessage } from "../api/provider";
import {
  createMercadoPagoCheckout,
  createWalletTopUp,
  getBookingPayment,
  getNodWallet,
  payBookingWithNodCredits,
  type CreditPackage,
  type NodWallet
} from "../api/payments";
import { getServiceOptions, type CatalogOption } from "../api/catalog";
import { blockDiscoveryPet, createDiscoverySwipe, getDiscoveryCandidates, getPetMatches, reportDiscoveryPet, sendDiscoveryMessage, undoDiscoverySwipe } from "../api/discovery";
import type {
  Customer,
  CustomerBooking,
  CustomerProvider,
  DiscoveryCandidate,
  Pet,
  PetMatch,
  NotificationItem,
  ServiceLocation,
  ServicePhoto,
  SupportTicket,
  WalletTransaction
} from "../types/api";
import type { BookingChat, ChatMessage } from "../types/api";
import { getFriendlyError } from "../utils/errors";
import { BrandLogo } from "../components/BrandLogo";
import {
  loadLocalDiscovery,
  saveLocalDiscovery,
  type LocalDiscoveryState
} from "../storage/discovery";
import { registerPushNotifications, type PushNotificationData } from "../services/pushNotifications";
import { getDogBreeds } from "../api/pets";
import { createHostingBooking, getHostingHost, getMyHostingBookings, searchHosting, updateHostingBookingStatus, type HostingBooking, type HostingDetail, type HostingHost } from "../api/hosting";
import { createCommunitySpot, listCustomerSpots, type CommunitySpot } from "../api/spots";
import { addCommunityComment, createCommunityPost, getCommunityFeed, toggleCommunityLike, type CommunityPost } from "../api/community";
import { searchChileanAddresses, type AddressSuggestion } from "../api/location";
import { getChileanComunas } from "../api/onboarding";
import { isActiveStatus, isUpcomingStatus } from "../utils/bookingStatus";
import { normalizeBookingStatus, normalizeText } from "../utils/normalization";
import { env } from "../config/env";

type CustomerSpotUnlock = CommunitySpot & {
  photo_uri?: string | null;
};

type PetMedicalProfile = {
  pet_id: string;
  allergies?: string | null;
  birthday?: string | null;
  medications?: string | null;
  microchip?: string | null;
  notes?: string | null;
  vaccine_status?: string | null;
  vet_name?: string | null;
  vet_phone?: string | null;
  weight_kg?: string | null;
  updated_at: string;
};

type InsurancePlan = {
  id: string;
  coverage: string;
  deductible: string;
  features: string[];
  name: string;
  price: number;
};

type CustomerView =
  | "home"
  | "explore"
  | "booking"
  | "pets"
  | "pet_profile"
  | "activity"
  | "wallet"
  | "benefits"
  | "support"
  | "profile"
  | "spots"
  | "insurance"
  | "safety"
  | "dog_match"
  | "residential"
  | "notifications";

const insurancePlans: InsurancePlan[] = [
  {
    id: "essential",
    coverage: "Urgencias y consultas",
    deductible: "Bajo",
    features: ["Consulta veterinaria", "Urgencias", "Teleorientacion"],
    name: "NOD Salud Esencial",
    price: 6990
  },
  {
    id: "plus",
    coverage: "Urgencias, examenes y vacunas",
    deductible: "Medio",
    features: ["Examenes basicos", "Vacunas anuales", "Red veterinaria"],
    name: "NOD Salud Plus",
    price: 12990
  },
  {
    id: "full",
    coverage: "Cobertura extendida",
    deductible: "Preferente",
    features: ["Hospitalizacion", "Cirugias", "Medicamentos seleccionados"],
    name: "NOD Salud Full",
    price: 22990
  }
];
type Props = {
  accessToken?: string | null;
  customer: Customer;
  onLogout: () => void;
  pushIntent?: { id: number; data: PushNotificationData } | null;
  onPushIntentHandled?: () => void;
};

type PendingCheckout =
  | { kind: "booking"; bookingId: string }
  | { kind: "topup"; previousCredits: number };

export function CustomerAppScreen({ accessToken, customer, onLogout, pushIntent, onPushIntentHandled }: Props) {
  const [activeView, setActiveView] = useState<CustomerView>("home");
  const [profile, setProfile] = useState<Customer>(customer);
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [services, setServices] = useState<CatalogOption[]>([]);
  const [providers, setProviders] = useState<CustomerProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CustomerProvider | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [benefits, setBenefits] = useState<CustomerBenefit[]>([]);
  const [nodWallet, setNodWallet] = useState<NodWallet>({ available_credits: 0, pending_credits: 0, currency: "CLP" });
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [spotUnlocks, setSpotUnlocks] = useState<CustomerSpotUnlock[]>([]);
  const [petMedicalProfiles, setPetMedicalProfiles] = useState<PetMedicalProfile[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  useEffect(() => {
    void registerPushNotifications({ userId: customer.id, role: "customer", accessToken }).catch(() => null);
  }, [accessToken, customer.id]);

  useEffect(() => {
    if (!pushIntent) return;
    setActiveView(getCustomerViewFromPush(pushIntent.data));
    onPushIntentHandled?.();
  }, [onPushIntentHandled, pushIntent]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customerName = getCustomerDisplayName(profile);
  const nextBooking = useMemo(() => bookings.filter(isUpcomingBooking)[0] ?? null, [bookings]);
  const activeBooking = useMemo(() => bookings.find(isActiveBooking) ?? null, [bookings]);

  const loadHome = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const [nextProfile, nextPets, nextBookings, nextServices, wallet, notificationResponse] = await Promise.all([
        getCustomerProfile({ customerId: customer.id, accessToken }).catch(() => customer),
        getCustomerPets({ customerId: customer.id, accessToken }).catch(() => []),
        getCustomerBookings({ customerId: customer.id, accessToken }).catch(() => []),
        getServiceOptions().catch(() => []),
        getCustomerWallet({ customerId: customer.id, accessToken }).catch(() => ({
          transactions: [],
          payment_methods: [],
          benefits: []
        })),
        getCustomerNotifications(accessToken).catch(() => ({ notifications: [], total: 0 }))
      ]);

      const localProfile = await loadCustomerProfileOverride(customer.id);
      setProfile({ ...(nextProfile ?? customer), ...(localProfile ?? {}) });
      setPets(nextPets);
      setBookings(sortBookings(nextBookings));
      setServices(nextServices);
      setWalletTransactions(wallet.transactions ?? []);
      setPaymentMethods(wallet.payment_methods ?? []);
      setBenefits(wallet.benefits ?? []);
      setNotifications(notificationResponse.notifications);
    } catch (currentError) {
      setError(getCustomerError(currentError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, customer]);

  useEffect(() => {
    void loadHome(true);
  }, [loadHome]);

  const loadNodWallet = useCallback(async () => {
    if (!env.mercadoPagoEnabled) return;
    const summary = await getNodWallet(accessToken).catch(() => null);
    if (summary) {
      setNodWallet(summary.wallet);
      setCreditPackages(summary.packages);
      setWalletTransactions(summary.transactions);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadNodWallet();
  }, [loadNodWallet]);

  const confirmMercadoPagoReturn = useCallback(async (url: string) => {
    if (!url.startsWith("nod://payments/")) return;

    if (url.includes("/failure")) {
      setNotice(null);
      setPendingCheckout(null);
      Alert.alert("Pago no completado", "Mercado Pago informó que el pago no pudo completarse.");
      return;
    }

    setNotice("Confirmando tu pago con el banco…");
    const currentCheckout = pendingCheckout;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        if (currentCheckout?.kind === "booking") {
          const payment = await getBookingPayment({ accessToken, bookingId: currentCheckout.bookingId });
          if (payment.status.toLowerCase() === "paid") {
            await loadHome();
            setBookings((current) => current.map((booking) => getBookingId(booking) === currentCheckout.bookingId ? { ...booking, payment_status: "paid", payment_method: payment.method ?? "mercadopago" } : booking));
            setSelectedBooking((current) => current && getBookingId(current) === currentCheckout.bookingId ? { ...current, payment_status: "paid", payment_method: payment.method ?? "mercadopago" } : current);
            setNotice("Pago confirmado correctamente.");
            setPendingCheckout(null);
            return;
          }
        } else {
          const summary = await getNodWallet(accessToken);
          setNodWallet(summary.wallet);
          setCreditPackages(summary.packages);
          setWalletTransactions(summary.transactions);
          if (currentCheckout?.kind === "topup" && summary.wallet.available_credits > currentCheckout.previousCredits) {
            setNotice("Créditos acreditados correctamente.");
            setPendingCheckout(null);
            return;
          }
        }
      } catch {
        // El webhook puede seguir procesando el pago; se reintenta brevemente.
      }
      await wait(2000);
    }

    setNotice("Tu pago sigue pendiente de confirmación. Actualiza esta pantalla en unos instantes.");
    setPendingCheckout(null);
  }, [accessToken, loadHome, pendingCheckout]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => void confirmMercadoPagoReturn(url));
    return () => subscription.remove();
  }, [confirmMercadoPagoReturn]);

  useEffect(() => {
    void listCustomerSpots({ customerId: customer.id, accessToken }).then((items) => setSpotUnlocks(items.map((spot) => ({ ...spot, photo_uri: spot.photo_url })))).catch(() => loadSpotUnlocks(customer.id).then(setSpotUnlocks));
  }, [accessToken, customer.id]);

  useEffect(() => {
    void loadPetMedicalProfiles(customer.id).then(setPetMedicalProfiles);
  }, [customer.id]);

  async function loadProviders(serviceId?: string | null, comunaOverride?: string, locationOverride?: { latitude: number; longitude: number }) {
    setError(null);
    const response = await searchProviders({
      serviceId,
      comuna: comunaOverride ?? profile.comuna ?? profile.city ?? undefined,
      accessToken
    }).catch((currentError) => {
      setError(getCustomerError(currentError));
      return { providers: [], total: 0 };
    });
    let customerCoordinates = locationOverride ?? null;
    if (!customerCoordinates) try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) customerCoordinates = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
    } catch { customerCoordinates = null; }
    const rankedProviders = response.providers.map((provider) => ({
      ...provider,
      distance_km: customerCoordinates && provider.latitude != null && provider.longitude != null
        ? getDistanceKm(customerCoordinates.latitude, customerCoordinates.longitude, provider.latitude, provider.longitude)
        : null
    })).sort((left, right) => {
      const ratingDifference = (right.rating ?? 0) - (left.rating ?? 0);
      if (Math.abs(ratingDifference) >= 0.5) return ratingDifference;
      return (left.distance_km ?? Number.MAX_SAFE_INTEGER) - (right.distance_km ?? Number.MAX_SAFE_INTEGER);
    });
    setProviders(rankedProviders);
    setActiveView("explore");
  }

  function openBooking(booking: CustomerBooking) {
    setSelectedBooking(booking);
    setActiveView("activity");
  }

  function openProvider(provider: CustomerProvider) {
    setSelectedProvider(provider);
    setActiveView("booking");
  }

  async function handleBookingCreated(booking: CustomerBooking) {
    setBookings((current) => sortBookings([booking, ...current]));
    setSelectedProvider(null);
    setNotice("Reserva enviada al proveedor.");
    setActiveView("activity");
  }

  async function cancelBooking(booking: CustomerBooking, refundDestination?: RefundDestination) {
    const bookingId = getBookingId(booking);

    if (!bookingId) {
      return;
    }

    const updatedBooking = await cancelCustomerBooking({
      bookingId,
      customerId: customer.id,
      reason: "Cancelado por cliente desde app",
      refundDestination,
      accessToken
    }).catch((currentError) => {
      Alert.alert("No se pudo cancelar", getCustomerError(currentError));
      return null;
    });

    if (updatedBooking) {
      setBookings((current) => replaceBooking(current, { ...booking, ...updatedBooking, status: "cancelled" }));
      setSelectedBooking((current) => current && getBookingId(current) === bookingId ? { ...current, status: "cancelled" } : current);
    }
  }

  function renderContent() {
    if (isLoading) {
      return <LoadingBlock />;
    }

    if (selectedBooking && activeView === "activity") {
      return (
        <BookingTrackingView
          accessToken={accessToken}
          booking={selectedBooking}
          customerId={customer.id}
          nodWallet={nodWallet}
          onBack={() => setSelectedBooking(null)}
          onCancel={cancelBooking}
          onCheckoutStarted={(bookingId) => setPendingCheckout({ kind: "booking", bookingId })}
          onWalletChanged={loadNodWallet}
        />
      );
    }

    if (activeView === "explore") {
      return <ExploreView customer={profile} onOpenProvider={openProvider} providers={providers} services={services} onSearch={loadProviders} />;
    }

    if (activeView === "booking" && selectedProvider) {
      return (
        <CreateBookingView
          accessToken={accessToken}
          customer={profile}
          onBack={() => setActiveView("explore")}
          onCreated={handleBookingCreated}
          pets={pets}
          provider={selectedProvider}
          services={services}
        />
      );
    }

    if (activeView === "pets") {
      return (
        <PetsView
          accessToken={accessToken}
          customerId={customer.id}
          medicalProfiles={petMedicalProfiles}
          onOpenPet={(pet) => {
            setSelectedPet(pet);
            setActiveView("pet_profile");
          }}
          onPetsChange={setPets}
          pets={pets}
        />
      );
    }

    if (activeView === "pet_profile" && selectedPet) {
      return (
        <PetProfileView
          bookings={bookings}
          customerId={customer.id}
          medicalProfile={petMedicalProfiles.find((profileItem) => profileItem.pet_id === selectedPet.id)}
          onBack={() => {
            setSelectedPet(null);
            setActiveView("pets");
          }}
          onInsurance={() => setActiveView("insurance")}
          onSave={setPetMedicalProfiles}
          pet={selectedPet}
          spots={spotUnlocks.filter((spot) => spot.pet_id === selectedPet.id || spot.pet_name === selectedPet.name)}
        />
      );
    }

    if (activeView === "activity") {
      return <ActivityView bookings={bookings} onOpenBooking={openBooking} />;
    }

    if (activeView === "wallet") {
      return <CustomerWalletView accessToken={accessToken} benefits={benefits} creditPackages={creditPackages} onCheckoutStarted={() => setPendingCheckout({ kind: "topup", previousCredits: nodWallet.available_credits })} paymentMethods={paymentMethods} transactions={walletTransactions} wallet={nodWallet} />;
    }

    if (activeView === "benefits") {
      return <BenefitsView benefits={benefits} />;
    }

    if (activeView === "insurance") {
      return (
        <InsuranceView
          medicalProfiles={petMedicalProfiles}
          onOpenPet={(pet) => {
            setSelectedPet(pet);
            setActiveView("pet_profile");
          }}
          pets={pets}
          plans={insurancePlans}
        />
      );
    }

    if (activeView === "support") {
      return (
        <CustomerSupportView
          accessToken={accessToken}
          customerId={customer.id}
          onTicketsChange={setTickets}
          tickets={tickets}
        />
      );
    }

    if (activeView === "spots") {
      return (
        <SpotUnlocksView
          accessToken={accessToken}
          customerId={customer.id}
          onChange={setSpotUnlocks}
          pets={pets}
          spots={spotUnlocks}
        />
      );
    }

    if (activeView === "dog_match") {
      return <DogMatchView accessToken={accessToken} customerId={customer.id} pets={pets} />;
    }

    if (activeView === "residential") {
      return <ResidentialView accessToken={accessToken} customer={profile} onCreated={async (booking) => { await handleBookingCreated(booking); setSelectedBooking(booking); }} onSupport={() => setActiveView("support")} pets={pets} />;
    }

    if (activeView === "safety") {
      return <SafetyCenterView accessToken={accessToken} activeBooking={activeBooking} customerId={customer.id} onOpenBooking={openBooking} onSupport={() => setActiveView("support")} />;
    }

    if (activeView === "profile") {
      return <CustomerProfileView accessToken={accessToken} customer={profile} onChange={setProfile} pets={pets} spots={spotUnlocks} />;
    }

    if (activeView === "notifications") {
      return <View style={styles.notificationList}>
        {notifications.length ? notifications.map((item) => <Pressable
          key={item.id}
          onPress={() => {
            if (item.read_at) return;
            void markCustomerNotificationRead(item.id, accessToken).then(() => {
              setNotifications((current) => current.map((notification) => notification.id === item.id
                ? { ...notification, read_at: new Date().toISOString() }
                : notification));
            }).catch(() => null);
          }}
          style={[styles.notificationCard, !item.read_at && styles.notificationUnread]}
        >
          <View style={styles.notificationHeading}><Text style={styles.notificationTitle}>{item.title}</Text>{!item.read_at ? <View style={styles.notificationDot} /> : null}</View>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationDate}>{formatShortDate(item.created_at)}</Text>
        </Pressable>) : <Text style={styles.emptyText}>No tienes notificaciones.</Text>}
      </View>;
    }

    return (
      <HomeView
        activeBooking={activeBooking}
        bookings={bookings}
        customerName={customerName}
        error={error}
        nextBooking={nextBooking}
        notice={notice}
        onOpenBooking={openBooking}
        onSearch={loadProviders}
        onViewChange={setActiveView}
        petMedicalProfiles={petMedicalProfiles}
        pets={pets}
        services={services}
        spots={spotUnlocks}
        transactions={walletTransactions}
      />
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void Promise.all([loadHome(), loadNodWallet()])} />}
      >
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <BrandLogo size="small" />
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.title}>{customerName}</Text>
          </View>
          <Pressable accessibilityLabel="Notificaciones" onPress={() => setActiveView("notifications")} style={styles.iconButton}>
            <Feather color="#626D84" name="bell" size={18} />
            {notifications.some((item) => !item.read_at) ? <View style={styles.topBarNotificationDot} /> : null}
          </Pressable>
          <Pressable onPress={onLogout} style={styles.iconButton}>
            <Feather color="#626D84" name="log-out" size={18} />
          </Pressable>
        </View>

        {activeView !== "home" ? (
          <View style={styles.subHeader}>
            <Pressable onPress={() => {
              setSelectedBooking(null);
              setSelectedProvider(null);
              setSelectedPet(null);
              setActiveView("home");
            }} style={styles.iconButton}>
              <Feather color="#1D2330" name="arrow-left" size={18} />
            </Pressable>
            <Text style={styles.subHeaderTitle}>{getViewTitle(activeView)}</Text>
          </View>
        ) : null}

        {activeView !== "home" && notice ? <Feedback error={null} notice={notice} /> : null}

        {renderContent()}
      </ScrollView>
      <View style={styles.bottomNav}>
        {([
          ["home", "home", "Inicio"],
          ["explore", "search", "Servicios"],
          ["dog_match", "heart", "Matches"],
          ["activity", "calendar", "Reservas"],
          ["profile", "user", "Perfil"]
        ] as Array<[CustomerView, keyof typeof Feather.glyphMap, string]>).map(([view, icon, label]) => {
          const selected = activeView === view;
          return (
            <Pressable key={view} onPress={() => { setSelectedBooking(null); setSelectedProvider(null); setSelectedPet(null); setActiveView(view); }} style={styles.bottomNavItem}>
              <Feather color={selected ? "#EE7C2B" : "#626D84"} name={icon} size={20} />
              <Text style={[styles.bottomNavText, selected && styles.bottomNavTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </KeyboardAvoidingView>
  );
}

function getCustomerViewFromPush(data: PushNotificationData): CustomerView {
  const target = [data.screen, data.route, data.type, data.event, data.kind]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/match|dating|chat|message/.test(target)) return "dog_match";
  if (/hosting|residential|boarding|hospedaje/.test(target)) return "residential";
  if (/booking|reservation|walk|service|tracking/.test(target)) return "activity";
  if (/wallet|payment|payout/.test(target)) return "wallet";
  if (/insurance/.test(target)) return "insurance";
  if (/pet/.test(target)) return "pets";
  if (/profile/.test(target)) return "profile";
  return "home";
}

function HomeView({
  activeBooking,
  bookings,
  customerName,
  error,
  nextBooking,
  notice,
  onOpenBooking,
  onSearch,
  onViewChange,
  petMedicalProfiles,
  pets,
  services,
  spots,
  transactions
}: {
  activeBooking: CustomerBooking | null;
  bookings: CustomerBooking[];
  customerName: string;
  error: string | null;
  nextBooking: CustomerBooking | null;
  notice: string | null;
  onOpenBooking: (booking: CustomerBooking) => void;
  onSearch: (serviceId?: string | null) => Promise<void>;
  onViewChange: (view: CustomerView) => void;
  petMedicalProfiles: PetMedicalProfile[];
  pets: Pet[];
  services: CatalogOption[];
  spots: CustomerSpotUnlock[];
  transactions: WalletTransaction[];
}) {
  const upcomingCount = bookings.filter(isUpcomingBooking).length;
  const completedCount = bookings.filter((booking) => normalizeStatus(booking.status) === "completed").length;
  const spent = transactions.reduce((total, transaction) => total + Math.abs(transaction.amount ?? 0), 0);

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Feather color="#ffffff" name="map-pin" size={28} />
        </View>
        <Text style={styles.heroTitle}>Paseos, citas y alojamiento para mascotas</Text>
        <Text style={styles.heroText}>{customerName}, reserva, sigue el servicio y revisa evidencias desde un solo lugar.</Text>
        <Pressable onPress={() => void onSearch(services[0]?.value)} style={[styles.primaryButton, styles.heroPrimaryButton]}>
          <Feather color="#ffffff" name="search" size={18} />
          <Text style={styles.primaryButtonText}>Buscar paseador</Text>
        </Pressable>
        <View style={styles.heroSecondaryRow}>
          <Pressable onPress={() => onViewChange("dog_match")} style={styles.heroSecondaryButton}>
            <Feather color="#ffffff" name="heart" size={18} />
            <Text style={styles.heroSecondaryButtonText}>Pet date</Text>
          </Pressable>
          <Pressable onPress={() => onViewChange("residential")} style={styles.heroSecondaryButton}>
            <Feather color="#ffffff" name="moon" size={18} />
            <Text style={styles.heroSecondaryButtonText}>Alojamiento</Text>
          </Pressable>
        </View>
      </View>

      <Feedback error={error} notice={notice} />

      {activeBooking ? (
        <Pressable onPress={() => onOpenBooking(activeBooking)} style={styles.liveCard}>
          <View style={styles.liveDot} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Paseo en curso</Text>
            <Text style={styles.cardText}>{activeBooking.provider_name ?? "Paseador asignado"} · {formatBookingTime(activeBooking)}</Text>
          </View>
          <Feather color="#EE7C2B" name="chevron-right" size={20} />
        </Pressable>
      ) : null}

      <View style={styles.grid}>
        <MetricCard icon="heart" label="Mascotas" value={String(pets.length)} onPress={() => onViewChange("pets")} />
        <MetricCard icon="calendar" label="Proximas" value={String(upcomingCount)} onPress={() => onViewChange("activity")} />
        <MetricCard icon="check-circle" label="Hechos" value={String(completedCount)} onPress={() => onViewChange("activity")} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Resumen</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="navigation" label="Estado" value={activeBooking ? "Paseo activo" : "Sin paseo activo"} />
          <SummaryItem icon="credit-card" label="Pagado" value={spent ? formatMoney(spent) : "Sin movimientos"} />
          <SummaryItem icon="map-pin" label="Spots" value={`${spots.length} unlocked`} />
          <SummaryItem icon="clipboard" label="Fichas" value={`${petMedicalProfiles.length}/${pets.length}`} />
        </View>
      </View>

      <View style={styles.quickGrid}>
        <QuickAction icon="search" label="Explorar" onPress={() => void onSearch(services[0]?.value)} />
        <QuickAction icon="heart" label="Mascotas" onPress={() => onViewChange("pets")} />
        <QuickAction icon="zap" label="Conecta mascotas" onPress={() => onViewChange("dog_match")} />
        <QuickAction icon="moon" label="Residencial" onPress={() => onViewChange("residential")} />
        <QuickAction icon="clock" label="Actividad" onPress={() => onViewChange("activity")} />
        <QuickAction icon="credit-card" label="Wallet" onPress={() => onViewChange("wallet")} />
        <QuickAction icon="shield" label="Seguros" onPress={() => onViewChange("insurance")} />
        <QuickAction icon="alert-triangle" label="Seguridad" onPress={() => onViewChange("safety")} />
        <QuickAction icon="gift" label="Beneficios" onPress={() => onViewChange("benefits")} />
        <QuickAction icon="map-pin" label="Spot unlocked" onPress={() => onViewChange("spots")} />
        <QuickAction icon="life-buoy" label="Soporte" onPress={() => onViewChange("support")} />
        <QuickAction icon="user" label="Perfil" onPress={() => onViewChange("profile")} />
      </View>

      {spots[0] ? (
        <Pressable onPress={() => onViewChange("spots")} style={styles.spotFeatured}>
          {spots[0].photo_uri ? <Image source={{ uri: spots[0].photo_uri }} style={styles.spotFeaturedImage} /> : null}
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Ultimo spot unlocked</Text>
            <Text style={styles.cardText}>{spots[0].title} · {spots[0].pet_name ?? "Mascota"}</Text>
          </View>
          <Feather color="#EE7C2B" name="chevron-right" size={20} />
        </Pressable>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Proxima reserva</Text>
        {nextBooking ? (
          <BookingRow booking={nextBooking} onPress={() => onOpenBooking(nextBooking)} />
        ) : (
          <Text style={styles.panelText}>No tienes reservas próximas.</Text>
        )}
      </View>
    </>
  );
}

function ExploreView({
  customer,
  providers,
  services,
  onOpenProvider,
  onSearch
}: {
  customer: Customer;
  providers: CustomerProvider[];
  services: CatalogOption[];
  onOpenProvider: (provider: CustomerProvider) => void;
  onSearch: (serviceId?: string | null, comuna?: string, location?: { latitude: number; longitude: number }) => Promise<void>;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.value ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [comuna, setComuna] = useState(customer.comuna ?? customer.city ?? "");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [skipSearch, setSkipSearch] = useState(true);

  useEffect(() => { void locateAndSearch(); }, []);

  useEffect(() => {
    if (skipSearch) { setSkipSearch(false); return; }
    const timer = setTimeout(() => {
      if (address.trim().length < 3) return setSuggestions([]);
      void searchChileanAddresses(address).then(setSuggestions).catch(() => setSuggestions([]));
    }, 450);
    return () => clearTimeout(timer);
  }, [address]);

  async function runSearch(nextService = selectedServiceId, nextComuna = comuna, nextLocation = location) {
    setIsSearching(true);
    try { await onSearch(nextService, nextComuna, nextLocation ?? undefined); }
    finally { setIsSearching(false); }
  }

  async function locateAndSearch() {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const place = (await Location.reverseGeocodeAsync(point))[0];
      const nextComuna = place?.district ?? place?.subregion ?? place?.city ?? comuna;
      const nextAddress = [place?.street ?? place?.name, place?.streetNumber].filter(Boolean).join(" ") || address;
      setSkipSearch(true); setLocation(point); setComuna(nextComuna); setAddress(nextAddress);
      await runSearch(selectedServiceId, nextComuna, point);
    } catch { await runSearch(selectedServiceId, comuna, null); }
    finally { setIsLocating(false); }
  }

  async function chooseAddress(suggestion: AddressSuggestion) {
    const point = suggestion.latitude != null && suggestion.longitude != null ? { latitude: suggestion.latitude, longitude: suggestion.longitude } : null;
    setSkipSearch(true); setAddress(suggestion.address); setComuna(suggestion.comuna); setLocation(point); setSuggestions([]);
    await runSearch(selectedServiceId, suggestion.comuna, point);
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>¿Dónde necesitas el servicio?</Text>
        <TextInput autoCorrect={false} onChangeText={(value) => { setAddress(value); setLocation(null); }} placeholder="Buscar dirección" showSoftInputOnFocus style={styles.input} value={address} />
        {suggestions.length ? <View style={styles.bookingAddressSuggestions}>{suggestions.map((suggestion) => <Pressable key={suggestion.id} onPress={() => void chooseAddress(suggestion)} style={styles.bookingAddressSuggestion}><Feather color="#EE7C2B" name="map-pin" size={17} /><Text style={styles.bookingAddressSuggestionText}>{suggestion.label}</Text></Pressable>)}</View> : null}
        <Pressable disabled={isLocating} onPress={() => void locateAndSearch()} style={styles.currentLocationButton}>{isLocating ? <ActivityIndicator color="#367D5F" size="small" /> : <Feather color="#367D5F" name="crosshair" size={17} />}<Text style={styles.currentLocationButtonText}>{isLocating ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}</Text></Pressable>
        {location ? <View style={styles.bookingMapWrap}><WebView javaScriptEnabled source={{ uri: getEmbeddedMapUrl(location.latitude, location.longitude) }} style={styles.bookingMap} /></View> : null}
        <Text style={styles.bookingLocationCaption}>{comuna ? `Buscando cobertura en ${comuna}` : "Selecciona una dirección para buscar cobertura."}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Servicio</Text>
        <View style={styles.chipRow}>
          {services.slice(0, 6).map((service) => (
            <Pressable
              key={service.value}
              onPress={() => {
                setSelectedServiceId(service.value);
                void runSearch(service.value);
              }}
              style={[styles.chip, selectedServiceId === service.value && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selectedServiceId === service.value && styles.chipTextSelected]}>{service.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.rankingHeader}><Text style={styles.panelTitle}>Ranking en tu zona</Text><Text style={styles.rankingCount}>{providers.length} disponibles</Text></View>
      {isSearching ? <LoadingBlock /> : providers.length === 0 ? (
        <EmptyState text="No hay paseadores disponibles con estos filtros." />
      ) : (
        providers.map((provider, index) => <ProviderCard key={provider.id} onPress={() => onOpenProvider(provider)} provider={provider} rank={index + 1} />)
      )}
    </>
  );
}

const demoDiscoveryCandidates: DiscoveryCandidate[] = [
  {
    pet_id: "demo-luna",
    display_name: "Luna",
    age_months: 30,
    species: "dog",
    breed: "Border Collie",
    sex: "female",
    size: "medium",
    bio: "Fanática de correr, buscar la pelota y conocer parques nuevos.",
    distance_km: 1.8,
    comuna: "Providencia",
    temperament_tags: ["Sociable", "Activa", "Juguetona"],
    looking_for: ["playdate", "walk"],
    compatibility_score: 0.94
  },
  {
    pet_id: "demo-bruno",
    display_name: "Bruno",
    age_months: 48,
    species: "dog",
    breed: "Golden Retriever",
    sex: "male",
    size: "large",
    bio: "Tranquilo, regalón y siempre listo para un paseo acompañado.",
    distance_km: 3.2,
    comuna: "Ñuñoa",
    temperament_tags: ["Amistoso", "Tranquilo", "Cariñoso"],
    looking_for: ["walk"],
    compatibility_score: 0.88
  },
  {
    pet_id: "demo-kira",
    display_name: "Kira",
    age_months: 20,
    species: "dog",
    breed: "Mestiza",
    sex: "female",
    size: "small",
    bio: "Pequeña exploradora. Le encantan las mascotas pacientes y las plazas.",
    distance_km: 4.6,
    comuna: "Santiago",
    temperament_tags: ["Curiosa", "Dulce", "Energética"],
    looking_for: ["playdate", "walk"],
    compatibility_score: 0.82
  }
];

function DogMatchView({ accessToken, customerId, pets }: { accessToken?: string | null; customerId: string; pets: Pet[] }) {
  const dogPets = pets.filter((pet) => !pet.species || ["dog", "perro", "canino"].includes(pet.species.toLowerCase()));
  const [selectedPetId, setSelectedPetId] = useState(dogPets[0]?.id ?? pets[0]?.id ?? "");
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [matches, setMatches] = useState<PetMatch[]>([]);
  const [mode, setMode] = useState<"discover" | "matches">("discover");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [lastCandidate, setLastCandidate] = useState<DiscoveryCandidate | null>(null);
  const [localDiscovery, setLocalDiscovery] = useState<LocalDiscoveryState | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const cardTranslateX = useRef(new Animated.Value(0)).current;

  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? dogPets[0] ?? pets[0];
  const candidate = candidates.find((item) =>
    (sizeFilter === "all" || item.size === sizeFilter) &&
    (item.distance_km === null || item.distance_km === undefined || item.distance_km <= maxDistance)
  );
  const cardRotation = cardTranslateX.interpolate({ inputRange: [-180, 0, 180], outputRange: ["-8deg", "0deg", "8deg"] });
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: Animated.event([null, { dx: cardTranslateX }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 85) {
        Animated.timing(cardTranslateX, { duration: 160, toValue: 600, useNativeDriver: false }).start(() => {
          cardTranslateX.setValue(0);
          void swipe("like");
        });
      } else if (gesture.dx < -85) {
        Animated.timing(cardTranslateX, { duration: 160, toValue: -600, useNativeDriver: false }).start(() => {
          cardTranslateX.setValue(0);
          void swipe("pass");
        });
      } else {
        Animated.spring(cardTranslateX, { friction: 7, toValue: 0, useNativeDriver: false }).start();
      }
    }
  }), [cardTranslateX, candidate?.pet_id]);

  const loadDiscovery = useCallback(async () => {
    if (!selectedPet?.id) {
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const stored = await loadLocalDiscovery(customerId, selectedPet.id);
      setLocalDiscovery(stored);
      setSizeFilter(stored.preferences.size);
      setMaxDistance(stored.preferences.maxDistance);
      const [feed, matchList] = await Promise.all([
        getDiscoveryCandidates({ petId: selectedPet.id, customerId, accessToken }),
        getPetMatches({ petId: selectedPet.id, customerId, accessToken })
      ]);
      setCandidates(feed.candidates.filter((item) => !stored.blockedPetIds.includes(item.pet_id)));
      setMatches(matchList.matches);
      setIsDemo(false);
    } catch {
      const stored = await loadLocalDiscovery(customerId, selectedPet.id);
      const hiddenIds = new Set([...stored.blockedPetIds, ...stored.swipes.map((item) => item.candidate.pet_id)]);
      setLocalDiscovery(stored);
      setSizeFilter(stored.preferences.size);
      setMaxDistance(stored.preferences.maxDistance);
      setCandidates(demoDiscoveryCandidates.filter((item) => !hiddenIds.has(item.pet_id)));
      setMatches(stored.matches);
      setIsDemo(true);
      setNotice("Modo local seguro: likes, bloqueos, reportes y chats quedan guardados en este teléfono.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, customerId, selectedPet?.id]);

  function persistLocal(update: (state: LocalDiscoveryState) => LocalDiscoveryState) {
    if (!selectedPet) return;
    setLocalDiscovery((current) => {
      if (!current) return current;
      const next = update(current);
      void saveLocalDiscovery(customerId, selectedPet.id, next);
      return next;
    });
  }

  function changePreferences(nextSize: string, nextDistance: number) {
    setSizeFilter(nextSize);
    setMaxDistance(nextDistance);
    persistLocal((state) => ({ ...state, preferences: { size: nextSize, maxDistance: nextDistance } }));
  }

  useEffect(() => {
    void loadDiscovery();
  }, [loadDiscovery]);

  async function swipe(decision: "like" | "pass" | "super_like") {
    if (!selectedPet || !candidate) {
      return;
    }

    setLastCandidate(candidate);
    setCandidates((current) => current.filter((item) => item.pet_id !== candidate.pet_id));

    if (isDemo) {
      const createdAt = new Date().toISOString();
      let demoMatch: PetMatch | null = null;
      if (decision !== "pass" && candidate.pet_id === "demo-luna") {
        demoMatch = {
          id: `demo-match-${candidate.pet_id}`,
          pet_ids: [selectedPet.id, candidate.pet_id],
          pet: { id: candidate.pet_id, display_name: candidate.display_name },
          unread_count: 0,
          created_at: createdAt
        };
        const matchedPet = demoMatch;
        setMatches((current) => [matchedPet, ...current]);
        Alert.alert("¡Es un match!", `${selectedPet.name} y ${candidate.display_name} quieren conocerse.`);
      }
      persistLocal((state) => ({
        ...state,
        matches: demoMatch ? [demoMatch, ...state.matches.filter((item) => item.id !== demoMatch?.id)] : state.matches,
        swipes: [...state.swipes, { candidate, decision, createdAt }]
      }));
      return;
    }

    try {
      const response = await createDiscoverySwipe({
        actorPetId: selectedPet.id,
        customerId,
        targetPetId: candidate.pet_id,
        decision,
        accessToken
      });

      if (response.matched && response.match) {
        setMatches((current) => [response.match as PetMatch, ...current.filter((item) => item.id !== response.match?.id)]);
        Alert.alert("¡Es un match!", `${selectedPet.name} y ${candidate.display_name} quieren conocerse.`);
      }
    } catch (currentError) {
      setNotice(getCustomerError(currentError));
    }
  }

  function undoLastSwipe() {
    if (!lastCandidate) return;
    if (!isDemo && selectedPet) void undoDiscoverySwipe({ actorPetId: selectedPet.id, customerId, targetPetId: lastCandidate.pet_id, accessToken }).catch(() => null);
    setCandidates((current) => [lastCandidate, ...current]);
    setMatches((current) => current.filter((item) => item.pet?.id !== lastCandidate.pet_id));
    persistLocal((state) => ({
      ...state,
      matches: state.matches.filter((item) => item.pet?.id !== lastCandidate.pet_id),
      swipes: state.swipes.filter((item) => item.candidate.pet_id !== lastCandidate.pet_id)
    }));
    setLastCandidate(null);
  }

  function blockCandidate() {
    if (!candidate) return;
    if (!isDemo && selectedPet) void blockDiscoveryPet({ actorPetId: selectedPet.id, customerId, targetPetId: candidate.pet_id, accessToken }).catch(() => null);
    setCandidates((current) => current.filter((item) => item.pet_id !== candidate.pet_id));
    persistLocal((state) => ({ ...state, blockedPetIds: [...new Set([...state.blockedPetIds, candidate.pet_id])] }));
    setNotice(`${candidate.display_name} fue bloqueado y no volverá a aparecer.`);
  }

  function reportCandidate(reason: string) {
    if (!candidate) return;
    if (!isDemo && selectedPet) void reportDiscoveryPet({ actorPetId: selectedPet.id, customerId, targetPetId: candidate.pet_id, reason, accessToken }).catch(() => null);
    persistLocal((state) => ({
      ...state,
      blockedPetIds: [...new Set([...state.blockedPetIds, candidate.pet_id])],
      reports: [...state.reports, { candidate, reason, createdAt: new Date().toISOString() }]
    }));
    setCandidates((current) => current.filter((item) => item.pet_id !== candidate.pet_id));
    setNotice("Reporte guardado. Este perfil fue ocultado preventivamente.");
  }

  function sendMatchMessage(matchId: string) {
    const text = chatDraft.trim();
    if (!text) return;
    const message = { id: `${Date.now()}`, matchId, sender: "me" as const, text, createdAt: new Date().toISOString() };
    persistLocal((state) => ({ ...state, messages: [...state.messages, message] }));
    if (!isDemo) void sendDiscoveryMessage({ matchId, customerId, text, accessToken }).catch(() => null);
    setChatDraft("");
  }

  if (!selectedPet) {
    return <EmptyState text="Agrega una mascota en Mascotas antes de buscar compañeros." />;
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>¿Quién busca amigos?</Text>
        <View style={styles.chipRow}>
          {(dogPets.length ? dogPets : pets).map((pet) => (
            <Pressable
              key={pet.id}
              onPress={() => setSelectedPetId(pet.id)}
              style={[styles.chip, selectedPet.id === pet.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selectedPet.id === pet.id && styles.chipTextSelected]}>{pet.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.matchFilters}>
        <Text style={styles.filterLabel}>Tamaño</Text>
        <View style={styles.chipRow}>
          {[["all", "Todos"], ["small", "Pequeño"], ["medium", "Mediano"], ["large", "Grande"]].map(([value, label]) => (
            <Pressable key={value} onPress={() => changePreferences(value, maxDistance)} style={[styles.filterChip, sizeFilter === value && styles.filterChipSelected]}>
              <Text style={[styles.filterChipText, sizeFilter === value && styles.filterChipTextSelected]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.distanceRow}>
          <Text style={styles.filterLabel}>Distancia: hasta {maxDistance} km</Text>
          {[5, 10, 25].map((distance) => <Pressable key={distance} onPress={() => changePreferences(sizeFilter, distance)} style={[styles.distanceButton, maxDistance === distance && styles.filterChipSelected]}><Text style={[styles.filterChipText, maxDistance === distance && styles.filterChipTextSelected]}>{distance}</Text></Pressable>)}
        </View>
      </View>

      <View style={styles.matchTabs}>
        <Pressable onPress={() => setMode("discover")} style={[styles.matchTab, mode === "discover" && styles.matchTabSelected]}>
          <Feather color={mode === "discover" ? "#ffffff" : "#EE7C2B"} name="search" size={17} />
          <Text style={[styles.matchTabText, mode === "discover" && styles.matchTabTextSelected]}>Descubrir</Text>
        </Pressable>
        <Pressable onPress={() => setMode("matches")} style={[styles.matchTab, mode === "matches" && styles.matchTabSelected]}>
          <Feather color={mode === "matches" ? "#ffffff" : "#EE7C2B"} name="heart" size={17} />
          <Text style={[styles.matchTabText, mode === "matches" && styles.matchTabTextSelected]}>Matches ({matches.length})</Text>
        </Pressable>
      </View>

      {notice ? <Text style={styles.demoNotice}>{notice}</Text> : null}

      {isLoading ? <LoadingBlock /> : mode === "discover" ? (
        candidate ? (
          <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX: cardTranslateX }, { rotate: cardRotation }] }}>
          <View style={styles.discoveryCard}>
            {candidate.photos?.[0] ? (
              <Image source={{ uri: candidate.photos[0] }} style={styles.discoveryPhoto} />
            ) : (
              <View style={styles.discoveryPhotoFallback}>
                <Feather color="#EE7C2B" name="heart" size={58} />
                <Text style={styles.discoveryPhotoName}>{candidate.display_name.slice(0, 1)}</Text>
              </View>
            )}

            <View style={styles.discoveryBody}>
              <View style={styles.discoveryHeading}>
                <View style={styles.cardCopy}>
                  <Text style={styles.discoveryName}>{candidate.display_name}{candidate.age_months ? `, ${formatPetAge(candidate.age_months)}` : ""}</Text>
                  <Text style={styles.cardText}>{[candidate.breed, candidate.comuna].filter(Boolean).join(" · ")}</Text>
                </View>
                {candidate.compatibility_score ? (
                  <View style={styles.compatibilityBadge}>
                    <Text style={styles.compatibilityText}>{Math.round(candidate.compatibility_score * 100)}%</Text>
                  </View>
                ) : null}
              </View>

              {candidate.distance_km !== null && candidate.distance_km !== undefined ? (
                <View style={styles.inlineInfo}>
                  <Feather color="#626D84" name="map-pin" size={14} />
                  <Text style={styles.cardText}>A {candidate.distance_km.toFixed(1)} km</Text>
                </View>
              ) : null}
              <Text style={styles.discoveryBio}>{candidate.bio ?? "Buscando nuevos compañeros de paseo."}</Text>
              <View style={styles.chipRow}>
                {(candidate.temperament_tags ?? []).map((tag) => <View key={tag} style={styles.discoveryTag}><Text style={styles.discoveryTagText}>{tag}</Text></View>)}
              </View>
              <Text style={styles.privacyText}>Por seguridad, solo mostramos distancia aproximada. Tu ubicación exacta nunca se comparte.</Text>
              <View style={styles.safetyActions}>
                <Pressable onPress={() => Alert.alert("Reportar perfil", "¿Qué ocurrió?", [
                  { text: "Perfil falso", onPress: () => reportCandidate("Perfil falso") },
                  { text: "Contenido inapropiado", onPress: () => reportCandidate("Contenido inapropiado") },
                  { text: "Conducta riesgosa", onPress: () => reportCandidate("Conducta riesgosa") },
                  { text: "Cancelar", style: "cancel" }
                ])}><Text style={styles.safetyLink}>Reportar</Text></Pressable>
                <Pressable onPress={() => Alert.alert("Bloquear perfil", `${candidate.display_name} dejará de aparecer.`, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Bloquear", style: "destructive", onPress: blockCandidate }
                ])}><Text style={styles.safetyDanger}>Bloquear</Text></Pressable>
              </View>
            </View>

            <View style={styles.swipeActions}>
              <Pressable accessibilityLabel="Descartar" onPress={() => void swipe("pass")} style={[styles.swipeButton, styles.passButton]}>
                <Feather color="#626D84" name="x" size={28} />
              </Pressable>
              <Pressable accessibilityLabel="Super like" onPress={() => void swipe("super_like")} style={[styles.swipeButton, styles.superButton]}>
                <Feather color="#277DA1" name="star" size={25} />
              </Pressable>
              <Pressable accessibilityLabel="Me gusta" onPress={() => void swipe("like")} style={[styles.swipeButton, styles.likeButton]}>
                <Feather color="#ffffff" name="heart" size={28} />
              </Pressable>
            </View>
            {lastCandidate ? <Pressable onPress={undoLastSwipe} style={styles.undoButton}><Feather color="#626D84" name="rotate-ccw" size={16} /><Text style={styles.undoText}>Deshacer último</Text></Pressable> : null}
          </View>
          </Animated.View>
        ) : (
          <View style={styles.empty}>
            <Feather color="#EE7C2B" name="check-circle" size={28} />
            <Text style={styles.emptyText}>Ya viste todas las mascotas disponibles por ahora.</Text>
            <Pressable onPress={() => void loadDiscovery()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver a buscar</Text></Pressable>
          </View>
        )
      ) : matches.length ? (
        matches.map((match) => (
          <View key={match.id}>
          <Pressable onPress={() => setSelectedMatchId(selectedMatchId === match.id ? null : match.id)} style={styles.matchRow}>
            <View style={styles.matchAvatar}><Feather color="#EE7C2B" name="heart" size={22} /></View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{match.pet?.display_name ?? "Nuevo amigo"}</Text>
              <Text style={styles.cardText}>{match.last_message?.text ?? "¡Hicieron match! Ya pueden coordinar un paseo."}</Text>
            </View>
            {match.unread_count ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{match.unread_count}</Text></View> : null}
            <Feather color="#EE7C2B" name={selectedMatchId === match.id ? "chevron-up" : "message-circle"} size={19} />
          </Pressable>
          {selectedMatchId === match.id ? (
            <View style={styles.matchChat}>
              {(localDiscovery?.messages ?? []).filter((message) => message.matchId === match.id).map((message) => (
                <View key={message.id} style={[styles.matchMessage, message.sender === "me" && styles.matchMessageOwn]}><Text style={styles.matchMessageText}>{message.text}</Text></View>
              ))}
              <View style={styles.chatComposer}>
                <TextInput autoCorrect={false} keyboardType={Platform.OS === "android" ? "visible-password" : "default"} onChangeText={setChatDraft} placeholder="Coordinen un paseo seguro…" showSoftInputOnFocus style={styles.chatInput} value={chatDraft} />
                <Pressable accessibilityLabel="Enviar mensaje" onPress={() => sendMatchMessage(match.id)} style={styles.chatSend}><Feather color="#ffffff" name="send" size={18} /></Pressable>
              </View>
            </View>
          ) : null}
          </View>
        ))
      ) : <EmptyState text="Tus matches aparecerán aquí cuando el interés sea mutuo." />}
    </>
  );
}

function formatPetAge(months: number) {
  if (months < 12) {
    return `${months} meses`;
  }

  const years = Math.floor(months / 12);
  return `${years} año${years === 1 ? "" : "s"}`;
}

function SafetyCenterView({ accessToken, activeBooking, customerId, onOpenBooking, onSupport }: {
  accessToken?: string | null; activeBooking: CustomerBooking | null; customerId: string;
  onOpenBooking: (booking: CustomerBooking) => void; onSupport: () => void;
}) {
  const [isSending, setIsSending] = useState(false);
  async function sendSos() {
    setIsSending(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const position = permission.status === "granted" ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }) : null;
      const locationText = position ? `Ubicación: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}` : "Ubicación no disponible o sin permiso.";
      await createCustomerSupportTicket({ customerId, bookingId: activeBooking ? getBookingId(activeBooking) : null, category: "emergency", subject: "SOS desde la app NOD", message: `Solicitud urgente del cliente. ${locationText}`, accessToken });
      Alert.alert("SOS enviado", "El equipo de soporte recibió la alerta y tu ubicación disponible.");
    } catch (currentError) {
      Alert.alert("No se pudo enviar", `${getCustomerError(currentError)} Si hay riesgo inmediato, contacta a emergencias locales.`);
    } finally { setIsSending(false); }
  }
  return <>
    <View style={styles.safetyHero}><Feather color="#ffffff" name="shield" size={34} /><View style={styles.cardCopy}><Text style={styles.safetyHeroTitle}>Tu seguridad primero</Text><Text style={styles.safetyHeroText}>Ayuda rápida, trazabilidad del servicio y canales de reporte en un solo lugar.</Text></View></View>
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Protecciones NOD</Text>
      <SafetyItem icon="check-circle" title="Perfiles verificados" text="Identidad, documentos y estado de revisión visibles en cada proveedor." />
      <SafetyItem icon="map-pin" title="Seguimiento del servicio" text="Ruta GPS y evidencia fotográfica quedan asociadas a la reserva." />
      <SafetyItem icon="eye-off" title="Privacidad" text="En Matches se muestra distancia aproximada, nunca tu ubicación exacta." />
      <SafetyItem icon="message-square" title="Registro de incidentes" text="Reportes y disputas quedan vinculados al servicio correspondiente." />
    </View>
    {activeBooking ? <Pressable onPress={() => onOpenBooking(activeBooking)} style={styles.liveCard}><View style={styles.liveDot} /><View style={styles.cardCopy}><Text style={styles.cardTitle}>Servicio activo</Text><Text style={styles.cardText}>Abrir seguimiento, ruta y evidencias</Text></View><Feather color="#EE7C2B" name="chevron-right" size={20} /></Pressable> : <Text style={styles.panelText}>No hay un servicio activo en este momento.</Text>}
    <Pressable disabled={isSending} onPress={() => Alert.alert("Enviar SOS", "Se enviará una alerta urgente con tu ubicación disponible.", [{ text: "Cancelar", style: "cancel" }, { text: "Enviar SOS", style: "destructive", onPress: () => void sendSos() }])} style={[styles.sosButton, isSending && { opacity: 0.6 }]}>{isSending ? <ActivityIndicator color="#ffffff" /> : <Feather color="#ffffff" name="alert-triangle" size={22} />}<Text style={styles.sosButtonText}>{isSending ? "Enviando…" : "SOS · Solicitar ayuda"}</Text></Pressable>
    <Pressable onPress={onSupport} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Reportar o abrir una disputa</Text></Pressable>
  </>;
}

function SafetyItem({ icon, title, text }: { icon: keyof typeof Feather.glyphMap; title: string; text: string }) {
  return <View style={styles.safetyItem}><Feather color="#367D5F" name={icon} size={20} /><View style={styles.cardCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{text}</Text></View></View>;
}

function CreateBookingView({
  accessToken,
  customer,
  onBack,
  onCreated,
  pets,
  provider,
  services
}: {
  accessToken?: string | null;
  customer: Customer;
  onBack: () => void;
  onCreated: (booking: CustomerBooking) => Promise<void>;
  pets: Pet[];
  provider: CustomerProvider;
  services: CatalogOption[];
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.value ?? "");
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [address, setAddress] = useState(customer.address ?? "");
  const [comuna, setComuna] = useState(customer.comuna ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [skipAddressSearch, setSkipAddressSearch] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (skipAddressSearch) {
      setSkipAddressSearch(false);
      return;
    }
    const timer = setTimeout(() => {
      if (address.trim().length < 3) {
        setAddressSuggestions([]);
        return;
      }
      void searchChileanAddresses(address).then(setAddressSuggestions).catch(() => setAddressSuggestions([]));
    }, 450);
    return () => clearTimeout(timer);
  }, [address]);

  useEffect(() => {
    void useCurrentLocation();
  }, []);

  async function setPointAndReverseGeocode(latitude: number, longitude: number) {
    setSelectedLocation({ latitude, longitude });
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results[0];
    if (!place) return;
    const street = [place.street ?? place.name, place.streetNumber].filter(Boolean).join(" ");
    setSkipAddressSearch(true);
    setAddress(street || place.formattedAddress || address);
    setComuna(place.district ?? place.subregion ?? place.city ?? "");
    setCity(place.city ?? place.region ?? "");
    setAddressSuggestions([]);
  }

  async function useCurrentLocation() {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Ubicación desactivada", "Puedes buscar y seleccionar manualmente la dirección del servicio.");
        await resolveAddress();
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await setPointAndReverseGeocode(position.coords.latitude, position.coords.longitude);
    } catch {
      const resolved = await resolveAddress();
      if (!resolved) Alert.alert("No encontramos tu ubicación", "Busca la dirección del servicio y presiona Ubicar esta dirección.");
    } finally {
      setIsLocating(false);
    }
  }

  async function resolveAddress() {
    if (address.trim().length < 3) return null;
    setIsResolvingAddress(true);
    try {
      const suggestion = (await searchChileanAddresses(address))[0];
      if (!suggestion || suggestion.latitude == null || suggestion.longitude == null) return null;
      selectSuggestion(suggestion);
      return { location: { latitude: suggestion.latitude, longitude: suggestion.longitude }, comuna: suggestion.comuna, city: suggestion.city };
    } catch { return null; }
    finally { setIsResolvingAddress(false); }
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    setSkipAddressSearch(true);
    setAddress(suggestion.address);
    setComuna(suggestion.comuna);
    setCity(suggestion.city);
    setAddressSuggestions([]);
    if (suggestion.latitude != null && suggestion.longitude != null) {
      setSelectedLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    }
  }

  async function submit() {
    if (!address.trim()) {
      Alert.alert("Direccion requerida", "Ingresa la direccion de retiro.");
      return;
    }

    let bookingLocation = selectedLocation;
    let bookingComuna = comuna;
    if (!bookingLocation) {
      const resolved = await resolveAddress();
      bookingLocation = resolved?.location ?? null;
      bookingComuna = resolved?.comuna ?? comuna;
      if (!bookingLocation) { Alert.alert("Ubicación requerida", "No pudimos ubicar esa dirección. Selecciona una sugerencia o presiona Ubicar esta dirección."); return; }
    }

    const providerZones = provider.zones ?? [];
    if (bookingComuna && providerZones.length > 0 && !providerZones.some((zone) => normalizeText(zone) === normalizeText(bookingComuna))) {
      Alert.alert("Fuera de cobertura", `${provider.full_name ?? "Este paseador"} no tiene ${bookingComuna} entre sus zonas configuradas.`);
      return;
    }

    setIsSaving(true);

    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
      const booking = await createBooking({
        customerId: customer.id,
        providerId: provider.id,
        petId,
        petName: pets.find((pet) => pet.id === petId)?.name ?? null,
        providerName: provider.full_name ?? null,
        serviceId,
        startsAt,
        endsAt,
        address: address.trim(),
        comuna: bookingComuna || null,
        city: city || null,
        latitude: bookingLocation.latitude,
        longitude: bookingLocation.longitude,
        price: provider.price_from,
        currency: provider.currency ?? "CLP",
        notes: [notes.trim(), `Ubicación: ${bookingComuna || city} (${bookingLocation.latitude.toFixed(6)}, ${bookingLocation.longitude.toFixed(6)})`].filter(Boolean).join("\n"),
        accessToken
      });

      if (booking) {
        await onCreated(booking);
      }
    } catch (currentError) {
      Alert.alert("No se pudo reservar", getCustomerError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{provider.full_name ?? "Paseador NOD"}</Text>
        <Text style={styles.panelText}>{provider.bio ?? "Proveedor verificado para servicios de paseo y cuidado."}</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="star" label="Rating" value={formatRating(provider.rating)} />
          <SummaryItem icon="message-circle" label="Reseñas" value={String(provider.review_count ?? 0)} />
          <SummaryItem icon="map-pin" label="Zonas" value={provider.zones?.slice(0, 2).join(", ") || "Por confirmar"} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Reserva</Text>
        <Segmented items={pets.map((pet) => ({ label: pet.name, value: pet.id }))} value={petId} onChange={setPetId} />
        <Segmented items={services.slice(0, 4).map((service) => ({ label: service.label, value: service.value }))} value={serviceId} onChange={setServiceId} />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          showSoftInputOnFocus
          style={styles.input}
          value={date}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setTime}
          placeholder="HH:mm"
          showSoftInputOnFocus
          style={styles.input}
          value={time}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={(value) => { setAddress(value); setSelectedLocation(null); }}
          placeholder="Buscar dirección del servicio"
          showSoftInputOnFocus
          style={styles.input}
          value={address}
        />
        {addressSuggestions.length ? (
          <View style={styles.bookingAddressSuggestions}>
            {addressSuggestions.map((suggestion) => (
              <Pressable key={suggestion.id} onPress={() => selectSuggestion(suggestion)} style={styles.bookingAddressSuggestion}>
                <Feather color="#EE7C2B" name="map-pin" size={17} />
                <Text style={styles.bookingAddressSuggestionText}>{suggestion.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable disabled={isResolvingAddress || address.trim().length < 3} onPress={() => void resolveAddress()} style={styles.currentLocationButton}>
          {isResolvingAddress ? <ActivityIndicator color="#EE7C2B" size="small" /> : <Feather color="#EE7C2B" name="search" size={17} />}
          <Text style={[styles.currentLocationButtonText, { color: "#EE7C2B" }]}>{isResolvingAddress ? "Ubicando dirección…" : "Ubicar esta dirección"}</Text>
        </Pressable>
        <Pressable disabled={isLocating} onPress={() => void useCurrentLocation()} style={styles.currentLocationButton}>
          {isLocating ? <ActivityIndicator color="#367D5F" size="small" /> : <Feather color="#367D5F" name="crosshair" size={17} />}
          <Text style={styles.currentLocationButtonText}>{isLocating ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}</Text>
        </Pressable>
        {selectedLocation ? (
          <>
            <View style={styles.bookingMapWrap}>
              <WebView javaScriptEnabled source={{ uri: getEmbeddedMapUrl(selectedLocation.latitude, selectedLocation.longitude) }} style={styles.bookingMap} />
            </View>
            <Text style={styles.bookingLocationCaption}>{[address, comuna, city].filter(Boolean).join(", ")}</Text>
          </>
        ) : (
          <View style={styles.bookingMapPlaceholder}><Feather color="#EE7C2B" name="map" size={25} /><Text style={styles.panelText}>Busca una dirección para mostrarla en el mapa.</Text></View>
        )}
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setNotes}
          placeholder="Notas para el paseador"
          showSoftInputOnFocus
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={notes}
        />
        <View style={styles.actionRow}>
          <ActionButton icon="arrow-left" label="Volver" onPress={onBack} variant="secondary" />
          <ActionButton busy={isSaving} icon="send" label="Reservar" onPress={() => void submit()} variant="primary" />
        </View>
      </View>
    </>
  );
}

function PetsView({
  accessToken,
  customerId,
  medicalProfiles,
  onOpenPet,
  onPetsChange,
  pets
}: {
  accessToken?: string | null;
  customerId: string;
  medicalProfiles: PetMedicalProfile[];
  onOpenPet: (pet: Pet) => void;
  onPetsChange: (pets: Pet[]) => void;
  pets: Pet[];
}) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [breeds, setBreeds] = useState<string[]>([]);
  const [showBreeds, setShowBreeds] = useState(false);
  const [size, setSize] = useState("mediano");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void getDogBreeds().then(setBreeds).catch(() => setBreeds([]));
  }, []);

  async function addPet() {
    if (!name.trim()) {
      Alert.alert("Nombre requerido", "Ingresa el nombre de la mascota.");
      return;
    }

    setIsSaving(true);
    const pet = await createCustomerPet({
      customerId,
      name: name.trim(),
      species: "dog",
      breed: breed.trim(),
      size,
      notes: notes.trim(),
      accessToken
    }).catch((currentError) => {
      Alert.alert("No se pudo guardar", getCustomerError(currentError));
      return null;
    }).finally(() => setIsSaving(false));

    if (pet) {
      onPetsChange([pet, ...pets]);
      setName("");
      setBreed("");
      setNotes("");
    }
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Ficha de mascotas</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="heart" label="Registradas" value={String(pets.length)} />
          <SummaryItem icon="activity" label="Con notas" value={String(pets.filter((pet) => Boolean(pet.notes)).length)} />
          <SummaryItem icon="shield" label="Datos" value="Salud y conducta" />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Agregar mascota</Text>
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setName}
          placeholder="Nombre"
          showSoftInputOnFocus
          style={styles.input}
          value={name}
        />
        <Pressable onPress={() => setShowBreeds((current) => !current)} style={styles.selectButton}>
          <Text style={breed ? styles.selectButtonText : styles.selectPlaceholder}>{breed || "Seleccionar raza"}</Text>
          <Feather color="#EE7C2B" name="chevron-down" size={18} />
        </Pressable>
        {showBreeds ? <View style={styles.breedPicker}><TextInput autoCorrect={false} keyboardType={Platform.OS === "android" ? "visible-password" : "default"} onChangeText={setBreed} placeholder="Buscar raza" showSoftInputOnFocus style={styles.input} value={breed} /><ScrollView nestedScrollEnabled style={styles.breedList}>{breeds.filter((item) => !breed || item.toLowerCase().includes(breed.toLowerCase())).slice(0, 40).map((item) => <Pressable key={item} onPress={() => { setBreed(item); setShowBreeds(false); }} style={styles.breedItem}><Text style={styles.breedItemText}>{item}</Text></Pressable>)}</ScrollView></View> : null}
        <Segmented
          items={[
            { label: "Pequeño", value: "pequeno" },
            { label: "Mediano", value: "mediano" },
            { label: "Grande", value: "grande" }
          ]}
          value={size}
          onChange={setSize}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setNotes}
          placeholder="Notas de comportamiento o salud"
          showSoftInputOnFocus
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={notes}
        />
        <ActionButton busy={isSaving} icon="plus" label="Guardar mascota" onPress={() => void addPet()} variant="primary" />
      </View>

      {pets.length === 0 ? <EmptyState text="Agrega tu primera mascota para reservar paseos." /> : null}
      {pets.map((pet) => {
        const medicalProfile = medicalProfiles.find((profileItem) => profileItem.pet_id === pet.id);
        return (
        <Pressable key={pet.id} onPress={() => onOpenPet(pet)} style={styles.petCard}>
          <View style={styles.petAvatar}>
            <Feather color="#EE7C2B" name="heart" size={20} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>{pet.name}</Text>
            <Text style={styles.cardText}>{pet.breed ?? "Raza no indicada"} · {pet.size ?? "Tamaño no indicado"}</Text>
            {pet.age_years !== undefined && pet.age_years !== null ? <Text style={styles.cardText}>{pet.age_years} año{pet.age_years === 1 ? "" : "s"}</Text> : null}
            {pet.notes ? <Text style={styles.cardText}>{pet.notes}</Text> : null}
            <Text style={styles.cardText}>{medicalProfile ? "Ficha medica completa" : "Ficha medica pendiente"}</Text>
          </View>
          <Feather color="#EE7C2B" name="chevron-right" size={20} />
        </Pressable>
        );
      })}
    </>
  );
}

function ResidentialView({ accessToken, customer, onCreated, onSupport, pets }: { accessToken?: string | null; customer: Customer; onCreated: (booking: CustomerBooking) => Promise<void>; onSupport: () => void; pets: Pet[] }) {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const afterTomorrow = new Date(today.getTime() + 2 * 86400000);
  const dateValue = (value: Date) => value.toISOString().slice(0, 10);
  const [comuna, setComuna] = useState(customer.comuna ?? "Providencia");
  const [checkIn, setCheckIn] = useState(dateValue(tomorrow));
  const [checkOut, setCheckOut] = useState(dateValue(afterTomorrow));
  const [hosts, setHosts] = useState<HostingHost[]>([]);
  const [selected, setSelected] = useState<HostingDetail | null>(null);
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationError, setReservationError] = useState(false);
  const [bookings, setBookings] = useState<HostingBooking[]>([]);

  const loadBookings = useCallback(async () => {
    try { setBookings(await getMyHostingBookings(accessToken)); } catch { /* La búsqueda sigue disponible aunque no haya historial. */ }
  }, [accessToken]);

  const runSearch = useCallback(async () => {
    if (new Date(checkOut) <= new Date(checkIn)) { setError("La salida debe ser posterior al ingreso."); return; }
    setLoading(true); setError(null); setSelected(null);
    try { setHosts((await searchHosting({ comuna, checkIn, checkOut, pets: 1, accessToken })).items); }
    catch (currentError) { setError(getCustomerError(currentError)); }
    finally { setLoading(false); }
  }, [checkIn, checkOut, comuna]);

  useEffect(() => { void runSearch(); void loadBookings(); }, []);

  async function openHost(host: HostingHost) {
    setLoading(true); setError(null);
    try { setSelected(await getHostingHost(host.id, checkIn, checkOut, accessToken)); }
    catch (currentError) { setError(getCustomerError(currentError)); }
    finally { setLoading(false); }
  }

  async function reserve() {
    const host = selected?.host;
    const pet = pets.find((item) => item.id === petId);
    if (!host || !pet) { Alert.alert("Faltan datos", "Selecciona un anfitrión y una mascota."); return; }
    setSaving(true); setReservationError(false);
    try {
      const created = await createHostingBooking({ hostingProfileId: host.id, customerId: customer.id, checkIn, checkOut, petIds: [pet.id], specialInstructions: `Mascota: ${pet.name}`, accessToken });
      if (created?.id) { await onCreated({ id: String(created.id), provider_id: host.provider_id, customer_id: customer.id, pet_id: pet.id, pet_name: pet.name, provider_name: host.host_name ?? host.title, service_name: "Hospedaje residencial", starts_at: new Date(`${checkIn}T15:00:00`).toISOString(), ends_at: new Date(`${checkOut}T12:00:00`).toISOString(), status: String(created.status ?? "PENDING"), price: Number(created.total_amount ?? 0), currency: String(created.currency ?? "CLP"), address: host.address, comuna: host.comuna }); await loadBookings(); }
    } catch { setReservationError(true); }
    finally { setSaving(false); }
  }

  if (selected) {
    const host = selected.host;
    return <>
      <Pressable onPress={() => setSelected(null)} style={styles.secondaryButton}><Feather color="#ffffff" name="arrow-left" size={18} /><Text style={styles.secondaryButtonText}>Volver a resultados</Text></Pressable>
      <View style={styles.panel}><Text style={styles.panelTitle}>{host.title ?? host.host_name}</Text><Text style={styles.panelText}>{host.bio}</Text>
        <InfoRow label="Ubicación" value={[host.address, host.comuna].filter(Boolean).join(", ")} /><InfoRow label="Propiedad" value={host.property_type ?? "No indicada"} /><InfoRow label="Capacidad" value={`${host.max_pets_capacity ?? 1} mascota(s)`} /><InfoRow label="Tarifa" value={`${formatMoney(host.nightly_rate ?? 0)} por noche`} /><InfoRow label="Patio" value={host.has_yard ? "Sí" : "No"} />
      </View>
      {reservationError ? <View style={styles.bookingErrorCard}><Feather color="#EE7C2B" name="alert-triangle" size={28} /><Text style={styles.panelTitle}>No pudimos completar tu reserva</Text><Text style={styles.panelText}>Inténtalo de nuevo en unos minutos. Si persiste, escríbenos a soporte.</Text><ActionButton busy={saving} icon="refresh-cw" label="Reintentar" onPress={() => void reserve()} variant="primary" /><ActionButton icon="life-buoy" label="Contactar soporte" onPress={onSupport} variant="secondary" /></View> : <View style={styles.panel}><Text style={styles.panelTitle}>Solicitar estadía</Text><Text style={styles.panelText}>{checkIn} → {checkOut}</Text><Segmented items={pets.map((pet) => ({ label: pet.name, value: pet.id }))} value={petId} onChange={setPetId} /><ActionButton busy={saving} icon="calendar" label="Reservar y abrir chat" onPress={() => void reserve()} variant="primary" /></View>}
    </>;
  }

  return <>
    <View style={styles.panel}><Text style={styles.panelTitle}>Busca un residencial</Text><TextInput onChangeText={setComuna} placeholder="Comuna" style={styles.input} value={comuna} /><TextInput onChangeText={setCheckIn} placeholder="Ingreso YYYY-MM-DD" style={styles.input} value={checkIn} /><TextInput onChangeText={setCheckOut} placeholder="Salida YYYY-MM-DD" style={styles.input} value={checkOut} /><ActionButton busy={loading} icon="search" label="Buscar disponibilidad" onPress={() => void runSearch()} variant="primary" /></View>
    <Feedback error={error} notice={null} />
    {!loading && hosts.length === 0 ? <EmptyState text="No hay residenciales disponibles para estos filtros." /> : null}
    {hosts.map((host) => <Pressable key={host.id} onPress={() => void openHost(host)} style={styles.providerCard}><View style={styles.cardCopy}><Text style={styles.cardTitle}>{host.title ?? host.host_name}</Text><Text style={styles.cardText}>{host.comuna} · {formatMoney(host.nightly_rate ?? 0)} por noche</Text><Text style={styles.cardText}>{host.has_yard ? "Con patio" : host.property_type}</Text></View><Feather color="#EE7C2B" name="chevron-right" size={20} /></Pressable>)}
    <View style={styles.panel}><Text style={styles.panelTitle}>Mis estadías</Text>{bookings.length === 0 ? <Text style={styles.panelText}>Aún no tienes estadías reservadas.</Text> : bookings.map((booking) => <View key={booking.id} style={styles.ticket}><View style={styles.cardCopy}><Text style={styles.cardTitle}>{booking.host_name ?? "Hospedaje residencial"}</Text><Text style={styles.cardText}>{booking.check_in} → {booking.check_out}</Text><Text style={styles.statusText}>{booking.status}</Text></View>{!["COMPLETED", "CANCELLED"].includes(booking.status) ? <Pressable onPress={() => void updateHostingBookingStatus(booking.id, "CANCELLED", accessToken).then(loadBookings).catch((currentError) => Alert.alert("No se pudo cancelar", getCustomerError(currentError)))} style={styles.smallSecondaryButton}><Text style={styles.smallSecondaryButtonText}>Cancelar</Text></Pressable> : null}</View>)}</View>
  </>;
}

function ActivityView({ bookings, onOpenBooking }: { bookings: CustomerBooking[]; onOpenBooking: (booking: CustomerBooking) => void }) {
  if (bookings.length === 0) {
    return <EmptyState text="Todavia no tienes reservas." />;
  }

  const active = bookings.filter(isActiveBooking);
  const upcoming = bookings.filter((booking) => !isActiveBooking(booking) && isUpcomingBooking(booking));
  const history = bookings.filter((booking) => !isActiveBooking(booking) && !isUpcomingBooking(booking));

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Resumen de reservas</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="navigation" label="Activas" value={String(active.length)} />
          <SummaryItem icon="calendar" label="Proximas" value={String(upcoming.length)} />
          <SummaryItem icon="archive" label="Historial" value={String(history.length)} />
        </View>
      </View>
      <BookingGroup bookings={active} onOpenBooking={onOpenBooking} title="En curso" />
      <BookingGroup bookings={upcoming} onOpenBooking={onOpenBooking} title="Proximas" />
      <BookingGroup bookings={history} onOpenBooking={onOpenBooking} title="Historial" />
    </>
  );
}

function BookingTrackingView({
  accessToken,
  booking,
  customerId,
  nodWallet,
  onBack,
  onCancel,
  onCheckoutStarted,
  onWalletChanged
}: {
  accessToken?: string | null;
  booking: CustomerBooking;
  customerId: string;
  nodWallet: NodWallet;
  onBack: () => void;
  onCancel: (booking: CustomerBooking, refundDestination?: RefundDestination) => Promise<void>;
  onCheckoutStarted: (bookingId: string) => void;
  onWalletChanged: () => Promise<void>;
}) {
  const bookingId = getBookingId(booking);
  const [route, setRoute] = useState<ServiceLocation[]>([]);
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number | undefined>();
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>();
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPayingWithCredits, setIsPayingWithCredits] = useState(false);

  const loadTracking = useCallback(async () => {
    if (!bookingId) {
      return;
    }

    const [routeResponse, nextPhotos] = await Promise.all([
      getCustomerServiceRoute({ bookingId, accessToken }).catch((error: unknown) => {
        setTrackingError(getFriendlyError(error));
        return null;
      }),
      getCustomerServicePhotos({ bookingId, accessToken }).catch(() => [])
    ]);
    if (routeResponse) setTrackingError(null);
    const loadedRoute = routeResponse?.route ?? [];
    setRoute(loadedRoute.length > 0 ? loadedRoute : getBookingEndpointRoute(booking, bookingId));
    setDistanceMeters(routeResponse?.distance_meters);
    setDurationSeconds(routeResponse?.duration_seconds);
    setPhotos(nextPhotos);
  }, [accessToken, booking, bookingId]);

  useEffect(() => {
    void loadTracking();
    const timer = setInterval(() => void loadTracking(), 15000);
    return () => clearInterval(timer);
  }, [loadTracking]);

  async function openPaymentCheckout() {
    if (!bookingId) return;
    setIsPaying(true);
    try {
      const checkout = await createMercadoPagoCheckout({ bookingId, accessToken });
      const checkoutUrl = __DEV__ ? checkout.sandbox_checkout_url || checkout.checkout_url : checkout.checkout_url;
      if (!checkoutUrl) throw new Error("Mercado Pago no devolvió una URL de checkout.");
      onCheckoutStarted(bookingId);
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      Alert.alert("No se pudo iniciar el pago", getFriendlyError(error));
    } finally {
      setIsPaying(false);
    }
  }

  async function payWithCredits() {
    if (!bookingId) return;
    setIsPayingWithCredits(true);
    try {
      await payBookingWithNodCredits({ bookingId, accessToken });
      await onWalletChanged();
      Alert.alert("Pago realizado", "La reserva fue pagada con Créditos NOD.");
    } catch (error) {
      Alert.alert("No se pudo pagar con créditos", getFriendlyError(error));
    } finally {
      setIsPayingWithCredits(false);
    }
  }

  async function cancelWithRefundChoice() {
    const choice = await chooseRefundDestination(booking);
    if (choice === null) return;
    setIsCancelling(true);
    try {
      await onCancel(booking, choice);
      if (choice) await onWalletChanged();
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{booking.product_name ?? booking.service_name ?? "Paseo"}</Text>
        <Text style={styles.panelText}>{booking.provider_name ?? "Paseador asignado"} · {getStatusLabel(booking.status)}</Text>
        <Text style={styles.panelText}>{formatBookingTime(booking)}</Text>
        <View style={styles.statusRail}>
          {["Solicitada", "Aceptada", "En curso", "Finalizada"].map((label, index) => (
            <View key={label} style={styles.statusStep}>
              <View style={[styles.statusDot, index <= getBookingProgressIndex(booking.status) && styles.statusDotDone]} />
              <Text style={styles.statusStepText}>{label}</Text>
            </View>
          ))}
        </View>
        <InfoRow label="Mascota" value={booking.pet_name ?? "No indicada"} />
        <InfoRow label="Direccion" value={booking.pickup_address ?? booking.address ?? "No indicada"} />
        <InfoRow label="Pago" value={booking.payment_status ? getStatusLabel(booking.payment_status) : "Por confirmar"} />
        <InfoRow label="Total" value={booking.price ? formatMoney(booking.price, booking.currency ?? "CLP") : "Por confirmar"} />
        {env.mercadoPagoEnabled && bookingId && Number(booking.price) > 0 && !isPaidBooking(booking) ? (
          <View style={styles.paymentAction}>
            <Text style={styles.panelText}>Saldo disponible: {formatCredits(nodWallet.available_credits)}</Text>
            <ActionButton busy={isPayingWithCredits} icon="zap" label="Pagar con Créditos NOD" onPress={() => void payWithCredits()} variant="secondary" />
            <ActionButton busy={isPaying} icon="credit-card" label="Pagar con Mercado Pago" onPress={() => void openPaymentCheckout()} variant="primary" />
          </View>
        ) : null}
      </View>

      <RoutePreview error={trackingError} route={route} />
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Seguimiento</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="map" label="Puntos" value={String(route.length)} />
          <SummaryItem icon="trending-up" label="Distancia" value={formatDistance(distanceMeters)} />
          <SummaryItem icon="clock" label="Duracion" value={formatDuration(durationSeconds)} />
          <SummaryItem icon="navigation" label="ETA" value={estimateArrival(route, booking)} />
        </View>
      </View>

      {bookingId && !["completed", "cancelled", "rejected"].includes(normalizeStatus(booking.status)) ? (
        <BookingCustomerChat accessToken={accessToken} bookingId={bookingId} customerId={customerId} />
      ) : null}

      {bookingId && normalizeStatus(booking.status) === "completed" && booking.provider_id ? (
        <CustomerReviewForm accessToken={accessToken} bookingId={bookingId} customerId={customerId} providerId={booking.provider_id} />
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Evidencias</Text>
        <View style={styles.photoGrid}>
          {photos.length === 0 ? <Text style={styles.panelText}>Aun no hay fotos del servicio.</Text> : null}
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoCard}>
              {photo.url ? <Image source={{ uri: photo.url }} style={styles.photoPreview} /> : null}
              <Text style={styles.photoLabel}>{getPhotoLabel(photo.type)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <ActionButton icon="arrow-left" label="Volver" onPress={onBack} variant="secondary" />
        {!["completed", "cancelled"].includes(normalizeStatus(booking.status)) ? (
          <ActionButton
            busy={isCancelling}
            icon="slash"
            label="Cancelar"
            onPress={() => void cancelWithRefundChoice()}
            variant="secondary"
          />
        ) : null}
      </View>
    </>
  );
}

function BookingCustomerChat({ accessToken, bookingId, customerId }: { accessToken?: string | null; bookingId: string; customerId: string }) {
  const [chat, setChat] = useState<BookingChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const nextChat = await getOrCreateBookingChat({ bookingId, accessToken }).catch((error) => {
      setChat(null);
      setChatError(getCustomerError(error));
      return null;
    });
    if (!nextChat) return;
    setChatError(null);
    setChat(nextChat);
    const response = await getChatMessages({ chatId: bookingId, accessToken }).catch((error) => {
      setChatError(getCustomerError(error));
      return { messages: [] };
    });
    setMessages(response.messages);
    const last = response.messages.at(-1);
    if (last) void markChatRead({ chatId: bookingId, userId: customerId, messageId: last.id, accessToken }).catch(() => null);
  }, [accessToken, bookingId, customerId]);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 10000); return () => clearInterval(timer); }, [load]);
  async function submit() {
    if (!chat || !draft.trim()) return;
    setSending(true);
    try {
      const message = await sendChatMessage({ chatId: bookingId, senderId: customerId, text: draft.trim(), accessToken });
      if (message) { setMessages((current) => [...current, message]); setDraft(""); setChatError(null); }
    } catch (error) {
      setChatError(getCustomerError(error));
    } finally {
      setSending(false);
    }
  }
  return <View style={styles.panel}><Text style={styles.panelTitle}>Chat con el proveedor</Text>
    {chatError ? <Text style={styles.error}>Chat temporalmente no disponible: {chatError}</Text> : null}
    <View style={styles.bookingChatList}>{messages.length ? messages.slice(-6).map((message) => <View key={message.id} style={[styles.matchMessage, message.sender_id === customerId && styles.matchMessageOwn]}><Text style={styles.matchMessageText}>{message.text ?? "Adjunto"}</Text></View>) : <Text style={styles.panelText}>Envía un mensaje para coordinar el servicio.</Text>}</View>
    <View style={styles.chatComposer}><TextInput autoCorrect={false} editable={Boolean(chat)} keyboardType={Platform.OS === "android" ? "visible-password" : "default"} onChangeText={setDraft} placeholder={chat ? "Escribe un mensaje…" : "Chat no disponible"} showSoftInputOnFocus style={styles.chatInput} value={draft} /><Pressable disabled={sending || !chat || !draft.trim()} onPress={() => void submit()} style={[styles.chatSend, (sending || !chat || !draft.trim()) && { opacity: 0.5 }]}><Feather color="#ffffff" name="send" size={18} /></Pressable></View>
  </View>;
}

function CustomerReviewForm({ accessToken, bookingId, customerId, providerId }: { accessToken?: string | null; bookingId: string; customerId: string; providerId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  if (sent) return <View style={styles.panel}><Text style={styles.panelTitle}>Gracias por tu reseña verificada</Text><Text style={styles.panelText}>Quedó vinculada a este servicio completado.</Text></View>;
  async function submit() {
    if (!rating) { Alert.alert("Elige una puntuación", "Selecciona entre 1 y 5 estrellas."); return; }
    setSaving(true);
    try { await createCustomerReview({ customerId, bookingId, providerId, rating, comment: comment.trim(), accessToken }); setSent(true); }
    catch (error) { Alert.alert("No se pudo guardar", getCustomerError(error)); }
    finally { setSaving(false); }
  }
  return <View style={styles.panel}><Text style={styles.panelTitle}>Califica el servicio</Text><Text style={styles.panelText}>Solo las reservas completadas pueden generar una reseña verificada.</Text>
    <View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)}><Feather color={value <= rating ? "#EE7C2B" : "#B9B3AE"} name="star" size={29} /></Pressable>)}</View>
    <TextInput autoCorrect={false} keyboardType={Platform.OS === "android" ? "visible-password" : "default"} multiline onChangeText={setComment} placeholder="Cuéntanos cómo fue el servicio" showSoftInputOnFocus style={[styles.input, styles.textArea]} value={comment} />
    <ActionButton busy={saving} icon="check" label="Publicar reseña verificada" onPress={() => void submit()} variant="primary" />
  </View>;
}

function CustomerWalletView({
  accessToken,
  benefits,
  creditPackages,
  onCheckoutStarted,
  paymentMethods,
  transactions,
  wallet
}: {
  accessToken?: string | null;
  benefits: CustomerBenefit[];
  creditPackages: CreditPackage[];
  onCheckoutStarted: () => void;
  paymentMethods: PaymentMethod[];
  transactions: WalletTransaction[];
  wallet: NodWallet;
}) {
  const total = transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount ?? 0), 0);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  async function topUp(packageId: string) {
    setLoadingPackageId(packageId);
    try {
      const checkout = await createWalletTopUp({ accessToken, packageId });
      const checkoutUrl = __DEV__ ? checkout.sandbox_checkout_url || checkout.checkout_url : checkout.checkout_url;
      if (!checkoutUrl) throw new Error("Mercado Pago no devolvió una URL de checkout.");
      onCheckoutStarted();
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      Alert.alert("No se pudo iniciar la recarga", getFriendlyError(error));
    } finally {
      setLoadingPackageId(null);
    }
  }

  return (
    <>
      <View style={styles.walletHero}>
        <Feather color="#ffffff" name="credit-card" size={28} />
        <Text style={styles.walletTitle}>Pagos y beneficios</Text>
        <Text style={styles.walletBalance}>{formatCredits(wallet.available_credits)}</Text>
        <Text style={styles.walletText}>{formatCredits(wallet.pending_credits)} pendientes de confirmación</Text>
      </View>
      {env.mercadoPagoEnabled ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recargar Créditos NOD</Text>
          <Text style={styles.panelText}>1 crédito equivale a $1 CLP dentro de NOD. No es retirable ni transferible.</Text>
          <View style={styles.creditPackages}>
            {creditPackages.map((creditPackage) => (
              <Pressable disabled={loadingPackageId !== null} key={creditPackage.id} onPress={() => void topUp(creditPackage.id)} style={styles.creditPackage}>
                {loadingPackageId === creditPackage.id ? <ActivityIndicator color="#EE7C2B" /> : <Feather color="#EE7C2B" name="plus-circle" size={20} />}
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{creditPackage.name}</Text>
                  <Text style={styles.cardText}>{formatCredits(creditPackage.total_credits)} por {formatMoney(creditPackage.price_amount, creditPackage.currency)}</Text>
                  {creditPackage.bonus_credits > 0 ? <Text style={styles.creditBonus}>Incluye {formatCredits(creditPackage.bonus_credits)} de regalo</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Metodos de pago</Text>
        {paymentMethods.length === 0 ? <Text style={styles.panelText}>No tienes metodos registrados.</Text> : null}
        {paymentMethods.map((method) => (
          <InfoRow key={method.id} label={method.brand ?? method.type ?? "Tarjeta"} value={method.last4 ? `•••• ${method.last4}` : "Registrada"} />
        ))}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Movimientos</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="list" label="Movimientos" value={String(transactions.length)} />
          <SummaryItem icon="dollar-sign" label="Total" value={total ? formatMoney(total, transactions[0]?.currency ?? "CLP") : "$0"} />
          <SummaryItem icon="shield" label="Estado" value="Pagos seguros" />
        </View>
        {transactions.length === 0 ? <Text style={styles.panelText}>No hay movimientos recientes.</Text> : null}
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </View>
    </>
  );
}

function BenefitsView({ benefits }: { benefits: CustomerBenefit[] }) {
  if (benefits.length === 0) {
    return <EmptyState text="No hay beneficios disponibles." />;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Beneficios</Text>
      {benefits.map((benefit) => (
        <View key={benefit.id} style={styles.benefitCard}>
          <Feather color="#EE7C2B" name="gift" size={20} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>{benefit.title}</Text>
            {benefit.description ? <Text style={styles.cardText}>{benefit.description}</Text> : null}
            {benefit.code ? <Text style={styles.codeText}>{benefit.code}</Text> : null}
            {benefit.expires_at ? <Text style={styles.cardText}>Vence {formatShortDate(benefit.expires_at)}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function CustomerSupportView({
  accessToken,
  customerId,
  onTicketsChange,
  tickets
}: {
  accessToken?: string | null;
  customerId: string;
  onTicketsChange: (tickets: SupportTicket[]) => void;
  tickets: SupportTicket[];
}) {
  const [category, setCategory] = useState("walk_issue");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function createTicket(nextCategory = category, nextSubject = subject.trim() || "Solicitud de soporte") {
    if (!message.trim()) {
      Alert.alert("Mensaje requerido", "Cuéntanos que ocurrió para poder ayudarte.");
      return;
    }

    setIsCreating(true);
    const ticket = await createCustomerSupportTicket({
      customerId,
      category: nextCategory,
      subject: nextSubject,
      message: message.trim(),
      accessToken
    }).catch((currentError) => {
      Alert.alert("No se pudo crear ticket", getCustomerError(currentError));
      return null;
    }).finally(() => setIsCreating(false));

    if (ticket) {
      onTicketsChange([ticket, ...tickets]);
      setSubject("");
      setMessage("");
      Alert.alert("Soporte", "Ticket creado correctamente.");
    }
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Nuevo ticket</Text>
        <Segmented
          items={[
            { label: "Paseo", value: "walk_issue" },
            { label: "Pago", value: "payment_issue" },
            { label: "Cuenta", value: "account_issue" }
          ]}
          onChange={setCategory}
          value={category}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setSubject}
          placeholder="Asunto"
          showSoftInputOnFocus
          style={styles.input}
          value={subject}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setMessage}
          placeholder="Describe el problema"
          showSoftInputOnFocus
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={message}
        />
        <ActionButton busy={isCreating} icon="send" label="Enviar ticket" onPress={() => void createTicket()} variant="primary" />
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Tickets</Text>
        {tickets.length === 0 ? <Text style={styles.panelText}>No tienes tickets abiertos.</Text> : null}
        {tickets.map((ticket) => (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.cardTitle}>{ticket.subject ?? "Ticket"}</Text>
              <Text style={styles.statusText}>{getStatusLabel(ticket.status)}</Text>
            </View>
            <Text style={styles.cardText}>{ticket.category ?? "Soporte"} · {formatShortDate(ticket.updated_at ?? ticket.created_at)}</Text>
            {ticket.message ? <Text style={styles.cardText}>{ticket.message}</Text> : null}
          </View>
        ))}
      </View>
    </>
  );
}

function PetProfileView({
  bookings,
  customerId,
  medicalProfile,
  onBack,
  onInsurance,
  onSave,
  pet,
  spots
}: {
  bookings: CustomerBooking[];
  customerId: string;
  medicalProfile?: PetMedicalProfile;
  onBack: () => void;
  onInsurance: () => void;
  onSave: (profiles: PetMedicalProfile[]) => void;
  pet: Pet;
  spots: CustomerSpotUnlock[];
}) {
  const [weightKg, setWeightKg] = useState(medicalProfile?.weight_kg ?? "");
  const [birthday, setBirthday] = useState(medicalProfile?.birthday ?? "");
  const [vaccineStatus, setVaccineStatus] = useState(medicalProfile?.vaccine_status ?? "al_dia");
  const [allergies, setAllergies] = useState(medicalProfile?.allergies ?? "");
  const [medications, setMedications] = useState(medicalProfile?.medications ?? "");
  const [microchip, setMicrochip] = useState(medicalProfile?.microchip ?? "");
  const [vetName, setVetName] = useState(medicalProfile?.vet_name ?? "");
  const [vetPhone, setVetPhone] = useState(medicalProfile?.vet_phone ?? "");
  const [notes, setNotes] = useState(medicalProfile?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const petBookings = bookings.filter((booking) => booking.pet_id === pet.id || booking.pet_name === pet.name);

  async function saveProfile() {
    setIsSaving(true);
    try {
      const currentProfiles = await loadPetMedicalProfiles(customerId);
      const nextProfile: PetMedicalProfile = {
        pet_id: pet.id,
        allergies: allergies.trim() || null,
        birthday: birthday.trim() || null,
        medications: medications.trim() || null,
        microchip: microchip.trim() || null,
        notes: notes.trim() || null,
        vaccine_status: vaccineStatus,
        vet_name: vetName.trim() || null,
        vet_phone: vetPhone.trim() || null,
        weight_kg: weightKg.trim() || null,
        updated_at: new Date().toISOString()
      };
      const nextProfiles = [
        nextProfile,
        ...currentProfiles.filter((profileItem) => profileItem.pet_id !== pet.id)
      ];
      await savePetMedicalProfiles(customerId, nextProfiles);
      onSave(nextProfiles);
      Alert.alert("Ficha guardada", "La ficha de la mascota quedo actualizada.");
    } catch {
      Alert.alert("No se pudo guardar", "Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.petProfileHeader}>
          <View style={styles.petAvatarLarge}>
            <Feather color="#EE7C2B" name="heart" size={28} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.panelTitle}>{pet.name}</Text>
            <Text style={styles.panelText}>{pet.breed ?? "Raza no indicada"} · {pet.size ?? "Tamaño no indicado"}</Text>
          </View>
        </View>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="calendar" label="Paseos" value={String(petBookings.length)} />
          <SummaryItem icon="map-pin" label="Spots" value={String(spots.length)} />
          <SummaryItem icon="shield" label="Seguro" value={medicalProfile ? "Elegible" : "Ficha pendiente"} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Ficha medica</Text>
        <View style={styles.actionRow}>
          <TextInput
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "decimal-pad"}
            onChangeText={setWeightKg}
            placeholder="Peso kg"
            showSoftInputOnFocus
            style={[styles.input, styles.inputHalf]}
            value={weightKg}
          />
          <Pressable onPress={() => setCalendarVisible(true)} style={[styles.selectButton, styles.inputHalf]}><Text style={birthday ? styles.selectButtonText : styles.selectPlaceholder}>{birthday || "Nacimiento"}</Text><Feather color="#EE7C2B" name="calendar" size={18} /></Pressable>
        </View>
        <CalendarModal onClose={() => setCalendarVisible(false)} onSelect={(date) => { setBirthday(date); setCalendarVisible(false); }} value={birthday} visible={calendarVisible} />
        <Segmented
          items={[
            { label: "Vacunas al dia", value: "al_dia" },
            { label: "Pendiente", value: "pendiente" },
            { label: "No se", value: "desconocido" }
          ]}
          onChange={setVaccineStatus}
          value={vaccineStatus}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setAllergies}
          placeholder="Alergias"
          showSoftInputOnFocus
          style={styles.input}
          value={allergies}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setMedications}
          placeholder="Medicamentos"
          showSoftInputOnFocus
          style={styles.input}
          value={medications}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setMicrochip}
          placeholder="Microchip"
          showSoftInputOnFocus
          style={styles.input}
          value={microchip}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setVetName}
          placeholder="Veterinaria o medico"
          showSoftInputOnFocus
          style={styles.input}
          value={vetName}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "phone-pad"}
          onChangeText={setVetPhone}
          placeholder="Telefono veterinario"
          showSoftInputOnFocus
          style={styles.input}
          value={vetPhone}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setNotes}
          placeholder="Cuidados, conducta o restricciones"
          showSoftInputOnFocus
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={notes}
        />
        <View style={styles.actionRow}>
          <ActionButton busy={false} icon="arrow-left" label="Volver" onPress={onBack} variant="secondary" />
          <ActionButton busy={isSaving} icon="save" label="Guardar ficha" onPress={() => void saveProfile()} variant="primary" />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Seguro medico</Text>
        <Detail icon="shield" text="Usaremos la ficha para cotizar coberturas de urgencia, vacunas, examenes y hospitalizacion." />
        <ActionButton busy={false} icon="shield" label="Ver seguros" onPress={onInsurance} variant="primary" />
      </View>
    </>
  );
}

function InsuranceView({
  medicalProfiles,
  onOpenPet,
  pets,
  plans
}: {
  medicalProfiles: PetMedicalProfile[];
  onOpenPet: (pet: Pet) => void;
  pets: Pet[];
  plans: InsurancePlan[];
}) {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? "");
  const selectedPet = pets.find((pet) => pet.id === selectedPetId);
  const selectedPetProfile = medicalProfiles.find((profileItem) => profileItem.pet_id === selectedPetId);

  function requestPlan(plan: InsurancePlan) {
    if (!selectedPet) {
      Alert.alert("Mascota requerida", "Agrega una mascota antes de contratar un seguro.");
      return;
    }

    if (!selectedPetProfile) {
      Alert.alert("Ficha requerida", "Completa la ficha medica de la mascota antes de solicitar este seguro.", [
        { text: "Completar ficha", onPress: () => onOpenPet(selectedPet) },
        { text: "Cerrar", style: "cancel" }
      ]);
      return;
    }

    Alert.alert("Solicitud enviada", `Preparamos la solicitud de ${plan.name} para ${selectedPet.name}. Falta conectar el endpoint de contratacion.`);
  }

  return (
    <>
      <View style={styles.insuranceHero}>
        <Feather color="#ffffff" name="shield" size={28} />
        <Text style={styles.walletTitle}>Seguros medicos</Text>
        <Text style={styles.walletText}>Cotiza coberturas para urgencias, vacunas, examenes y cuidados veterinarios usando la ficha de tu mascota.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Mascota asegurada</Text>
        <Segmented
          items={pets.map((pet) => ({ label: pet.name, value: pet.id }))}
          onChange={setSelectedPetId}
          value={selectedPetId}
        />
        {selectedPet ? (
          <View style={styles.insurancePetRow}>
            <View style={styles.petAvatar}>
              <Feather color="#EE7C2B" name="heart" size={20} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{selectedPet.name}</Text>
              <Text style={styles.cardText}>{selectedPetProfile ? "Ficha medica lista para cotizar" : "Completa la ficha medica para cotizar"}</Text>
            </View>
            <Pressable onPress={() => onOpenPet(selectedPet)} style={styles.smallIconButton}>
              <Feather color="#EE7C2B" name="clipboard" size={17} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.panelText}>Agrega una mascota para ver planes.</Text>
        )}
      </View>

      {plans.map((plan) => (
        <View key={plan.id} style={styles.insuranceCard}>
          <View style={styles.ticketHeader}>
            <View>
              <Text style={styles.cardTitle}>{plan.name}</Text>
              <Text style={styles.cardText}>{plan.coverage}</Text>
            </View>
            <Text style={styles.insurancePrice}>{formatMoney(plan.price)}/mes</Text>
          </View>
          <InfoRow label="Deducible" value={plan.deductible} />
          {plan.features.map((feature) => <Detail icon="check" key={feature} text={feature} />)}
          <ActionButton busy={false} icon="send" label="Solicitar contratacion" onPress={() => requestPlan(plan)} variant="primary" />
        </View>
      ))}
    </>
  );
}

function CustomerProfileView({ accessToken, customer, onChange, pets, spots }: { accessToken?: string | null; customer: Customer; onChange: (customer: Customer) => void; pets: Pet[]; spots: CustomerSpotUnlock[] }) {
  const [fullName, setFullName] = useState(getCustomerDisplayName(customer));
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [comuna, setComuna] = useState(customer.comuna ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [comunaCatalog, setComunaCatalog] = useState<Array<{ comuna: string; region: string }>>([]);
  const [showComunaCatalog, setShowComunaCatalog] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [skipSearch, setSkipSearch] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);

  useEffect(() => {
    void getChileanComunas(accessToken).then(setComunaCatalog).catch(() => setComunaCatalog([]));
  }, [accessToken]);

  useEffect(() => {
    void getCurrentAccountDeletionRequest(accessToken).then(setDeletionRequest).catch(() => null);
  }, [accessToken]);

  useEffect(() => {
    if (skipSearch) { setSkipSearch(false); return; }
    const timer = setTimeout(() => {
      if (address.trim().length < 3) return setSuggestions([]);
      void searchChileanAddresses(address).then(setSuggestions).catch(() => setSuggestions([]));
    }, 450);
    return () => clearTimeout(timer);
  }, [address]);

  function chooseAddress(suggestion: AddressSuggestion) {
    const catalogEntry = comunaCatalog.find((item) => normalizeText(item.comuna) === normalizeText(suggestion.comuna));
    setSkipSearch(true); setAddress(suggestion.address); setComuna(catalogEntry?.comuna ?? suggestion.comuna); setCity(catalogEntry?.region ?? suggestion.city); setSuggestions([]);
  }

  function chooseComuna(item: { comuna: string; region: string }) {
    setComuna(item.comuna);
    setCity(item.region);
    setShowComunaCatalog(false);
  }

  async function save() {
    if (!fullName.trim() || !phone.trim() || !address.trim() || !comuna.trim() || !city.trim()) {
      Alert.alert("Datos incompletos", "Completa nombre, teléfono, dirección, comuna y ciudad.");
      return;
    }
    setIsSaving(true);
    try {
      const parts = fullName.trim().split(/\s+/);
      const updated = await updateCustomerProfile({
        customerId: customer.id,
        values: { full_name: fullName.trim(), first_name: parts[0], last_name: parts.slice(1).join(" "), phone: phone.trim(), address: address.trim(), comuna: comuna.trim(), city: city.trim() },
        accessToken
      });
      onChange({ ...customer, ...updated });
      Alert.alert("Perfil actualizado", "Tus datos quedaron guardados correctamente.");
    } catch (currentError) {
      if (currentError instanceof ApiError && (currentError.status === 404 || currentError.status === 405)) {
        const localProfile = { ...customer, full_name: fullName.trim(), first_name: fullName.trim().split(/\s+/)[0], last_name: fullName.trim().split(/\s+/).slice(1).join(" "), phone: phone.trim(), address: address.trim(), comuna: comuna.trim(), city: city.trim() };
        await saveCustomerProfileOverride(customer.id, localProfile);
        onChange(localProfile);
        Alert.alert("Perfil guardado", "Los cambios quedaron guardados en este teléfono. La API de sincronización de perfiles aún no está disponible.");
      } else Alert.alert("No se pudo guardar", getCustomerError(currentError));
    }
    finally { setIsSaving(false); }
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Solicitar eliminación de cuenta",
      "NOD eliminará tu perfil y datos personales sujetos a las obligaciones legales de conservación. Esta solicitud requiere verificación.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar solicitud",
          style: "destructive",
          onPress: () => {
            setIsRequestingDeletion(true);
            void createAccountDeletionRequest({
              reason: "Solicitud iniciada desde la aplicación móvil NOD.",
              accessToken
            }).then((request) => {
              if (request) setDeletionRequest(request);
              Alert.alert("Solicitud enviada", "Puedes consultar o cancelar la solicitud desde esta misma pantalla mientras siga pendiente.");
            }).catch((error) => {
              Alert.alert("No se pudo enviar", getCustomerError(error));
            }).finally(() => setIsRequestingDeletion(false));
          }
        }
      ]
    );
  }

  function cancelDeletion() {
    if (!deletionRequest?.id) return;
    Alert.alert("Cancelar solicitud", "Tu cuenta permanecerá activa.", [
      { text: "Volver", style: "cancel" },
      {
        text: "Cancelar solicitud",
        style: "destructive",
        onPress: () => {
          setIsRequestingDeletion(true);
          void cancelAccountDeletionRequest(deletionRequest.id, accessToken).then(() => {
            setDeletionRequest(null);
            Alert.alert("Solicitud cancelada", "La eliminación de tu cuenta fue cancelada.");
          }).catch((error) => {
            Alert.alert("No se pudo cancelar", getCustomerError(error));
          }).finally(() => setIsRequestingDeletion(false));
        }
      }
    ]);
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Editar mis datos</Text>
        <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Nombre completo" showSoftInputOnFocus style={styles.input} value={fullName} />
        <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Teléfono" showSoftInputOnFocus style={styles.input} value={phone} />
        <TextInput autoCorrect={false} onChangeText={setAddress} placeholder="Buscar dirección" showSoftInputOnFocus style={styles.input} value={address} />
        {suggestions.length ? <View style={styles.bookingAddressSuggestions}>{suggestions.map((suggestion) => <Pressable key={suggestion.id} onPress={() => chooseAddress(suggestion)} style={styles.bookingAddressSuggestion}><Feather color="#EE7C2B" name="map-pin" size={17} /><Text style={styles.bookingAddressSuggestionText}>{suggestion.label}</Text></Pressable>)}</View> : null}
        <TextInput onChangeText={(value) => { setComuna(value); setShowComunaCatalog(true); }} onFocus={() => setShowComunaCatalog(true)} placeholder="Buscar comuna" showSoftInputOnFocus style={styles.input} value={comuna} />
        {showComunaCatalog ? <View style={styles.bookingAddressSuggestions}>{comunaCatalog.filter((item) => !comuna.trim() || normalizeText(`${item.comuna} ${item.region}`).includes(normalizeText(comuna))).slice(0, 40).map((item) => <Pressable key={`${item.region}-${item.comuna}`} onPress={() => chooseComuna(item)} style={styles.bookingAddressSuggestion}><Feather color="#EE7C2B" name="map-pin" size={17} /><View><Text style={styles.bookingAddressSuggestionText}>{item.comuna}</Text><Text style={styles.bookingLocationCaption}>{item.region}</Text></View></Pressable>)}</View> : null}
        <TextInput editable={false} placeholder="Ciudad / región" style={[styles.input, { opacity: 0.75 }]} value={city} />
        <ActionButton busy={isSaving} icon="save" label="Guardar cambios" onPress={() => void save()} variant="primary" />
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Datos de cuenta</Text>
        <InfoRow label="Email" value={customer.email ?? "No registrado"} />
        <InfoRow label="RUT" value={customer.rut ?? "No registrado"} />
        <Text style={styles.bookingLocationCaption}>Email y RUT no se editan desde la app porque identifican la cuenta.</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Preferencias</Text>
        <Detail icon="heart" text={`${pets.length} mascota${pets.length === 1 ? "" : "s"} registrada${pets.length === 1 ? "" : "s"}.`} />
        <Detail icon="map-pin" text={`${spots.length} spot${spots.length === 1 ? "" : "s"} unlocked en tu mapa personal.`} />
        <Detail icon="bell" text="Notificaciones de inicio, ruta, fotos y cierre del paseo." />
        <Detail icon="map-pin" text={customer.address ? `Direccion principal: ${customer.address}` : "Agrega una direccion principal para reservas mas rapidas."} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Privacidad y cuenta</Text>
        <Text style={styles.panelText}>Puedes solicitar la eliminación de tu cuenta y datos personales. Algunas transacciones podrán conservarse durante el plazo exigido por ley.</Text>
        {deletionRequest ? (
          <>
            <InfoRow label="Estado de eliminación" value={getStatusLabel(deletionRequest.status)} />
            {deletionRequest.requested_at ? <InfoRow label="Solicitada" value={formatShortDate(deletionRequest.requested_at)} /> : null}
            <ActionButton busy={isRequestingDeletion} icon="x-circle" label="Cancelar solicitud" onPress={cancelDeletion} variant="secondary" />
          </>
        ) : (
          <ActionButton busy={isRequestingDeletion} icon="trash-2" label="Solicitar eliminación de cuenta" onPress={requestAccountDeletion} variant="secondary" />
        )}
      </View>
    </>
  );
}

function SpotUnlocksView({
  accessToken,
  customerId,
  onChange,
  pets,
  spots
}: {
  accessToken?: string | null;
  customerId: string;
  onChange: (spots: CustomerSpotUnlock[]) => void;
  pets: Pet[];
  spots: CustomerSpotUnlock[];
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("park");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<"for_you" | "following" | "nearby">("for_you");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const loadFeed = useCallback(async () => {
    try { setFeed(await getCommunityFeed({ userId: customerId, filter: feedFilter, accessToken })); }
    catch (currentError) { console.warn("community feed", currentError); }
  }, [accessToken, customerId, feedFilter]);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camara requerida", "Necesitamos permiso de camara para agregar una foto del spot.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ["images"],
      quality: 0.75
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri ?? null);
    }
  }

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ubicacion requerida", "Activa la ubicacion para guardar coordenadas del spot.");
      return;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    });
  }

  async function saveSpot() {
    if (!title.trim()) {
      Alert.alert("Nombre requerido", "Ingresa el nombre del lugar desbloqueado.");
      return;
    }

    setIsSaving(true);
    const selectedPet = pets.find((pet) => pet.id === petId);
    try {
      const photoBase64 = photoUri ? await FileSystem.readAsStringAsync(photoUri, { encoding: FileSystem.EncodingType.Base64 }) : null;
      const created = await createCommunitySpot({
        customerId,
        petId: selectedPet?.id,
        title: title.trim(),
        category,
        address: address.trim() || null,
        notes: notes.trim() || null,
        photoBase64,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accessToken
      });
      if (!created) throw new Error("La API no devolvió el spot creado.");
      const nextSpot: CustomerSpotUnlock = { ...created, pet_name: created.pet_name ?? selectedPet?.name ?? null, photo_uri: created.photo_url ?? photoUri };
      const nextSpots = [nextSpot, ...spots.filter((spot) => spot.id !== nextSpot.id)];
      await saveSpotUnlocks(customerId, nextSpots);
      onChange(nextSpots);
      if (photoBase64) {
        await createCommunityPost({ caption: [title.trim(), notes.trim()].filter(Boolean).join(" · "), mediaBase64: photoBase64, petId: selectedPet?.id, location: address.trim() || undefined, accessToken });
        await loadFeed();
      }
      setTitle("");
      setAddress("");
      setNotes("");
      setPhotoUri(null);
      setLocation(null);
      Alert.alert("Spot unlocked", photoBase64 ? "El lugar quedó guardado y publicado en la comunidad." : "El lugar quedó sincronizado. Agrega una foto para publicarlo también en la comunidad.");
    } catch (error) {
      Alert.alert("No se pudo guardar", getCustomerError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <View style={styles.spotHero}>
        <Feather color="#ffffff" name="map-pin" size={28} />
        <Text style={styles.walletTitle}>Spot unlocked</Text>
        <Text style={styles.walletText}>Guarda lugares descubiertos con tus mascotas: plazas, rutas tranquilas, cafes pet friendly o zonas de juego.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Nuevo lugar</Text>
        <Segmented
          items={pets.map((pet) => ({ label: pet.name, value: pet.id }))}
          onChange={setPetId}
          value={petId}
        />
        <Segmented
          items={[
            { label: "Plaza", value: "park" },
            { label: "Ruta", value: "route" },
            { label: "Pet friendly", value: "pet_friendly" },
            { label: "Juego", value: "play_zone" }
          ]}
          onChange={setCategory}
          value={category}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setTitle}
          placeholder="Nombre del spot"
          showSoftInputOnFocus
          style={styles.input}
          value={title}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setAddress}
          placeholder="Direccion o referencia"
          showSoftInputOnFocus
          style={styles.input}
          value={address}
        />
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          multiline
          onChangeText={setNotes}
          placeholder="Que lo hace especial"
          showSoftInputOnFocus
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={notes}
        />
        <View style={styles.actionRow}>
          <ActionButton busy={false} icon="camera" label={photoUri ? "Cambiar foto" : "Foto"} onPress={() => void takePhoto()} variant="secondary" />
          <ActionButton busy={false} icon="crosshair" label={location ? "Ubicacion lista" : "Ubicacion"} onPress={() => void useCurrentLocation()} variant="secondary" />
        </View>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.spotPreviewImage} /> : null}
        {location ? <Text style={styles.cardText}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text> : null}
        <ActionButton busy={isSaving} icon="unlock" label="Desbloquear spot" onPress={() => void saveSpot()} variant="primary" />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Progreso y medallas</Text>
        <Text style={styles.panelText}>Ganas 100 puntos por lugar y bonos por foto, GPS y variedad.</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="award" label="Puntos" value={String(getCommunityPoints(spots))} />
          <SummaryItem icon="star" label="Medallas" value={String(getCommunityBadges(spots).length)} />
          <SummaryItem icon="map" label="Categorías" value={String(new Set(spots.map((spot) => spot.category)).size)} />
        </View>
        {getCommunityBadges(spots).map((badge) => <Detail key={badge.name} icon={badge.icon} text={`${badge.name}: ${badge.description}`} />)}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Comunidad y mapa personal</Text>
        <Text style={styles.panelText}>Comparte descubrimientos, reacciona y conversa con otros tutores.</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="map-pin" label="Spots" value={String(spots.length)} />
          <SummaryItem icon="camera" label="Con foto" value={String(spots.filter((spot) => Boolean(spot.photo_uri)).length)} />
          <SummaryItem icon="crosshair" label="Con GPS" value={String(spots.filter((spot) => spot.latitude && spot.longitude).length)} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Feed de la comunidad</Text>
        <Segmented items={[{ label: "Para ti", value: "for_you" }, { label: "Siguiendo", value: "following" }, { label: "Cerca", value: "nearby" }]} onChange={(value) => setFeedFilter(value as typeof feedFilter)} value={feedFilter} />
        {feed.length === 0 ? <Text style={styles.panelText}>Aún no hay publicaciones para este filtro.</Text> : feed.map((post) => <View key={post.id} style={styles.spotCard}>
          {post.media_url ? <Image source={{ uri: post.media_url }} style={styles.spotImage} /> : null}
          <View style={[styles.cardCopy, styles.spotCardBody]}><Text style={styles.cardTitle}>{post.author?.display_name ?? post.pet?.name ?? "Comunidad NOD"}</Text><Text style={styles.cardText}>{post.caption}</Text>{post.location ? <Text style={styles.cardText}><Feather name="map-pin" size={13} /> {post.location}</Text> : null}
            <View style={styles.actionRow}><Pressable onPress={() => void toggleCommunityLike(post.id, accessToken).then(loadFeed).catch((currentError) => Alert.alert("No se pudo reaccionar", getCustomerError(currentError)))} style={styles.smallSecondaryButton}><Text style={styles.smallSecondaryButtonText}>{post.user_has_liked ? "♥" : "♡"} {post.likes_count ?? 0}</Text></Pressable><Text style={styles.cardText}>{post.comments_count ?? 0} comentarios</Text></View>
            <View style={styles.actionRow}><TextInput onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))} placeholder="Escribe un comentario" showSoftInputOnFocus style={[styles.input, styles.cardCopy]} value={commentDrafts[post.id] ?? ""} /><Pressable onPress={() => { const content = commentDrafts[post.id]?.trim(); if (!content) return; void addCommunityComment(post.id, content, petId || undefined, accessToken).then(() => { setCommentDrafts((current) => ({ ...current, [post.id]: "" })); return loadFeed(); }).catch((currentError) => Alert.alert("No se pudo comentar", getCustomerError(currentError))); }} style={styles.smallPrimaryButton}><Feather color="#ffffff" name="send" size={16} /></Pressable></View>
          </View>
        </View>)}
      </View>

      {spots.length === 0 ? <EmptyState text="Aun no desbloqueas lugares con tus mascotas." /> : null}
      {spots.map((spot) => <SpotUnlockCard key={spot.id} spot={spot} />)}
    </>
  );
}

function SpotUnlockCard({ spot }: { spot: CustomerSpotUnlock }) {
  return (
    <View style={styles.spotCard}>
      {spot.photo_uri ? (
        <Image source={{ uri: spot.photo_uri }} style={styles.spotImage} />
      ) : (
        <View style={styles.spotImageFallback}>
          <Feather color="#EE7C2B" name="map-pin" size={24} />
        </View>
      )}
      <View style={[styles.cardCopy, styles.spotCardBody]}>
        <View style={styles.ticketHeader}>
          <Text style={styles.cardTitle}>{spot.title}</Text>
          <Text style={styles.statusText}>{getSpotCategoryLabel(spot.category)}</Text>
        </View>
        <Text style={styles.cardText}>{spot.pet_name ?? "Mascota"} · {formatShortDate(spot.unlocked_at)}</Text>
        {spot.address ? <Text style={styles.cardText}>{spot.address}</Text> : null}
        {spot.notes ? <Text style={styles.cardText}>{spot.notes}</Text> : null}
        {spot.latitude && spot.longitude ? (
          <Text style={styles.cardText}>{spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function CalendarModal({ onClose, onSelect, value, visible }: { onClose: () => void; onSelect: (date: string) => void; value: string; visible: boolean }) {
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  useEffect(() => {
    if (visible) setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
  }, [visible, value]);
  const firstDay = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];

  return <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}><View style={styles.calendarOverlay}><View style={styles.calendarCard}><View style={styles.calendarHeader}><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Feather color="#EE7C2B" name="chevron-left" size={24} /></Pressable><Text style={styles.calendarTitle}>{month.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}</Text><Pressable disabled={month >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Feather color="#EE7C2B" name="chevron-right" size={24} /></Pressable></View><View style={styles.calendarGrid}>{["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}{cells.map((day, index) => day == null ? <View key={`empty-${index}`} style={styles.calendarDay} /> : <Pressable key={day} onPress={() => { const date = new Date(month.getFullYear(), month.getMonth(), day); if (date <= new Date()) onSelect(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`); }} style={styles.calendarDay}><Text style={styles.calendarDayText}>{day}</Text></Pressable>)}</View><Pressable onPress={onClose} style={styles.calendarClose}><Text style={styles.calendarCloseText}>Cancelar</Text></Pressable></View></View></Modal>;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEmbeddedMapUrl(latitude: number, longitude: number) {
  const latitudeDelta = 0.008;
  const longitudeDelta = 0.012;
  const bbox = [longitude - longitudeDelta, latitude - latitudeDelta, longitude + longitudeDelta, latitude + latitudeDelta].map((value) => value.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
}

function getCustomerDisplayName(customer: Customer) {
  const fullName = customer.full_name?.trim();
  if (fullName && fullName.length > 2) {
    return fullName;
  }

  const composedName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim();
  if (composedName.length > 2) {
    return composedName;
  }

  return customer.email ?? "Cliente NOD";
}

function ProviderCard({ provider, onPress, rank }: { provider: CustomerProvider; onPress: () => void; rank: number }) {
  return (
    <Pressable onPress={onPress} style={styles.providerCard}>
      {provider.photo_url ? (
        <Image source={{ uri: provider.photo_url }} style={styles.providerPhoto} />
      ) : (
        <View style={styles.providerPhotoFallback}>
          <Feather color="#EE7C2B" name="user" size={22} />
        </View>
      )}
      <View style={styles.cardCopy}>
        <View style={styles.verifiedTitle}><Text style={styles.rankBadge}>#{rank}</Text><Text style={styles.cardTitle}>{provider.full_name ?? "Paseador NOD"}</Text>{isProviderVerified(provider) ? <View style={styles.verifiedBadge}><Feather color="#367D5F" name="check-circle" size={13} /><Text style={styles.verifiedBadgeText}>Verificado</Text></View> : null}</View>
        <Text style={styles.cardText}>{formatRating(provider.rating)} · {provider.review_count ?? 0} reseñas · {provider.completed_services ?? 0} servicios</Text>
        {provider.distance_km != null ? <Text style={styles.distanceText}>A {provider.distance_km.toFixed(1)} km de ti</Text> : null}
        <Text style={styles.cardText}>Desde {formatMoney(provider.price_from ?? 0, provider.currency ?? "CLP")}</Text>
        {provider.zones?.length ? <Text style={styles.cardText}>{provider.zones.slice(0, 3).join(", ")}</Text> : null}
        <Text style={styles.providerSelectText}>Seleccionar y reservar</Text>
      </View>
      <Feather color="#EE7C2B" name="chevron-right" size={20} />
    </Pressable>
  );
}

function isProviderVerified(provider: CustomerProvider) {
  return provider.verified === true || provider.verification_status === "approved" || provider.verification_status === "verified";
}

function BookingGroup({
  bookings,
  onOpenBooking,
  title
}: {
  bookings: CustomerBooking[];
  onOpenBooking: (booking: CustomerBooking) => void;
  title: string;
}) {
  if (bookings.length === 0) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {bookings.map((booking, index) => (
        <BookingRow booking={booking} key={getBookingId(booking) ?? index} onPress={() => onOpenBooking(booking)} />
      ))}
    </View>
  );
}

function SummaryItem({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Feather color="#EE7C2B" name={icon} size={17} />
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  return (
    <View style={styles.transactionRow}>
      <View style={styles.bookingIcon}>
        <Feather color="#EE7C2B" name={transaction.amount < 0 ? "arrow-up-right" : "arrow-down-left"} size={17} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{transaction.description ?? getStatusLabel(transaction.type)}</Text>
        <Text style={styles.cardText}>{formatShortDate(transaction.created_at)} · {getStatusLabel(transaction.status)}</Text>
      </View>
      <Text style={styles.moneyText}>{formatMoney(transaction.amount, transaction.currency ?? "CLP")}</Text>
    </View>
  );
}

function MetricCard({ icon, label, value, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.metricCard}>
      <Feather color="#EE7C2B" name={icon} size={22} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <Feather color="#EE7C2B" name={icon} size={18} />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

function BookingRow({ booking, onPress }: { booking: CustomerBooking; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.bookingRow}>
      <View style={styles.bookingIcon}>
        <Feather color="#EE7C2B" name="navigation" size={17} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{booking.product_name ?? booking.service_name ?? "Paseo"}</Text>
        <Text style={styles.cardText}>{booking.provider_name ?? "Paseador por confirmar"} · {formatBookingTime(booking)}</Text>
      </View>
      <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
    </Pressable>
  );
}

function Segmented({ items, value, onChange }: { items: Array<{ label: string; value: string }>; value: string; onChange: (value: string) => void }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.segmented}>
      {items.map((item) => (
        <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.segment, value === item.value && styles.segmentSelected]}>
          <Text style={[styles.segmentText, value === item.value && styles.segmentTextSelected]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function RoutePreview({ error, route }: { error?: string | null; route: ServiceLocation[] }) {
  const coordinates = route
    .map(({ latitude, longitude }) => [Number(latitude), Number(longitude)] as const)
    .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

  return (
    <View style={styles.routePanel}>
      {coordinates.length > 0 ? (
        <WebView
          javaScriptEnabled
          originWhitelist={["*"]}
          scrollEnabled={false}
          source={{ html: getRouteMapHtml(coordinates) }}
          style={styles.routeMap}
        />
      ) : (
        <View style={styles.routeEmpty}>
          <Feather color="#626D84" name={error ? "alert-circle" : "map-pin"} size={28} />
          <Text style={styles.routeEmptyTitle}>{error ? "No pudimos cargar la ruta" : "Sin recorrido registrado"}</Text>
          <Text style={styles.routeEmptyText}>{error ?? "Este servicio no tiene puntos GPS guardados."}</Text>
        </View>
      )}
    </View>
  );
}

function getRouteMapHtml(coordinates: ReadonlyArray<readonly [number, number]>) {
  const points = JSON.stringify(coordinates);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0} .leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const points=${points};const map=L.map('map',{zoomControl:false,attributionControl:true});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);const line=L.polyline(points,{color:'#EE7C2B',weight:5,opacity:.95}).addTo(map);L.circleMarker(points[0],{radius:7,color:'#fff',weight:3,fillColor:'#185FA5',fillOpacity:1}).addTo(map);L.circleMarker(points[points.length-1],{radius:8,color:'#fff',weight:3,fillColor:'#EE7C2B',fillOpacity:1}).addTo(map);if(points.length===1){map.setView(points[0],16)}else{map.fitBounds(line.getBounds(),{padding:[28,28]})}</script></body></html>`;
}

function getBookingEndpointRoute(booking: CustomerBooking, bookingId: string): ServiceLocation[] {
  const points = [
    {
      latitude: booking.start_latitude,
      longitude: booking.start_longitude,
      recorded_at: booking.started_at ?? booking.starts_at
    },
    {
      latitude: booking.completion_latitude,
      longitude: booking.completion_longitude,
      recorded_at: booking.completed_at ?? booking.ends_at
    }
  ];

  return points.flatMap((point) => {
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && point.latitude != null && point.longitude != null
      ? [{ booking_id: bookingId, latitude, longitude, recorded_at: point.recorded_at }]
      : [];
  });
}

function isPaidBooking(booking: CustomerBooking) {
  return ["paid", "approved", "authorized", "captured"].includes(normalizeStatus(booking.payment_status ?? ""));
}

type RefundDestination = "original_payment_method" | "nod_credits";

function chooseRefundDestination(booking: CustomerBooking): Promise<RefundDestination | undefined | null> {
  return new Promise((resolve) => {
    if (!isPaidBooking(booking)) {
      Alert.alert("Cancelar servicio", "¿Confirmas que deseas cancelar esta reserva?", [
        { text: "Volver", style: "cancel", onPress: () => resolve(null) },
        { text: "Cancelar reserva", style: "destructive", onPress: () => resolve(undefined) }
      ], { cancelable: true, onDismiss: () => resolve(null) });
      return;
    }

    const paymentMethod = normalizeStatus(booking.payment_method ?? booking.payment_provider ?? "");
    if (paymentMethod.includes("nod") || paymentMethod.includes("credit")) {
      Alert.alert("Cancelar y devolver créditos", "Los Créditos NOD usados volverán a tu wallet.", [
        { text: "Volver", style: "cancel", onPress: () => resolve(null) },
        { text: "Confirmar", style: "destructive", onPress: () => resolve("nod_credits") }
      ], { cancelable: true, onDismiss: () => resolve(null) });
      return;
    }

    Alert.alert("¿Cómo quieres recibir la devolución?", "El reembolso al medio original puede tardar según Mercado Pago y el banco.", [
      { text: "Volver", style: "cancel", onPress: () => resolve(null) },
      { text: "Créditos NOD", onPress: () => resolve("nod_credits") },
      { text: "Medio de pago original", onPress: () => resolve("original_payment_method") }
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}

function formatCredits(value: number) {
  return `${new Intl.NumberFormat("es-CL").format(Math.max(0, value))} créditos`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Feather color="#626D84" name={icon} size={15} />
      <Text style={styles.panelText}>{text}</Text>
    </View>
  );
}

function ActionButton({
  busy,
  icon,
  label,
  onPress,
  variant
}: {
  busy?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  return (
    <Pressable disabled={busy} onPress={onPress} style={[styles.actionButton, variant === "primary" ? styles.actionPrimary : styles.actionSecondary]}>
      {busy ? <ActivityIndicator color="#ffffff" /> : <Feather color="#ffffff" name={icon} size={16} />}
      <Text style={[styles.actionText, variant === "primary" ? styles.actionTextPrimary : styles.actionTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Feather color="#888780" name="inbox" size={24} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function LoadingBlock() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#EE7C2B" />
    </View>
  );
}

function getViewTitle(view: CustomerView) {
  const titles: Record<CustomerView, string> = {
    activity: "Actividad",
    benefits: "Beneficios",
    booking: "Reservar",
    dog_match: "Conecta mascotas",
    explore: "Explorar",
    home: "Inicio",
    insurance: "Seguros",
    safety: "Centro de seguridad",
    pets: "Mascotas",
    pet_profile: "Ficha mascota",
    profile: "Perfil",
    residential: "Residencial",
    notifications: "Notificaciones",
    spots: "Spot unlocked",
    support: "Soporte",
    wallet: "Wallet"
  };

  return titles[view];
}

function sortBookings(bookings: CustomerBooking[]) {
  return [...bookings].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function replaceBooking(bookings: CustomerBooking[], updatedBooking: CustomerBooking) {
  const updatedId = getBookingId(updatedBooking);
  return sortBookings(bookings.map((booking) => getBookingId(booking) === updatedId ? updatedBooking : booking));
}

function getBookingId(booking: CustomerBooking) {
  return booking.id ?? booking.booking_id ?? booking.reservation_id ?? null;
}

function isUpcomingBooking(booking: CustomerBooking) {
  return isUpcomingStatus(booking.status);
}

function isActiveBooking(booking: CustomerBooking) {
  return isActiveStatus(booking.status);
}

function normalizeStatus(status: string) {
  return normalizeBookingStatus(status);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    accepted: "Aceptada",
    cancelled: "Cancelada",
    completed: "Finalizada",
    in_progress: "En curso",
    paused: "Pausada",
    pending: "Pendiente",
    requested: "Solicitada",
    scheduled: "Agendada",
    started: "En curso"
  };

  return labels[normalizeStatus(status)] ?? status;
}

function getBookingProgressIndex(status: string) {
  const normalized = normalizeStatus(status);
  if (["completed"].includes(normalized)) {
    return 3;
  }
  if (["in_progress", "started", "paused"].includes(normalized)) {
    return 2;
  }
  if (["accepted", "scheduled"].includes(normalized)) {
    return 1;
  }
  return 0;
}

function formatBookingTime(booking: CustomerBooking) {
  const date = new Date(booking.starts_at);
  if (Number.isNaN(date.getTime())) {
    return "Horario por confirmar";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function formatMoney(amount: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

function formatDistance(distanceMeters?: number) {
  if (!distanceMeters) {
    return "Pendiente";
  }

  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function formatDuration(durationSeconds?: number) {
  if (!durationSeconds) {
    return "Pendiente";
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

function estimateArrival(route: ServiceLocation[], booking: CustomerBooking) {
  const status = normalizeStatus(booking.status);
  if (["in_progress", "started", "paused"].includes(status)) {
    const latest = route.at(-1);
    return latest ? `GPS ${formatShortTime(latest.recorded_at)}` : "Actualizando";
  }
  const minutes = Math.ceil((new Date(booking.starts_at).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return "Por iniciar";
  if (minutes < 60) return `en ${minutes} min`;
  return formatShortTime(booking.starts_at);
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatRating(rating?: number | null) {
  return rating ? rating.toFixed(1) : "Nuevo";
}

function getPhotoLabel(type: string) {
  const labels: Record<string, string> = {
    completion: "Cierre",
    during: "Durante",
    incident: "Incidente",
    start: "Inicio"
  };

  return labels[normalizeStatus(type)] ?? "Foto";
}

function getSpotCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    park: "Plaza",
    pet_friendly: "Pet friendly",
    play_zone: "Juego",
    route: "Ruta"
  };

  return labels[category] ?? category;
}

function getCommunityPoints(spots: CustomerSpotUnlock[]) {
  const categories = new Set(spots.map((spot) => spot.category)).size;
  return spots.reduce((points, spot) => points + 100 + (spot.photo_url || spot.photo_uri ? 40 : 0) + (spot.latitude != null && spot.longitude != null ? 40 : 0), 0) + categories * 25;
}

function getCommunityBadges(spots: CustomerSpotUnlock[]): Array<{ name: string; description: string; icon: keyof typeof Feather.glyphMap }> {
  const badges: Array<{ name: string; description: string; icon: keyof typeof Feather.glyphMap }> = [];
  if (spots.length >= 1) badges.push({ name: "Primera huella", description: "Desbloqueaste tu primer lugar", icon: "map-pin" });
  if (spots.filter((spot) => spot.photo_url || spot.photo_uri).length >= 3) badges.push({ name: "Fotógrafo peludo", description: "Publicaste 3 lugares con foto", icon: "camera" });
  if (spots.filter((spot) => spot.latitude != null && spot.longitude != null).length >= 5) badges.push({ name: "Explorador GPS", description: "Registraste 5 ubicaciones verificables", icon: "compass" });
  if (new Set(spots.map((spot) => spot.category)).size >= 4) badges.push({ name: "Guía de la ciudad", description: "Descubriste las 4 categorías", icon: "award" });
  if (spots.length >= 10) badges.push({ name: "Leyenda NOD", description: "Llegaste a 10 spots", icon: "star" });
  return badges;
}

function getSpotStoragePath(customerId: string) {
  return `${FileSystem.documentDirectory ?? ""}nod-spots-${customerId}.json`;
}

function getPetMedicalProfileStoragePath(customerId: string) {
  return `${FileSystem.documentDirectory ?? ""}nod-pet-medical-profiles-${customerId}.json`;
}

function getCustomerProfileOverridePath(customerId: string) {
  return `${FileSystem.documentDirectory}nod-customer-profile-${customerId}.json`;
}

async function loadCustomerProfileOverride(customerId: string): Promise<Partial<Customer> | null> {
  try {
    return JSON.parse(await FileSystem.readAsStringAsync(getCustomerProfileOverridePath(customerId))) as Partial<Customer>;
  } catch { return null; }
}

async function saveCustomerProfileOverride(customerId: string, profile: Customer) {
  await FileSystem.writeAsStringAsync(getCustomerProfileOverridePath(customerId), JSON.stringify(profile));
}

async function loadSpotUnlocks(customerId: string) {
  try {
    const path = getSpotStoragePath(customerId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return [];
    }

    const text = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(text) as CustomerSpotUnlock[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveSpotUnlocks(customerId: string, spots: CustomerSpotUnlock[]) {
  await FileSystem.writeAsStringAsync(getSpotStoragePath(customerId), JSON.stringify(spots));
}

async function loadPetMedicalProfiles(customerId: string) {
  try {
    const path = getPetMedicalProfileStoragePath(customerId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      return [];
    }

    const text = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(text) as PetMedicalProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePetMedicalProfiles(customerId: string, profiles: PetMedicalProfile[]) {
  await FileSystem.writeAsStringAsync(getPetMedicalProfileStoragePath(customerId), JSON.stringify(profiles));
}

function getCustomerError(error: unknown) {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    return "La API key cliente es valida, pero solo tiene permisos de lectura. Pide habilitar permisos de escritura para clientes, mascotas, reservas y soporte.";
  }

  return getFriendlyError(error, "No se pudo completar la acción.");
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

const styles = StyleSheet.create({
  bookingAddressSuggestions: { backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, marginTop: -6, overflow: "hidden" },
  bookingAddressSuggestion: { alignItems: "center", borderBottomColor: "#E7E0DA", borderBottomWidth: 1, flexDirection: "row", gap: 9, minHeight: 50, paddingHorizontal: 12, paddingVertical: 8 },
  bookingAddressSuggestionText: { color: "#1D2330", flex: 1, fontSize: 13, fontWeight: "700" },
  currentLocationButton: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 4 },
  currentLocationButtonText: { color: "#367D5F", fontSize: 13, fontWeight: "900" },
  bookingMapWrap: { borderRadius: 10, height: 220, overflow: "hidden", position: "relative", width: "100%" },
  bookingMap: { backgroundColor: "#E7E0DA", height: "100%", width: "100%" },
  bookingMapPlaceholder: { alignItems: "center", backgroundColor: "#FCFAF7", borderColor: "#E7E0DA", borderRadius: 10, borderStyle: "dashed", borderWidth: 1, gap: 8, height: 150, justifyContent: "center", padding: 20 },
  bookingLocationCaption: { color: "#626D84", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  rankingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 4, marginTop: 8 },
  rankingCount: { color: "#367D5F", fontSize: 12, fontWeight: "900" },
  providerSelectText: { color: "#EE7C2B", fontSize: 12, fontWeight: "900", marginTop: 5 },
  screen: {
    backgroundColor: "#FCFAF7",
    flex: 1
  },
  container: {
    padding: 20,
    paddingBottom: 28,
    paddingTop: 56
  },
  bottomNav: {
    backgroundColor: "#ffffff",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: Platform.OS === "ios" ? 18 : 8,
    paddingHorizontal: 6,
    paddingTop: 8
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 48
  },
  bottomNavText: {
    color: "#626D84",
    fontSize: 10,
    fontWeight: "800"
  },
  bottomNavTextSelected: {
    color: "#EE7C2B"
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18
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
    textTransform: "uppercase"
  },
  title: {
    color: "#1D2330",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4
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
  subHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  subHeaderTitle: {
    color: "#1D2330",
    fontSize: 20,
    fontWeight: "900"
  },
  hero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    gap: 12,
    padding: 20
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0
  },
  heroText: {
    color: "#E7E0DA",
    fontSize: 15,
    lineHeight: 22
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  heroPrimaryButton: {
    alignSelf: "stretch",
    justifyContent: "center"
  },
  heroSecondaryRow: {
    flexDirection: "row",
    gap: 10
  },
  heroSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 10
  },
  heroSecondaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 14,
    padding: 16
  },
  panelTitle: {
    color: "#1D2330",
    fontSize: 16,
    fontWeight: "900"
  },
  panelText: {
    color: "#626D84",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryItem: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 6,
    minHeight: 94,
    padding: 12
  },
  summaryValue: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18
  },
  summaryLabel: {
    color: "#626D84",
    fontSize: 11,
    fontWeight: "800"
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: 16
  },
  metricValue: {
    color: "#1D2330",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 18
  },
  metricLabel: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 8,
    minHeight: 82,
    justifyContent: "center",
    padding: 10
  },
  quickText: {
    color: "#1D2330",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  liveCard: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderColor: "#F5C4B3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 14
  },
  spotFeatured: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#EAF3DE",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 12
  },
  spotFeaturedImage: {
    borderRadius: 8,
    height: 48,
    width: 48
  },
  liveDot: {
    backgroundColor: "#367D5F",
    borderRadius: 7,
    height: 14,
    width: 14
  },
  cardCopy: {
    flex: 1
  },
  cardTitle: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "900"
  },
  cardText: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  matchTabs: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginVertical: 14,
    padding: 6
  },
  matchFilters: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
    padding: 12
  },
  filterLabel: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "900"
  },
  filterChip: {
    backgroundColor: "#FCFAF7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  filterChipSelected: {
    backgroundColor: "#EE7C2B"
  },
  filterChipText: {
    color: "#626D84",
    fontSize: 11,
    fontWeight: "800"
  },
  filterChipTextSelected: {
    color: "#ffffff"
  },
  distanceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  distanceButton: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderRadius: 999,
    minWidth: 34,
    padding: 7
  },
  matchTab: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44
  },
  matchTabSelected: {
    backgroundColor: "#EE7C2B"
  },
  matchTabText: {
    color: "#EE7C2B",
    fontSize: 13,
    fontWeight: "900"
  },
  matchTabTextSelected: {
    color: "#ffffff"
  },
  demoNotice: {
    backgroundColor: "#FFF3CD",
    borderColor: "#E8C96C",
    borderRadius: 8,
    borderWidth: 1,
    color: "#6B5720",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginBottom: 12,
    padding: 11
  },
  discoveryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden"
  },
  discoveryPhoto: {
    aspectRatio: 1.15,
    width: "100%"
  },
  discoveryPhotoFallback: {
    alignItems: "center",
    aspectRatio: 1.15,
    backgroundColor: "#FBE5DA",
    justifyContent: "center",
    width: "100%"
  },
  discoveryPhotoName: {
    color: "#EE7C2B",
    fontSize: 54,
    fontWeight: "900",
    marginTop: 8
  },
  discoveryBody: {
    gap: 10,
    padding: 18
  },
  discoveryHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  discoveryName: {
    color: "#1D2330",
    fontSize: 25,
    fontWeight: "900"
  },
  compatibilityBadge: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  compatibilityText: {
    color: "#367D5F",
    fontSize: 13,
    fontWeight: "900"
  },
  inlineInfo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  discoveryBio: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  privacyText: { color: "#626D84", fontSize: 11, fontWeight: "700", lineHeight: 16 },
  safetyActions: { flexDirection: "row", gap: 20, justifyContent: "flex-end" },
  safetyLink: { color: "#626D84", fontSize: 12, fontWeight: "900" },
  safetyDanger: { color: "#B83A3A", fontSize: 12, fontWeight: "900" },
  discoveryTag: {
    backgroundColor: "#FCFAF7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  discoveryTagText: {
    color: "#626D84",
    fontSize: 11,
    fontWeight: "900"
  },
  swipeActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
    paddingBottom: 20,
    paddingHorizontal: 18
  },
  undoButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginBottom: 16,
    minHeight: 40
  },
  undoText: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "800"
  },
  swipeButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  passButton: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderWidth: 1
  },
  superButton: {
    backgroundColor: "#E6F1FB",
    borderColor: "#B5D6E8",
    borderWidth: 1
  },
  likeButton: {
    backgroundColor: "#EE7C2B"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  matchRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 14
  },
  matchChat: { backgroundColor: "#FCFAF7", borderColor: "#E7E0DA", borderRadius: 10, borderWidth: 1, gap: 8, marginBottom: 12, marginTop: -4, padding: 12 },
  matchMessage: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderRadius: 12, maxWidth: "85%", paddingHorizontal: 11, paddingVertical: 8 },
  matchMessageOwn: { alignSelf: "flex-end", backgroundColor: "#FBE5DA" },
  matchMessageText: { color: "#1D2330", fontSize: 13, fontWeight: "700" },
  chatComposer: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  chatInput: { backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 44, paddingHorizontal: 12 },
  chatSend: { alignItems: "center", backgroundColor: "#EE7C2B", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  bookingChatList: { gap: 8, marginBottom: 10, marginTop: 12 },
  ratingRow: { flexDirection: "row", gap: 12, marginVertical: 16 },
  verifiedTitle: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 7 },
  verifiedBadge: { alignItems: "center", backgroundColor: "#EAF3DE", borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedBadgeText: { color: "#367D5F", fontSize: 10, fontWeight: "900" },
  safetyHero: { alignItems: "center", backgroundColor: "#367D5F", borderRadius: 12, flexDirection: "row", gap: 14, marginBottom: 14, padding: 18 },
  safetyHeroTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  safetyHeroText: { color: "#EAF3DE", fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 4 },
  safetyItem: { alignItems: "flex-start", flexDirection: "row", gap: 12, marginTop: 14 },
  sosButton: { alignItems: "center", backgroundColor: "#B83A3A", borderRadius: 10, flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 18, minHeight: 54 },
  sosButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  matchAvatar: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: 6
  },
  unreadText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  providerCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14
  },
  providerPhoto: {
    borderRadius: 8,
    height: 56,
    width: 56
  },
  providerPhotoFallback: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipSelected: {
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B"
  },
  chipText: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "900"
  },
  chipTextSelected: {
    color: "#ffffff"
  },
  input: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "800",
    minHeight: 46,
    paddingHorizontal: 12
  },
  inputHalf: {
    flex: 1
  },
  selectButton: { alignItems: "center", backgroundColor: "#FCFAF7", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 46, paddingHorizontal: 12 },
  selectButtonText: { color: "#1D2330", fontSize: 14, fontWeight: "800" },
  selectPlaceholder: { color: "#8A91A0", fontSize: 14, fontWeight: "700" },
  breedPicker: { gap: 8 },
  breedList: { backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, maxHeight: 220 },
  breedItem: { borderBottomColor: "#F1EFE8", borderBottomWidth: 1, padding: 12 },
  breedItemText: { color: "#1D2330", fontSize: 14 },
  rankBadge: { backgroundColor: "#EE7C2B", borderRadius: 999, color: "#ffffff", fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  distanceText: { color: "#367D5F", fontSize: 12, fontWeight: "900", marginTop: 3 },
  calendarOverlay: { alignItems: "center", backgroundColor: "rgba(29,35,48,0.48)", flex: 1, justifyContent: "center", padding: 24 },
  calendarCard: { backgroundColor: "#ffffff", borderRadius: 14, padding: 18, width: "100%" },
  calendarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  calendarTitle: { color: "#1D2330", fontSize: 17, fontWeight: "900", textTransform: "capitalize" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarWeekday: { color: "#626D84", fontSize: 11, fontWeight: "900", textAlign: "center", width: "14.285%" },
  calendarDay: { alignItems: "center", height: 42, justifyContent: "center", width: "14.285%" },
  calendarDayText: { color: "#1D2330", fontSize: 14, fontWeight: "700" },
  calendarClose: { alignItems: "center", marginTop: 10, padding: 10 },
  calendarCloseText: { color: "#EE7C2B", fontSize: 14, fontWeight: "900" },
  textArea: {
    minHeight: 92,
    paddingTop: 10
  },
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  segment: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  segmentSelected: {
    backgroundColor: "#EAF3DE",
    borderColor: "#EE7C2B"
  },
  segmentText: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "900"
  },
  segmentTextSelected: {
    color: "#EE7C2B"
  },
  actionRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12
  },
  actionPrimary: {
    backgroundColor: "#EE7C2B"
  },
  actionSecondary: {
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B",
    borderWidth: 1
  },
  actionText: {
    fontSize: 13,
    fontWeight: "900"
  },
  actionTextPrimary: {
    color: "#ffffff"
  },
  actionTextSecondary: {
    color: "#ffffff"
  },
  bookingErrorCard: {
    alignItems: "center",
    backgroundColor: "#FFF3E8",
    borderColor: "#F5C9A3",
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 20
  },
  petCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    padding: 14
  },
  petAvatar: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  petAvatarLarge: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  petProfileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  bookingRow: {
    alignItems: "center",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12
  },
  bookingIcon: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  statusText: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900"
  },
  statusRail: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  statusStep: {
    alignItems: "center",
    flex: 1,
    gap: 6
  },
  statusDot: {
    backgroundColor: "#E7E0DA",
    borderRadius: 7,
    height: 14,
    width: 14
  },
  statusDotDone: {
    backgroundColor: "#EE7C2B"
  },
  statusStepText: {
    color: "#626D84",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center"
  },
  routePanel: {
    backgroundColor: "#E6F1FB",
    borderRadius: 8,
    height: 210,
    marginTop: 14,
    overflow: "hidden",
    position: "relative"
  },
  paymentAction: {
    marginTop: 14
  },
  routeMap: {
    flex: 1
  },
  routeEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  routeEmptyTitle: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10
  },
  routeEmptyText: {
    color: "#626D84",
    fontSize: 13,
    marginTop: 5,
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
    overflow: "hidden",
    width: "47%"
  },
  photoPreview: {
    backgroundColor: "#E7E0DA",
    height: 104,
    width: "100%"
  },
  photoLabel: {
    color: "#1D2330",
    fontSize: 12,
    fontWeight: "900",
    padding: 9
  },
  walletHero: {
    backgroundColor: "#1D2330",
    borderRadius: 8,
    gap: 8,
    padding: 20
  },
  spotHero: {
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    gap: 8,
    padding: 20
  },
  insuranceHero: {
    backgroundColor: "#042C53",
    borderRadius: 8,
    gap: 8,
    padding: 20
  },
  walletTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900"
  },
  walletText: {
    color: "#E7E0DA",
    fontSize: 14,
    fontWeight: "800"
  },
  walletBalance: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900"
  },
  creditPackages: {
    gap: 10,
    marginTop: 12
  },
  creditPackage: {
    alignItems: "center",
    borderColor: "#E7E0DA",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  creditBonus: {
    color: "#367D5F",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  benefitCard: {
    alignItems: "flex-start",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12
  },
  ticketCard: {
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 12
  },
  ticketHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  insurancePetRow: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  smallIconButton: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderColor: "#F5C4B3",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  insuranceCard: {
    backgroundColor: "#ffffff",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 14,
    padding: 16
  },
  insurancePrice: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },
  transactionRow: {
    alignItems: "center",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12
  },
  ticket: {
    alignItems: "center",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12
  },
  smallSecondaryButton: {
    alignItems: "center",
    borderColor: "#EE7C2B",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12
  },
  smallSecondaryButtonText: { color: "#EE7C2B", fontSize: 12, fontWeight: "900" },
  smallPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  spotPreviewImage: {
    backgroundColor: "#E7E0DA",
    borderRadius: 8,
    height: 180,
    width: "100%"
  },
  spotCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    overflow: "hidden"
  },
  spotImage: {
    backgroundColor: "#E7E0DA",
    height: 172,
    width: "100%"
  },
  spotImageFallback: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    height: 132,
    justifyContent: "center",
    width: "100%"
  },
  spotCardBody: {
    padding: 14,
    paddingTop: 0
  },
  moneyText: {
    color: "#1D2330",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },
  codeText: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
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
  infoLabel: {
    color: "#626D84",
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  infoValue: {
    color: "#1D2330",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  error: {
    backgroundColor: "#FCEBEB",
    borderRadius: 8,
    color: "#A32D2D",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 14,
    padding: 12
  },
  notice: {
    backgroundColor: "#EAF3DE",
    borderRadius: 8,
    color: "#367D5F",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 14,
    padding: 12
  },
  empty: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 24
  },
  emptyText: {
    color: "#626D84",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center"
  },
  notificationList: {
    gap: 10,
    paddingVertical: 8
  },
  notificationCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  notificationUnread: {
    backgroundColor: "#FFF4EC",
    borderColor: "#F3B183"
  },
  notificationHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  notificationTitle: {
    color: "#1D2330",
    flex: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  notificationBody: {
    color: "#626D84",
    fontSize: 13,
    lineHeight: 19
  },
  notificationDate: {
    color: "#8991A2",
    fontSize: 11,
    fontWeight: "700"
  },
  notificationDot: {
    backgroundColor: "#EE7C2B",
    borderRadius: 5,
    height: 9,
    width: 9
  },
  topBarNotificationDot: {
    backgroundColor: "#EE7C2B",
    borderColor: "#FCFAF7",
    borderRadius: 5,
    borderWidth: 1,
    height: 9,
    position: "absolute",
    right: 8,
    top: 7,
    width: 9
  },
  loading: {
    alignItems: "center",
    minHeight: 240,
    justifyContent: "center"
  }
});
