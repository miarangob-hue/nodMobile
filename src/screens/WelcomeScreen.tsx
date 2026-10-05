import { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandLogo } from "../components/BrandLogo";

type Props = {
  onLogin: () => void;
  onRegister: () => void;
};

const slides = [
  {
    eyebrow: "NOD MATCH",
    title: "Amistades que empiezan con una patita",
    description: "Descubre mascotas compatibles, haz match y coordina encuentros seguros con sus tutores.",
    illustration: "dating" as const
  },
  {
    eyebrow: "RESIDENCIAL",
    title: "Un segundo hogar cuando no estás",
    description: "Compara anfitriones, valoraciones y disponibilidad para encontrar el residencial ideal.",
    illustration: "boarding" as const
  },
  {
    eyebrow: "PASEOS",
    title: "Paseadores verificados a un toque",
    description: "Encuentra personas de confianza, revisa sus valoraciones y elige la mejor opción para tu mascota.",
    illustration: "providers" as const
  },
  {
    eyebrow: "PROTECCIÓN",
    title: "Seguros pensados para sus cuidados",
    description: "Revisa coberturas veterinarias, vacunas, urgencias y beneficios para cada mascota.",
    illustration: "insurance" as const
  },
  {
    eyebrow: "UBICACIÓN EN VIVO",
    title: "Sigue cada paseo en tiempo real",
    description: "Consulta la ruta, la distancia y el tiempo del servicio directamente desde NOD.",
    illustration: "tracking" as const
  },
  {
    eyebrow: "TODO EN UN LUGAR",
    title: "Conecta y cuida mejor a tu mascota",
    description: "Reserva servicios, conversa con el proveedor y mantén siempre a mano la información de tu mascota.",
    illustration: "chat" as const
  },
  {
    eyebrow: "UN ECOSISTEMA NOD",
    title: "Todo lo que necesitan, siempre contigo",
    description: "Ficha médica, spots, wallet, beneficios, soporte y seguridad reunidos en una sola app.",
    illustration: "features" as const
  }
];

