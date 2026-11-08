import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import {
  acceptHomeQuote,
  createHomeRequest,
  getHomeCatalog,
  getHomeChat,
  getHomeQuotes,
  getHomeRequests,
  payHomeRequest,
  cancelHomeRequest,
  completeHomeRequest,
  disputeHomeRequest,
  reviewHomeRequest,
  sendHomeChat,
  type HomeQuote,
  type HomeChatMessage,
  type HomeService,
  type HomeServiceRequest
} from "../api/home";

type Props = {
  accessToken?: string | null;
  customer: { address?: string | null; comuna?: string | null; city?: string | null };
  onExit: () => void;
};

type Mode = "home" | "wizard" | "detail";

const serviceIcons: Record<string, keyof typeof Feather.glyphMap> = {
  home_cleaning: "wind",
  home_plumbing: "droplet",
  home_electrical: "zap",
  home_painting: "edit-3",
  home_gardening: "sun",
  home_carpentry: "home",
  home_locksmith: "lock",
  home_hvac: "thermometer",
  home_moving: "truck",
  home_pest_control: "shield",
  home_remodeling: "layers",
  home_roofing: "umbrella",
  home_pools: "circle",
  home_appliances: "cpu",
  home_installations: "tool"
};

export function HomeServicesScreen({ accessToken, customer, onExit }: Props) {
  const [mode, setMode] = useState<Mode>("home");
  const [services, setServices] = useState<HomeService[]>([]);
  const [requests, setRequests] = useState<HomeServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<HomeQuote[]>([]);
  const [messages, setMessages] = useState<HomeChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [disputeDraft, setDisputeDraft] = useState("");
  const [rating, setRating] = useState(0);
  const [selectedService, setSelectedService] = useState<HomeService | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HomeServiceRequest | null>(null);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState(customer.address ?? "");
  const [answer, setAnswer] = useState("");
  const [photos, setPhotos] = useState<Array<{ base64: string; mimeType: string; uri: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHome() {
    setError(null);
    try {
      const [catalog, nextRequests] = await Promise.all([
        getHomeCatalog(accessToken),
        getHomeRequests(accessToken)
      ]);
      setServices(catalog);
      setRequests(nextRequests);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo cargar NOD Home.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadHome(); }, [accessToken]);

  const firstQuestion = useMemo(() => selectedService?.questions?.find((question) => question.type === "SINGLE_CHOICE") ?? null, [selectedService]);

  function openService(service: HomeService) {
    setSelectedService(service);
    setDescription("");
    setAnswer("");
    setPhotos([]);
    setMode("wizard");
  }

  async function publishRequest() {
    if (!selectedService || !accessToken) return;
    if (!description.trim() || (firstQuestion?.required && !answer)) {
      Alert.alert("Completa los datos", "Describe lo que necesitas y responde las preguntas del servicio.");
      return;
    }

    setIsSaving(true);
    try {
      await createHomeRequest({
        serviceId: selectedService.id,
        title: description.trim().slice(0, 80),
        description: description.trim(),
        address: address || customer.address || "",
        commune: customer.comuna || "",
        city: customer.city || "Santiago",
        region: "Región Metropolitana",
        latitude: -33.4489,
        longitude: -70.6693,
        answers: firstQuestion ? { [firstQuestion.key ?? firstQuestion.id]: answer } : {},
        photos: photos.map(({ base64, mimeType }) => ({ base64, mimeType })),
        urgency: "FLEXIBLE",
        preferredDates: [],
        preferredTimeWindows: [],
        currency: "CLP",
        publish: true
      }, accessToken, `home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      await loadHome();
      setSelectedService(null);
      setMode("home");
      Alert.alert("Solicitud publicada", "Te avisaremos cuando lleguen cotizaciones de profesionales.");
    } catch (currentError) {
      Alert.alert("No se pudo publicar", currentError instanceof Error ? currentError.message : "Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Permite el acceso a tus fotos para adjuntar evidencia del problema.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, mediaTypes: ["images"], quality: 0.72, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setPhotos((current) => [...current, { base64: asset.base64 ?? "", mimeType: asset.mimeType ?? "image/jpeg", uri: asset.uri }].slice(0, 5));
  }

  async function openRequest(request: HomeServiceRequest) {
    setSelectedRequest(request);
    setMode("detail");
    setQuotes([]);
    setMessages([]);
    try {
      const [nextQuotes, nextMessages] = await Promise.all([
        getHomeQuotes(request.id, accessToken),
        getHomeChat(request.id, accessToken).catch(() => [])
      ]);
      setQuotes(nextQuotes);
      setMessages(nextMessages);
    } catch { setQuotes([]); }
  }

  async function sendMessage() {
    if (!selectedRequest || !accessToken || !messageDraft.trim()) return;
    try {
      const message = await sendHomeChat(selectedRequest.id, messageDraft.trim(), accessToken, `home-chat-${Date.now()}`);
      setMessages((current) => [...current, message]);
      setMessageDraft("");
    } catch (currentError) { Alert.alert("No se pudo enviar", currentError instanceof Error ? currentError.message : "Intenta nuevamente."); }
  }

  async function cancelRequest() {
    if (!selectedRequest || !accessToken) return;
    try {
      await cancelHomeRequest(selectedRequest.id, accessToken, `home-cancel-${selectedRequest.id}-${Date.now()}`);
      setSelectedRequest({ ...selectedRequest, status: "CANCELLED" });
      await loadHome();
      Alert.alert("Solicitud cancelada", "La solicitud fue cancelada correctamente.");
    } catch (currentError) { Alert.alert("No se pudo cancelar", currentError instanceof Error ? currentError.message : "Intenta nuevamente."); }
  }

  async function completeRequest() {
    if (!selectedRequest || !accessToken) return;
    try {
      await completeHomeRequest(selectedRequest.id, accessToken, `home-complete-${selectedRequest.id}-${Date.now()}`);
      setSelectedRequest({ ...selectedRequest, status: "COMPLETED" });
      Alert.alert("Servicio completado", "Ahora puedes calificar al profesional.");
    } catch (currentError) { Alert.alert("No se pudo completar", currentError instanceof Error ? currentError.message : "Intenta nuevamente."); }
  }

  async function submitReview() {
    if (!selectedRequest || !accessToken || rating === 0) return;
    try {
      await reviewHomeRequest(selectedRequest.id, { rating, comment: "Calificación enviada desde NOD Home" }, accessToken, `home-review-${selectedRequest.id}-${Date.now()}`);
      Alert.alert("Gracias por tu reseña", "Tu experiencia ayuda a otros clientes.");
    } catch (currentError) { Alert.alert("No se pudo guardar", currentError instanceof Error ? currentError.message : "Intenta nuevamente."); }
  }

  async function submitDispute() {
    if (!selectedRequest || !accessToken || !disputeDraft.trim()) return;
    try {
      await disputeHomeRequest(selectedRequest.id, disputeDraft.trim(), accessToken, `home-dispute-${selectedRequest.id}-${Date.now()}`);
      setSelectedRequest({ ...selectedRequest, status: "DISPUTED" });
      setDisputeDraft("");
      Alert.alert("Disputa abierta", "Soporte NOD revisará tu caso y te contactará.");
    } catch (currentError) { Alert.alert("No se pudo abrir", currentError instanceof Error ? currentError.message : "Intenta nuevamente."); }
  }

  async function chooseQuote(quote: HomeQuote) {
    if (!accessToken || !selectedRequest) return;
    setIsSaving(true);
    try {
      await acceptHomeQuote(quote.id, accessToken, `home-quote-${quote.id}-${Date.now()}`);
      Alert.alert("Cotización aceptada", "Ahora puedes confirmar el servicio usando tus Créditos NOD.", [
        { text: "Después", style: "cancel" },
        { text: "Pagar ahora", onPress: () => void payRequest() }
      ]);
    } catch (currentError) {
      Alert.alert("No se pudo aceptar", currentError instanceof Error ? currentError.message : "Intenta nuevamente.");
    } finally { setIsSaving(false); }
  }

  async function payRequest() {
    if (!accessToken || !selectedRequest) return;
    setIsSaving(true);
    try {
      await payHomeRequest(selectedRequest.id, accessToken, `home-pay-${selectedRequest.id}-${Date.now()}`);
      await loadHome();
      Alert.alert("Pago confirmado", "Tu servicio quedó programado.");
    } catch (currentError) {
      Alert.alert("No se pudo pagar", currentError instanceof Error ? currentError.message : "Revisa tu saldo de Créditos NOD.");
    } finally { setIsSaving(false); }
  }

  if (isLoading) return <View style={styles.loading}><ActivityIndicator color="#EE7C2B" /></View>;

  if (mode === "wizard" && !selectedService) {
    return <View><BackHeader title="Nueva solicitud" onBack={() => setMode("home")} /><Text style={styles.sectionTitle}>¿Qué necesita tu hogar?</Text><Text style={styles.muted}>Elige un servicio para comenzar y te conectaremos con profesionales disponibles.</Text><View style={styles.grid}>{services.map((service) => <Pressable key={service.id} onPress={() => openService(service)} style={styles.serviceCard}><View style={styles.serviceIcon}><Feather color="#254D3C" name={serviceIcons[service.id] ?? "home"} size={19} /></View><Text style={styles.serviceName}>{service.name}</Text></Pressable>)}</View></View>;
  }

  if (mode === "wizard" && selectedService) {
    return <View>
      <BackHeader title="Nueva solicitud" onBack={() => setMode("home")} />
      <View style={styles.heroSmall}><View style={styles.iconCircle}><Feather color="#ffffff" name={serviceIcons[selectedService.id] ?? "home"} size={22} /></View><Text style={styles.heroSmallTitle}>{selectedService.name}</Text><Text style={styles.heroSmallText}>{selectedService.description ?? "Cuéntanos qué necesita tu hogar."}</Text></View>
      {firstQuestion ? <View style={styles.panel}><Text style={styles.label}>{firstQuestion.label}</Text><View style={styles.optionRow}>{(firstQuestion.options ?? []).map((option) => <Pressable key={option.value} onPress={() => setAnswer(option.value)} style={[styles.option, answer === option.value && styles.optionSelected]}><Text style={[styles.optionText, answer === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}</View></View> : null}
      <View style={styles.panel}><Text style={styles.label}>Describe lo que necesitas</Text><TextInput multiline onChangeText={setDescription} placeholder="Cuéntanos qué ocurre o qué quieres realizar..." style={[styles.input, styles.textArea]} textAlignVertical="top" value={description} /><Pressable onPress={() => void addPhoto()} style={styles.secondaryAction}><Feather color="#254D3C" name="camera" size={16} /><Text style={styles.secondaryActionTextDark}>{photos.length ? `${photos.length} foto(s) agregada(s)` : "Agregar fotos del problema"}</Text></Pressable><Text style={styles.label}>Dirección del servicio</Text><TextInput onChangeText={setAddress} placeholder="Dirección" style={styles.input} value={address} /><Text style={styles.caption}>{customer.comuna || "Santiago"} · Zona cubierta por NOD</Text></View>
      <Pressable disabled={isSaving} onPress={() => void publishRequest()} style={[styles.primaryButton, isSaving && styles.disabled]}><Text style={styles.primaryText}>{isSaving ? "Publicando…" : "Publicar solicitud"}</Text><Feather color="#ffffff" name="arrow-right" size={17} /></Pressable>
    </View>;
  }

  if (mode === "detail" && selectedRequest) {
    return <View>
      <BackHeader title="Detalle de solicitud" onBack={() => setMode("home")} />
      <View style={styles.panel}><View style={styles.rowBetween}><View><Text style={styles.title}>{selectedRequest.title}</Text><Text style={styles.muted}>{selectedRequest.commune ?? "Santiago"} · {selectedRequest.status}</Text></View><Status status={selectedRequest.status} /></View><Text style={styles.caption}>Las cotizaciones se reciben directamente desde profesionales verificados.</Text></View>
      {(selectedRequest.status === "PENDING" || selectedRequest.status === "QUOTED") ? <Pressable onPress={() => void cancelRequest()} style={styles.secondaryAction}><Feather color="#C96D47" name="x-circle" size={16} /><Text style={styles.secondaryActionText}>Cancelar solicitud</Text></Pressable> : null}
      <Text style={styles.sectionTitle}>Cotizaciones recibidas</Text>{quotes.length ? quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} busy={isSaving} onChoose={() => void chooseQuote(quote)} />) : <View style={styles.empty}><Feather color="#C9D8C2" name="clock" size={32} /><Text style={styles.title}>Buscando profesionales</Text><Text style={styles.muted}>Te avisaremos cuando llegue la primera cotización.</Text></View>}
      <Text style={styles.sectionTitle}>Chat con el profesional</Text><View style={styles.panel}>{messages.slice(-4).map((message) => <View key={message.id} style={styles.message}><Text style={styles.messageText}>{message.body}</Text><Text style={styles.messageTime}>{new Date(message.created_at).toLocaleString("es-CL", { hour: "2-digit", minute: "2-digit" })}</Text></View>)}<View style={styles.chatComposer}><TextInput onChangeText={setMessageDraft} placeholder="Escribe un mensaje..." style={styles.chatInput} value={messageDraft} /><Pressable onPress={() => void sendMessage()} style={styles.sendButton}><Feather color="#ffffff" name="send" size={16} /></Pressable></View></View>
      {(selectedRequest.status === "SCHEDULED" || selectedRequest.status === "IN_PROGRESS") ? <><Pressable onPress={() => void completeRequest()} style={styles.primaryButton}><Text style={styles.primaryText}>Confirmar trabajo completado</Text><Feather color="#ffffff" name="check-circle" size={16} /></Pressable><View style={styles.panel}><Text style={styles.label}>¿Necesitas abrir una disputa?</Text><TextInput onChangeText={setDisputeDraft} placeholder="Describe el problema o daño..." style={styles.input} value={disputeDraft} /><Pressable onPress={() => void submitDispute()} style={styles.secondaryAction}><Feather color="#C96D47" name="alert-triangle" size={16} /><Text style={styles.secondaryActionText}>Abrir disputa</Text></Pressable></View></> : null}
      {selectedRequest.status === "COMPLETED" ? <View style={styles.panel}><Text style={styles.label}>Califica tu experiencia</Text><View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)}><Feather color={value <= rating ? "#D48846" : "#CBD5CC"} name="star" size={28} /></Pressable>)}</View><Pressable onPress={() => void submitReview()} style={styles.primaryButton}><Text style={styles.primaryText}>Enviar reseña</Text><Feather color="#ffffff" name="send" size={16} /></Pressable></View> : null}
    </View>;
  }

  return <View>
    <View style={styles.hero}><View style={styles.heroHeader}><View><Text style={styles.kicker}>NOD HOME</Text><Text style={styles.heroTitle}>Tu hogar, en buenas manos.</Text><Text style={styles.heroText}>Encuentra profesionales confiables para resolver lo que tu casa necesita.</Text></View><View style={styles.heroOrb}><Feather color="#254D3C" name="home" size={27} /></View></View><Pressable onPress={() => setMode("wizard")} style={styles.heroButton}><Text style={styles.heroButtonText}>¿Qué necesitas hoy?</Text><Feather color="#254D3C" name="arrow-right" size={17} /></Pressable></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.rowBetween}><Text style={styles.sectionTitle}>Servicios del hogar</Text><Text style={styles.count}>{services.length}</Text></View>
    <View style={styles.grid}>{services.slice(0, 12).map((service) => <Pressable key={service.id} onPress={() => openService(service)} style={styles.serviceCard}><View style={styles.serviceIcon}><Feather color="#254D3C" name={serviceIcons[service.id] ?? "home"} size={19} /></View><Text style={styles.serviceName}>{service.name}</Text></Pressable>)}</View>
    <View style={styles.rowBetween}><Text style={styles.sectionTitle}>Mis solicitudes</Text><Pressable onPress={loadHome}><Text style={styles.link}>Actualizar</Text></Pressable></View>
    {requests.length ? requests.map((request) => <Pressable key={request.id} onPress={() => void openRequest(request)} style={styles.requestCard}><View style={styles.rowBetween}><View style={{ flex: 1 }}><Text style={styles.title}>{request.title}</Text><Text style={styles.muted}>{request.commune ?? "Santiago"} · {request.created_at.slice(0, 10)}</Text></View><Status status={request.status} /></View><View style={styles.divider} /><Text style={styles.link}>{request.quotes_count ?? 0} cotizaciones  ·  Ver detalle ›</Text></Pressable>) : <View style={styles.empty}><Feather color="#C9D8C2" name="clipboard" size={32} /><Text style={styles.title}>Todavía no tienes solicitudes</Text><Text style={styles.muted}>Elige un servicio para comenzar.</Text></View>}
  </View>;
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={styles.backHeader}><Pressable onPress={onBack} style={styles.backButton}><Feather color="#254D3C" name="arrow-left" size={18} /></Pressable><Text style={styles.backTitle}>{title}</Text></View>;
}

function Status({ status }: { status: string }) {
  const label = status === "QUOTED" ? "Cotizaciones" : status === "SCHEDULED" ? "Programado" : status === "COMPLETED" ? "Completado" : status === "CANCELLED" ? "Cancelado" : "Buscando";
  return <View style={styles.status}><Text style={styles.statusText}>{label}</Text></View>;
}

function QuoteCard({ quote, busy, onChoose }: { quote: HomeQuote; busy: boolean; onChoose: () => void }) {
  return <View style={styles.quoteCard}><View style={styles.rowBetween}><View style={styles.proRow}><View style={styles.avatar}><Text style={styles.avatarText}>{quote.provider_name.slice(0, 2).toUpperCase()}</Text></View><View><Text style={styles.title}>{quote.provider_name}</Text><Text style={styles.muted}>★ {quote.rating ?? "-"} · {quote.years_experience ?? 0} años de experiencia</Text></View></View><Text style={styles.price}>${quote.total_amount.toLocaleString("es-CL")}</Text></View><Text style={styles.caption}>{quote.description}</Text><View style={styles.badges}><Text style={styles.badge}>Garantía {quote.warranty_days ?? 0} días</Text><Text style={styles.badge}>{quote.estimated_duration_hours ?? 0} horas</Text></View><Pressable disabled={busy} onPress={onChoose} style={[styles.primaryButton, busy && styles.disabled]}><Text style={styles.primaryText}>Elegir cotización</Text><Feather color="#ffffff" name="check" size={16} /></Pressable></View>;
}

const styles = StyleSheet.create({
  loading: { minHeight: 260, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: "#254D3C", borderRadius: 26, padding: 21, marginBottom: 22 },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  heroOrb: { backgroundColor: "#C9E4B8", width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  kicker: { color: "#C9E4B8", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#ffffff", fontSize: 27, fontWeight: "800", lineHeight: 31, marginTop: 8, maxWidth: 240 },
  heroText: { color: "#D7E4D6", fontSize: 13, lineHeight: 19, marginTop: 10, maxWidth: 260 },
  heroButton: { backgroundColor: "#C9E4B8", borderRadius: 13, padding: 13, marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroButtonText: { color: "#254D3C", fontWeight: "800", fontSize: 13 },
  heroSmall: { backgroundColor: "#EEF5E9", borderRadius: 21, padding: 18, marginBottom: 16 },
  iconCircle: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#254D3C", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  heroSmallTitle: { color: "#254D3C", fontSize: 21, fontWeight: "800" },
  heroSmallText: { color: "#6F7D73", fontSize: 12, lineHeight: 17, marginTop: 5 },
  backHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  backTitle: { color: "#1D2330", fontSize: 19, fontWeight: "800" },
  sectionTitle: { color: "#1D2330", fontSize: 18, fontWeight: "800", marginTop: 16, marginBottom: 12 },
  count: { color: "#86B86F", fontWeight: "800", marginTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  serviceCard: { width: "23.8%", minHeight: 88, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#E6EBE5", alignItems: "center", justifyContent: "center", padding: 7 },
  serviceIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#DDECD7", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  serviceName: { color: "#26352D", fontSize: 10, fontWeight: "700", textAlign: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  requestCard: { backgroundColor: "#ffffff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E6EBE5", marginBottom: 11 },
  panel: { backgroundColor: "#ffffff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E6EBE5", marginBottom: 12 },
  title: { color: "#1D2330", fontSize: 13, fontWeight: "800" },
  muted: { color: "#78847E", fontSize: 11, marginTop: 4 },
  caption: { color: "#78847E", fontSize: 11, lineHeight: 16, marginTop: 10 },
  divider: { height: 1, backgroundColor: "#E6EBE5", marginVertical: 12 },
  link: { color: "#6EA45D", fontSize: 11, fontWeight: "800" },
  status: { backgroundColor: "#FFF0E8", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { color: "#C96D47", fontSize: 10, fontWeight: "800" },
  empty: { alignItems: "center", padding: 30 },
  label: { color: "#1D2330", fontSize: 12, fontWeight: "800", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#E1E8DF", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13, color: "#1D2330", marginBottom: 15 },
  textArea: { minHeight: 104 },
  optionRow: { gap: 8 },
  option: { borderWidth: 1, borderColor: "#E1E8DF", borderRadius: 13, padding: 13 },
  optionSelected: { borderColor: "#86B86F", backgroundColor: "#F3FAEE" },
  optionText: { color: "#536057", fontSize: 12 },
  optionTextSelected: { color: "#254D3C", fontWeight: "800" },
  primaryButton: { backgroundColor: "#254D3C", borderRadius: 13, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 15 },
  primaryText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  error: { color: "#C96D47", fontSize: 12, marginBottom: 8 },
  quoteCard: { backgroundColor: "#ffffff", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E6EBE5", marginBottom: 11 },
  secondaryAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#F0D7CA", borderRadius: 12, padding: 12, marginBottom: 12 },
  secondaryActionText: { color: "#C96D47", fontSize: 12, fontWeight: "800" },
  secondaryActionTextDark: { color: "#254D3C", fontSize: 12, fontWeight: "800" },
  message: { backgroundColor: "#F4F7F3", borderRadius: 12, padding: 10, marginBottom: 7 },
  messageText: { color: "#334039", fontSize: 12 },
  messageTime: { color: "#8A958D", fontSize: 9, marginTop: 4, textAlign: "right" },
  chatComposer: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8 },
  chatInput: { flex: 1, borderWidth: 1, borderColor: "#E1E8DF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: "#1D2330" },
  sendButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#254D3C", alignItems: "center", justifyContent: "center" },
  ratingRow: { flexDirection: "row", gap: 8, marginVertical: 10 },
  proRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#DDECD7", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { color: "#254D3C", fontWeight: "800", fontSize: 12 },
  price: { color: "#254D3C", fontSize: 16, fontWeight: "900" },
  badges: { flexDirection: "row", gap: 7, marginVertical: 12 },
  badge: { backgroundColor: "#F4F7F3", color: "#78847E", fontSize: 10, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }
});
