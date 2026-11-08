import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "../components/BrandLogo";
import { customerServices, type CustomerService } from "../types/service";
import { useState } from "react";

type Props = {
  customerName?: string | null;
  onLogout: () => void;
  onSelect: (service: CustomerService) => void;
};

export function CustomerServiceSelectionScreen({ customerName, onLogout, onSelect }: Props) {
  const [selectedService, setSelectedService] = useState<CustomerService>("pet");
  const service = customerServices.find((item) => item.id === selectedService) ?? customerServices[0];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <BrandLogo size="medium" />
          <View style={styles.topActions}>
            <Text style={styles.greeting}>{customerName?.split(" ")[0] ?? "Hola"}</Text>
            <Pressable accessibilityLabel="Cerrar sesión" onPress={onLogout} style={styles.logout}>
              <Feather color="#626D84" name="log-out" size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.contentHeader}>
          <Text style={styles.kicker}>NOD {selectedService === "home" ? "HOME" : "PET"}</Text>
          <Text style={styles.title}>{selectedService === "home" ? "Servicios para tu hogar" : "Todo para tu mascota"}</Text>
          <Text style={styles.helper}>{service.description}</Text>
        </View>

        <View style={[styles.heroCard, { backgroundColor: selectedService === "home" ? "#EAF3ED" : "#FFF0E5" }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${service.color}22` }]}>
            <Feather color={service.color} name={service.icon} size={31} />
          </View>
          <Text style={styles.heroTitle}>{selectedService === "home" ? "Encuentra ayuda cerca de ti" : "Cuida, conecta y disfruta"}</Text>
          <Text style={styles.heroText}>{selectedService === "home" ? "Elige uno de los servicios disponibles y solicita una cotización." : "Accede a tus mascotas, paseos, reservas, matches y comunidad."}</Text>
        </View>

        <Pressable onPress={() => onSelect(selectedService)} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.primaryButtonText}>Entrar a {selectedService === "home" ? "Hogar" : "Mascotas"}</Text>
          <Feather color="#FFFFFF" name="arrow-right" size={19} />
        </Pressable>

        <Text style={styles.footerHint}>Puedes cambiar de producto cuando quieras desde el menú inferior.</Text>
      </ScrollView>

      <View style={styles.bottomNav}>
        {customerServices.map((item) => {
          const isSelected = item.id === selectedService;
          return (
            <Pressable key={item.id} onPress={() => setSelectedService(item.id)} style={[styles.bottomNavItem, isSelected && styles.bottomNavItemSelected]}>
              <Feather color={isSelected ? item.color : "#8992A3"} name={item.icon} size={20} />
              <Text style={[styles.bottomNavLabel, isSelected && { color: item.color }]}>{item.id === "pet" ? "Mascotas" : "Hogar"}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FCFAF7", flex: 1 },
  container: { flexGrow: 1, padding: 20, paddingBottom: 34 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 23 },
  topActions: { alignItems: "center", flexDirection: "row", gap: 10 },
  greeting: { color: "#626D84", fontSize: 14, fontWeight: "700" },
  logout: { padding: 8 },
  contentHeader: { paddingTop: 52 },
  kicker: { color: "#EE7C2B", fontSize: 12, fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  title: { color: "#1D2330", fontSize: 29, fontWeight: "800", lineHeight: 35, marginBottom: 9 },
  helper: { color: "#626D84", fontSize: 16, lineHeight: 23, marginBottom: 23 },
  heroCard: { borderRadius: 24, gap: 12, marginBottom: 22, padding: 22 },
  heroIcon: { alignItems: "center", borderRadius: 18, height: 60, justifyContent: "center", width: 60 },
  heroTitle: { color: "#1D2330", fontSize: 20, fontWeight: "800", marginTop: 4 },
  heroText: { color: "#626D84", fontSize: 14, lineHeight: 21 },
  primaryButton: { alignItems: "center", backgroundColor: "#EE7C2B", borderRadius: 15, flexDirection: "row", gap: 12, justifyContent: "center", paddingVertical: 17 },
  buttonPressed: { opacity: 0.75 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footerHint: { color: "#8992A3", fontSize: 12, lineHeight: 18, marginTop: 18, textAlign: "center" },
  bottomNav: { backgroundColor: "#FFFFFF", borderTopColor: "#E7E1DA", borderTopWidth: 1, flexDirection: "row", paddingBottom: 9, paddingHorizontal: 16, paddingTop: 9 },
  bottomNavItem: { alignItems: "center", borderRadius: 15, flex: 1, gap: 4, paddingVertical: 9 },
  bottomNavItemSelected: { backgroundColor: "#F7F4EF" },
  bottomNavLabel: { color: "#8992A3", fontSize: 12, fontWeight: "800" }
});