export function WelcomeScreen({ onLogin, onRegister }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function moveNext() {
    if (currentIndex === slides.length - 1) {
      onRegister();
      return;
    }

    const nextIndex = currentIndex + 1;
    scrollRef.current?.scrollTo({ animated: true, x: nextIndex * width });
    setCurrentIndex(nextIndex);
  }

  function movePrevious() {
    if (currentIndex === 0) return;
    const previousIndex = currentIndex - 1;
    scrollRef.current?.scrollTo({ animated: true, x: previousIndex * width });
    setCurrentIndex(previousIndex);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.topBar}>
        <BrandLogo size="medium" />
        <Pressable accessibilityRole="button" onPress={onLogin} hitSlop={12}>
          <Text style={styles.skip}>Saltar</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        onMomentumScrollEnd={handleScrollEnd}
        pagingEnabled
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={styles.visualArea}>
              <SlideIllustration type={slide.illustration} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View key={slide.title} style={[styles.dot, currentIndex === index && styles.activeDot]} />
          ))}
        </View>

        <View style={styles.navigationRow}>
          <Pressable
            accessibilityRole="button"
            disabled={currentIndex === 0}
            onPress={movePrevious}
            style={({ pressed }) => [styles.backButton, currentIndex === 0 && styles.backButtonDisabled, pressed && currentIndex > 0 && styles.pressed]}
          >
            <Feather color={currentIndex === 0 ? "#B8B1AA" : "#EE7C2B"} name="arrow-left" size={18} />
            <Text style={[styles.backButtonText, currentIndex === 0 && styles.backButtonTextDisabled]}>Anterior</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={moveNext} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{currentIndex === slides.length - 1 ? "Crear cuenta" : "Siguiente"}</Text>
            <Feather color="#FFFFFF" name="arrow-right" size={18} />
          </Pressable>
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>¿Ya tienes cuenta? </Text>
          <Pressable accessibilityRole="button" onPress={onLogin} hitSlop={8}>
            <Text style={styles.loginLink}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SlideIllustration({ type }: { type: "providers" | "dating" | "boarding" | "insurance" | "tracking" | "chat" | "features" }) {
  if (type === "providers") {
    return (
      <View style={styles.providerScene}>
        <View style={[styles.avatarCard, styles.avatarCardLeft]}>
          <View style={[styles.avatar, { backgroundColor: "#DCE7F7" }]}><Feather color="#4F6F9F" name="user" size={25} /></View>
          <Text style={styles.personName}>Ignacio</Text>
          <Text style={styles.rating}>★ 5.0</Text>
        </View>
        <View style={styles.petCircle}><Feather color="#FFFFFF" name="heart" size={43} /></View>
        <View style={[styles.avatarCard, styles.avatarCardRight]}>
          <View style={[styles.avatar, { backgroundColor: "#F8D9C5" }]}><Feather color="#A84F24" name="user" size={25} /></View>
          <Text style={styles.personName}>Camila</Text>
          <Text style={styles.rating}>★ 4.9</Text>
        </View>
        <View style={styles.verifiedBadge}><Feather color="#FFFFFF" name="check" size={13} /><Text style={styles.verifiedText}>Verificado</Text></View>
      </View>
    );
  }

  if (type === "dating") {
    return (
      <View style={styles.datingScene}>
        <View style={[styles.petProfileCard, styles.petProfileBack]}>
          <View style={[styles.petAvatar, { backgroundColor: "#DCE7F7" }]}><Feather color="#4F6F9F" name="github" size={38} /></View>
          <Text style={styles.petName}>Bruno · 3 años</Text>
          <Text style={styles.petMeta}>Golden · Sociable</Text>
        </View>
        <View style={styles.petProfileCard}>
          <View style={[styles.petAvatar, { backgroundColor: "#FBE5DA" }]}><Feather color="#C65E22" name="github" size={42} /></View>
          <Text style={styles.petName}>Luna · 2 años</Text>
          <Text style={styles.petMeta}>Border Collie · Juguetona</Text>
          <View style={styles.matchActions}>
            <View style={styles.passAction}><Feather color="#7A8292" name="x" size={22} /></View>
            <View style={styles.likeAction}><Feather color="#FFFFFF" name="heart" size={22} /></View>
          </View>
        </View>
        <View style={styles.matchBadge}><Text style={styles.matchBadgeText}>96% compatibles</Text></View>
      </View>
    );
  }

  if (type === "boarding") {
    return (
      <View style={styles.boardingCard}>
        <View style={styles.houseRoof}><Feather color="#FFFFFF" name="home" size={45} /></View>
        <View style={styles.hostRow}>
          <View style={styles.hostAvatar}><Feather color="#A84F24" name="user" size={24} /></View>
          <View style={styles.hostCopy}><Text style={styles.hostName}>Casa de Sofía</Text><Text style={styles.hostRating}>★ 4.9 · 128 estadías</Text></View>
          <View style={styles.openBadge}><Text style={styles.openBadgeText}>Disponible</Text></View>
        </View>
        <View style={styles.amenities}>
          <Amenity icon="sun" label="Patio" />
          <Amenity icon="camera" label="Fotos" />
          <Amenity icon="clock" label="24 horas" />
        </View>
      </View>
    );
  }

  if (type === "insurance") {
    return (
      <View style={styles.insuranceScene}>
        <View style={styles.shieldCircle}><Feather color="#FFFFFF" name="shield" size={48} /></View>
        <View style={styles.coverageCard}>
          <Text style={styles.coverageTitle}>Plan Protección NOD</Text>
          <CoverageItem label="Urgencias veterinarias" />
          <CoverageItem label="Vacunas y exámenes" />
          <CoverageItem label="Teleorientación" />
          <View style={styles.coveragePriceRow}><Text style={styles.coverageFrom}>DESDE</Text><Text style={styles.coveragePrice}>$8.990/mes</Text></View>
        </View>
      </View>
    );
  }

  if (type === "tracking") {
    return (
      <View style={styles.mapCard}>
        <View style={styles.mapLineOne} />
        <View style={styles.mapLineTwo} />
        <View style={[styles.mapPoint, styles.mapPointStart]} />
        <View style={[styles.mapPoint, styles.mapPointEnd]}><Feather color="#FFFFFF" name="map-pin" size={18} /></View>
        <View style={styles.tripSummary}>
          <View><Text style={styles.tripValue}>2,4 km</Text><Text style={styles.tripLabel}>DISTANCIA</Text></View>
          <View style={styles.tripDivider} />
          <View><Text style={styles.tripValue}>32 min</Text><Text style={styles.tripLabel}>EN VIVO</Text></View>
        </View>
      </View>
    );
  }

  if (type === "chat") return (
    <View style={styles.chatCard}>
      <View style={styles.chatHeader}>
        <View style={styles.chatAvatar}><Feather color="#A84F24" name="user" size={18} /></View>
        <View><Text style={styles.chatName}>Camila · Paseadora</Text><Text style={styles.online}>● En línea</Text></View>
      </View>
      <View style={styles.incomingBubble}><Text style={styles.incomingText}>¡Hola! Ya estamos paseando. Todo perfecto 🐾</Text></View>
      <View style={styles.outgoingBubble}><Text style={styles.outgoingText}>¡Genial! ¿Me mandas una foto?</Text></View>
      <View style={styles.photoBubble}><Feather color="#EE7C2B" name="camera" size={24} /><Text style={styles.photoText}>Foto enviada</Text></View>
    </View>
  );

  return (
    <View style={styles.featureGrid}>
      <FeatureTile color="#FBE5DA" icon="heart" label="Ficha médica" />
      <FeatureTile color="#E6F3EC" icon="map-pin" label="Spots" />
      <FeatureTile color="#E6ECF6" icon="credit-card" label="Wallet" />
      <FeatureTile color="#F7EFD7" icon="gift" label="Beneficios" />
      <FeatureTile color="#EFE6F6" icon="life-buoy" label="Soporte" />
      <FeatureTile color="#FBE5DA" icon="shield" label="Seguridad" />
    </View>
  );
}

