import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { acceptProviderHomeOpportunity, createProviderHomeQuote, getProviderHomeOpportunities, type HomeOpportunity } from "../api/home";

type Props = { accessToken?: string | null; onBack: () => void };

export function ProviderHomeScreen({ accessToken, onBack }: Props) {
  const [items, setItems] = useState<HomeOpportunity[]>([]);
  const [selected, setSelected] = useState<HomeOpportunity | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setItems(await getProviderHomeOpportunities(accessToken)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [accessToken]);

  async function sendQuote() {
    if (!selected || !accessToken || !price.trim()) {
      Alert.alert("Completa el valor", "Indica el precio total de tu cotización.");
      return;
    }
    setSaving(true);
    try {
      await createProviderHomeQuote({
        request_id: selected.id,
        labor_amount: Number(price.replace(/\D/g, "")),
        materials_amount: 0,
        travel_amount: 0,
        discount_amount: 0,
        currency: "CLP",
        description: description.trim(),
        warranty_days: 30,
        estimated_duration_hours: 2,
        valid_until: new Date(Date.now() + 5 * 86400000).toISOString()
      }, accessToken, `provider-home-quote-${selected.id}-${Date.now()}`);
      Alert.alert("Cotización enviada", "El cliente podrá compararla con las demás propuestas.");
      setSelected(null);
      setPrice("");
      setDescription("");
      await load();
    } catch (error) { Alert.alert("No se pudo enviar", error instanceof Error ? error.message : "Intenta nuevamente."); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color="#EE7C2B" /></View>;
  if (selected) return <View><Header title="Enviar cotización" onBack={() => setSelected(null)} /><View style={styles.panel}><Text style={styles.title}>{selected.title}</Text><Text style={styles.muted}>{selected.customer_area ?? selected.commune ?? "Zona cercana"}</Text><Text style={styles.label}>Precio total (CLP)</Text><TextInput keyboardType="number-pad" onChangeText={setPrice} placeholder="35000" style={styles.input} value={price} /><Text style={styles.label}>Detalle para el cliente</Text><TextInput multiline onChangeText={setDescription} placeholder="Incluye materiales, tiempos y condiciones..." style={[styles.input, styles.textArea]} textAlignVertical="top" value={description} /><Pressable disabled={saving} onPress={() => void sendQuote()} style={[styles.primary, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? "Enviando…" : "Enviar cotización"}</Text><Feather color="#ffffff" name="send" size={16} /></Pressable></View></View>;

  return <View><Header title="Oportunidades Home" onBack={onBack} /><View style={styles.hero}><Feather color="#C9E4B8" name="home" size={26} /><Text style={styles.heroTitle}>Nuevos trabajos cerca de ti</Text><Text style={styles.heroText}>Revisa solicitudes de hogar compatibles con tus servicios y envía una propuesta.</Text></View>{items.length ? items.map((item) => <View key={item.match_id} style={styles.card}><View style={styles.row}><View style={styles.icon}><Feather color="#254D3C" name="tool" size={18} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{item.title}</Text><Text style={styles.muted}>{item.customer_area ?? item.commune ?? "Zona cercana"}</Text></View><Text style={styles.muted}>{item.distance_km ? `${item.distance_km.toFixed(1)} km` : "Cerca"}</Text></View><Text style={styles.description}>{item.description ?? "El cliente busca un profesional para este servicio."}</Text><View style={styles.actions}><Pressable onPress={() => void acceptProviderHomeOpportunity(item.match_id, accessToken ?? "", `provider-home-match-${item.match_id}-${Date.now()}`).then(() => setSelected(item)).catch((error) => Alert.alert("No se pudo aceptar", error instanceof Error ? error.message : "Intenta nuevamente."))} style={styles.secondary}><Text style={styles.secondaryText}>Ver oportunidad</Text></Pressable><Pressable onPress={() => setSelected(item)} style={styles.primarySmall}><Text style={styles.primaryText}>Cotizar</Text></Pressable></View></View>) : <View style={styles.empty}><Feather color="#C9D8C2" name="inbox" size={34} /><Text style={styles.title}>No hay oportunidades nuevas</Text><Text style={styles.muted}>Te avisaremos cuando aparezca un trabajo compatible.</Text></View>}</View>;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) { return <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Feather color="#254D3C" name="arrow-left" size={18} /></Pressable><Text style={styles.headerTitle}>{title}</Text></View>; }

const styles = StyleSheet.create({
  loading: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerTitle: { color: "#1D2330", fontSize: 19, fontWeight: "800" },
  hero: { backgroundColor: "#254D3C", borderRadius: 22, padding: 19, marginBottom: 16 },
  heroTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800", marginTop: 10 },
  heroText: { color: "#D7E4D6", fontSize: 12, lineHeight: 17, marginTop: 7 },
  card: { backgroundColor: "#ffffff", borderColor: "#E6EBE5", borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 11 },
  panel: { backgroundColor: "#ffffff", borderColor: "#E6EBE5", borderWidth: 1, borderRadius: 18, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#DDECD7", alignItems: "center", justifyContent: "center" },
  title: { color: "#1D2330", fontSize: 14, fontWeight: "800" },
  muted: { color: "#78847E", fontSize: 11, marginTop: 4 },
  description: { color: "#536057", fontSize: 12, lineHeight: 17, marginTop: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  primary: { backgroundColor: "#254D3C", borderRadius: 13, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  primarySmall: { flex: 1, backgroundColor: "#254D3C", borderRadius: 11, padding: 11, alignItems: "center" },
  primaryText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  secondary: { flex: 1, borderWidth: 1, borderColor: "#E1E8DF", borderRadius: 11, padding: 11, alignItems: "center" },
  secondaryText: { color: "#254D3C", fontSize: 12, fontWeight: "800" },
  label: { color: "#1D2330", fontSize: 12, fontWeight: "800", marginTop: 17, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#E1E8DF", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: "#1D2330", fontSize: 13 },
  textArea: { minHeight: 100, marginBottom: 7 },
  disabled: { opacity: 0.55 },
  empty: { alignItems: "center", padding: 35 }
});
