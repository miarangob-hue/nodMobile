import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandLogo } from "../components/BrandLogo";

type AccountRole = "customer" | "provider";

export function RoleSelectionScreen({ onBack, onLogin, onSelect }: {
  onBack: () => void;
  onLogin: () => void;
  onSelect: (role: AccountRole) => void;
}) {
  const [role, setRole] = useState<AccountRole>("customer");

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <Pressable onPress={onBack} style={styles.back}><Feather color="#1D2330" name="arrow-left" size={20} /><Text style={styles.backText}>Volver</Text></Pressable>
      <BrandLogo size="large" />
      <Text style={styles.title}>¿Cómo quieres usar NOD?</Text>
      <Text style={styles.subtitle}>Elige el perfil que corresponde a lo que quieres hacer.</Text>

      <Pressable onPress={() => setRole("customer")} style={[styles.card, role === "customer" && styles.cardSelected]}>
        <View style={styles.icon}><Feather color="#EE7C2B" name="heart" size={24} /></View>
        <View style={styles.copy}><Text style={styles.cardTitle}>Soy cliente</Text><Text style={styles.cardText}>Busco paseos, citas y alojamiento para mi mascota.</Text></View>
        {role === "customer" ? <Feather color="#EE7C2B" name="check-circle" size={22} /> : null}
      </Pressable>

      <Pressable onPress={() => setRole("provider")} style={[styles.card, role === "provider" && styles.cardSelected]}>
        <View style={styles.icon}><Feather color="#EE7C2B" name="users" size={24} /></View>
        <View style={styles.copy}><Text style={styles.cardTitle}>Soy proveedor</Text><Text style={styles.cardText}>Ofrezco paseos, alojamiento u otros servicios.</Text></View>
        {role === "provider" ? <Feather color="#EE7C2B" name="check-circle" size={22} /> : null}
      </Pressable>

      <Pressable onPress={() => onSelect(role)} style={styles.continueButton}><Text style={styles.continueText}>Continuar</Text></Pressable>
      <Pressable onPress={onLogin} style={styles.loginButton}><Text style={styles.loginText}>Ya tengo cuenta</Text></Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FCFAF7", flex: 1, padding: 24 },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 7, marginBottom: 28, minHeight: 40 },
  backText: { color: "#1D2330", fontSize: 14, fontWeight: "800" },
  title: { color: "#1D2330", fontSize: 28, fontWeight: "900", lineHeight: 34, marginTop: 34 },
  subtitle: { color: "#626D84", fontSize: 15, lineHeight: 21, marginBottom: 22, marginTop: 7 },
  card: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 13, marginBottom: 12, minHeight: 96, padding: 16 },
  cardSelected: { backgroundColor: "#FFF4EC", borderColor: "#EE7C2B", borderWidth: 2 },
  icon: { alignItems: "center", backgroundColor: "#FBE5DA", borderRadius: 10, height: 48, justifyContent: "center", width: 48 },
  copy: { flex: 1 },
  cardTitle: { color: "#1D2330", fontSize: 17, fontWeight: "900" },
  cardText: { color: "#626D84", fontSize: 13, lineHeight: 18, marginTop: 4 },
  continueButton: { alignItems: "center", backgroundColor: "#EE7C2B", borderRadius: 9, justifyContent: "center", marginTop: 12, minHeight: 52 },
  continueText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  loginButton: { alignItems: "center", justifyContent: "center", minHeight: 50 },
  loginText: { color: "#EE7C2B", fontSize: 15, fontWeight: "900" }
});