function Amenity({ icon, label }: { icon: "sun" | "camera" | "clock"; label: string }) {
  return <View style={styles.amenity}><Feather color="#EE7C2B" name={icon} size={17} /><Text style={styles.amenityText}>{label}</Text></View>;
}

function CoverageItem({ label }: { label: string }) {
  return <View style={styles.coverageItem}><View style={styles.coverageCheck}><Feather color="#FFFFFF" name="check" size={11} /></View><Text style={styles.coverageItemText}>{label}</Text></View>;
}

function FeatureTile({ color, icon, label }: { color: string; icon: "heart" | "map-pin" | "credit-card" | "gift" | "life-buoy" | "shield"; label: string }) {
  return <View style={styles.featureTile}><View style={[styles.featureIcon, { backgroundColor: color }]}><Feather color="#EE7C2B" name={icon} size={22} /></View><Text style={styles.featureLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#FCFAF7", flex: 1 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 8 },
  skip: { color: "#626D84", fontSize: 15, fontWeight: "700" },
  carousel: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: 24 },
  visualArea: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 215 },
  copy: { paddingBottom: 12 },
  eyebrow: { color: "#EE7C2B", fontSize: 12, fontWeight: "900", letterSpacing: 1.2, marginBottom: 9 },
  title: { color: "#1D2330", fontSize: 30, fontWeight: "900", letterSpacing: -0.9, lineHeight: 35 },
  description: { color: "#626D84", fontSize: 15, lineHeight: 21, marginTop: 10 },
  footer: { paddingHorizontal: 24, paddingBottom: 4 },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginBottom: 20 },
  dot: { backgroundColor: "#D9D3CD", borderRadius: 4, height: 7, width: 7 },
  activeDot: { backgroundColor: "#EE7C2B", width: 28 },
  navigationRow: { flexDirection: "row", gap: 10 },
  backButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EE7C2B", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 7, height: 56, justifyContent: "center", width: 118 },
  backButtonDisabled: { backgroundColor: "#F1EFE8", borderColor: "#DED8D2" },
  backButtonText: { color: "#EE7C2B", fontSize: 14, fontWeight: "900" },
  backButtonTextDisabled: { color: "#B8B1AA" },
  primaryButton: { alignItems: "center", backgroundColor: "#EE7C2B", borderRadius: 14, flex: 1, flexDirection: "row", height: 56, justifyContent: "center", gap: 9 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.82 },
  loginRow: { alignItems: "center", flexDirection: "row", justifyContent: "center", minHeight: 46 },
  loginPrompt: { color: "#7A8292", fontSize: 13 },
  loginLink: { color: "#EE7C2B", fontSize: 13, fontWeight: "900" },
  providerScene: { alignItems: "center", height: 210, justifyContent: "center", width: "100%" },
  petCircle: { alignItems: "center", backgroundColor: "#EE7C2B", borderColor: "#FFFFFF", borderRadius: 67, borderWidth: 8, height: 134, justifyContent: "center", shadowColor: "#A84F24", shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.2, shadowRadius: 18, width: 134 },
  avatarCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E0DA", borderRadius: 16, borderWidth: 1, padding: 10, position: "absolute", shadowColor: "#1D2330", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.08, shadowRadius: 10, width: 92 },
  avatarCardLeft: { left: 7, top: 34, transform: [{ rotate: "-5deg" }] },
  avatarCardRight: { right: 7, top: 24, transform: [{ rotate: "5deg" }] },
  avatar: { alignItems: "center", borderRadius: 24, height: 47, justifyContent: "center", width: 47 },
  personName: { color: "#1D2330", fontSize: 12, fontWeight: "900", marginTop: 6 },
  rating: { color: "#EE7C2B", fontSize: 11, fontWeight: "800", marginTop: 2 },
  verifiedBadge: { alignItems: "center", backgroundColor: "#2FA56A", borderRadius: 999, bottom: 24, flexDirection: "row", gap: 4, paddingHorizontal: 11, paddingVertical: 7, position: "absolute", right: 67 },
  verifiedText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  mapCard: { backgroundColor: "#F4E8DA", borderColor: "#E7D8CA", borderRadius: 24, borderWidth: 1, height: 236, overflow: "hidden", position: "relative", width: "100%" },
  mapLineOne: { backgroundColor: "#FFFFFF", height: 240, left: 122, position: "absolute", top: -30, transform: [{ rotate: "41deg" }], width: 20 },
  mapLineTwo: { backgroundColor: "#FFFFFF", height: 320, left: 202, position: "absolute", top: -40, transform: [{ rotate: "-31deg" }], width: 15 },
  mapPoint: { alignItems: "center", backgroundColor: "#EE7C2B", borderColor: "#FFFFFF", borderRadius: 18, borderWidth: 4, height: 34, justifyContent: "center", position: "absolute", width: 34 },
  mapPointStart: { left: 70, top: 54 },
  mapPointEnd: { right: 60, top: 83 },
  tripSummary: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, bottom: 14, flexDirection: "row", justifyContent: "space-around", left: 14, padding: 13, position: "absolute", right: 14 },
  tripValue: { color: "#1D2330", fontSize: 16, fontWeight: "900" },
  tripLabel: { color: "#8B92A0", fontSize: 9, fontWeight: "800", marginTop: 2 },
  tripDivider: { backgroundColor: "#E7E0DA", height: 30, width: 1 },
  chatCard: { backgroundColor: "#FFFFFF", borderColor: "#E7E0DA", borderRadius: 22, borderWidth: 1, padding: 16, shadowColor: "#1D2330", shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.09, shadowRadius: 15, width: "100%" },
  chatHeader: { alignItems: "center", borderBottomColor: "#EEE9E4", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingBottom: 12 },
  chatAvatar: { alignItems: "center", backgroundColor: "#F8D9C5", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  chatName: { color: "#1D2330", fontSize: 13, fontWeight: "900" },
  online: { color: "#2FA56A", fontSize: 10, fontWeight: "700", marginTop: 2 },
  incomingBubble: { alignSelf: "flex-start", backgroundColor: "#F1EFE8", borderRadius: 13, marginTop: 14, maxWidth: "79%", padding: 11 },
  incomingText: { color: "#343B49", fontSize: 12, lineHeight: 17 },
  outgoingBubble: { alignSelf: "flex-end", backgroundColor: "#EE7C2B", borderRadius: 13, marginTop: 9, maxWidth: "76%", padding: 11 },
  outgoingText: { color: "#FFFFFF", fontSize: 12, lineHeight: 17 },
  photoBubble: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#FFF5ED", borderRadius: 13, flexDirection: "row", gap: 8, marginTop: 9, padding: 11 },
  photoText: { color: "#A84F24", fontSize: 11, fontWeight: "800" }
  ,datingScene: { alignItems: "center", height: 225, justifyContent: "center", width: "100%" }
  ,petProfileCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E0DA", borderRadius: 20, borderWidth: 1, padding: 14, position: "absolute", shadowColor: "#1D2330", shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.1, shadowRadius: 14, width: 205 }
  ,petProfileBack: { opacity: 0.58, transform: [{ rotate: "-8deg" }, { translateX: -42 }] }
  ,petAvatar: { alignItems: "center", borderRadius: 45, height: 78, justifyContent: "center", width: 78 }
  ,petName: { color: "#1D2330", fontSize: 15, fontWeight: "900", marginTop: 8 }
  ,petMeta: { color: "#7A8292", fontSize: 11, marginTop: 3 }
  ,matchActions: { flexDirection: "row", gap: 14, marginTop: 11 }
  ,passAction: { alignItems: "center", backgroundColor: "#F1EFE8", borderRadius: 20, height: 39, justifyContent: "center", width: 39 }
  ,likeAction: { alignItems: "center", backgroundColor: "#EE7C2B", borderRadius: 20, height: 39, justifyContent: "center", width: 39 }
  ,matchBadge: { backgroundColor: "#2FA56A", borderRadius: 999, bottom: 3, paddingHorizontal: 13, paddingVertical: 7, position: "absolute", right: 22 }
  ,matchBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" }
  ,boardingCard: { backgroundColor: "#FFFFFF", borderColor: "#E7E0DA", borderRadius: 22, borderWidth: 1, overflow: "hidden", shadowColor: "#1D2330", shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.09, shadowRadius: 14, width: "100%" }
  ,houseRoof: { alignItems: "center", backgroundColor: "#EE7C2B", height: 82, justifyContent: "center" }
  ,hostRow: { alignItems: "center", flexDirection: "row", padding: 14 }
  ,hostAvatar: { alignItems: "center", backgroundColor: "#FBE5DA", borderRadius: 22, height: 44, justifyContent: "center", width: 44 }
  ,hostCopy: { flex: 1, marginLeft: 10 }
  ,hostName: { color: "#1D2330", fontSize: 14, fontWeight: "900" }
  ,hostRating: { color: "#EE7C2B", fontSize: 11, fontWeight: "700", marginTop: 2 }
  ,openBadge: { backgroundColor: "#E6F3EC", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 }
  ,openBadgeText: { color: "#247A50", fontSize: 9, fontWeight: "900" }
  ,amenities: { borderTopColor: "#EEE9E4", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", padding: 12 }
  ,amenity: { alignItems: "center", gap: 4 }
  ,amenityText: { color: "#626D84", fontSize: 10, fontWeight: "800" }
  ,insuranceScene: { alignItems: "center", height: 220, justifyContent: "center", width: "100%" }
  ,shieldCircle: { alignItems: "center", backgroundColor: "#EE7C2B", borderColor: "#FFFFFF", borderRadius: 43, borderWidth: 6, height: 86, justifyContent: "center", left: 2, position: "absolute", top: 4, width: 86, zIndex: 2 }
  ,coverageCard: { backgroundColor: "#FFFFFF", borderColor: "#E7E0DA", borderRadius: 20, borderWidth: 1, padding: 16, paddingLeft: 90, shadowColor: "#1D2330", shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.09, shadowRadius: 14, width: "92%" }
  ,coverageTitle: { color: "#1D2330", fontSize: 15, fontWeight: "900", marginBottom: 10 }
  ,coverageItem: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 7 }
  ,coverageCheck: { alignItems: "center", backgroundColor: "#2FA56A", borderRadius: 8, height: 16, justifyContent: "center", width: 16 }
  ,coverageItemText: { color: "#626D84", fontSize: 11, fontWeight: "700" }
  ,coveragePriceRow: { alignItems: "baseline", flexDirection: "row", gap: 5, marginTop: 12 }
  ,coverageFrom: { color: "#8B92A0", fontSize: 8, fontWeight: "900" }
  ,coveragePrice: { color: "#EE7C2B", fontSize: 15, fontWeight: "900" }
  ,featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" }
  ,featureTile: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E0DA", borderRadius: 15, borderWidth: 1, padding: 10, width: "29%" }
  ,featureIcon: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }
  ,featureLabel: { color: "#343B49", fontSize: 9, fontWeight: "800", marginTop: 6, textAlign: "center" }
});
