import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "../components/BrandLogo";
import { customerServices, type CustomerService } from "../types/service";

type Props = {
  customerName?: string | null;
  onLogout: () => void;
  onSelect: (service: CustomerService) => void;
};

export function CustomerServiceSelectionScreen({ customerName, onLogout, onSelect }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <BrandLogo size="medium" />
        <Pressable accessibilityLabel="Cerrar sesión" onPress={onLogout} style={styles.logout}>
          <Feather color="#626D84" name="log-out" size={19} />
        </Pressable>
      </View>

      <Text style={styles.kicker}>NOD</Text>
      <Text style={styles.title}>{customerName ? `Hola, ${customerName}` : "Hola"}</Text>
      <Text style={styles.subtitle}>¿Qué servicio necesitas hoy?</Text>
      <Text style={styles.helper}>Elige una categoría. Dentro de cada una verás los servicios disponibles.</Text>

      <View style={styles.cards}>
        {customerServices.map((service) => (
          <Pressable key={service.id} onPress={() => onSelect(service.id)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={[styles.icon, { backgroundColor: `${service.color}18` }]}>
              <Feather color={service.color} name={service.icon} size={25} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{service.title}</Text>
              <Text style={styles.cardDescription}>{service.description}</Text>
            </View>
            <Feather color="#626D84" name="chevron-right" size={21} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#FCFAF7", flexGrow: 1, padding: 24, paddingBottom: 40 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 55 },
  logout: { padding: 8 },
  kicker: { color: "#EE7C2B", fontSize: 13, fontWeight: "800", letterSpacing: 2, marginBottom: 10 },
  title: { color: "#1D2330", fontSize: 32, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#1D2330", fontSize: 24, fontWeight: "700", lineHeight: 31 },
  helper: { color: "#626D84", fontSize: 16, lineHeight: 23, marginBottom: 28, marginTop: 12 },
  cards: { gap: 14 },
  card: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E1DA", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 14, padding: 17 },
  cardPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  icon: { alignItems: "center", borderRadius: 16, height: 53, justifyContent: "center", width: 53 },
  copy: { flex: 1 },
  cardTitle: { color: "#1D2330", fontSize: 17, fontWeight: "800", marginBottom: 5 },
  cardDescription: { color: "#626D84", fontSize: 13, lineHeight: 18 }
});
