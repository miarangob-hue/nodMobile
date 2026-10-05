import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { updateCustomerProfile } from "../api/customer";
import { BrandLogo } from "../components/BrandLogo";
import type { Session } from "../storage/session";
import type { Customer } from "../types/api";
import { getFriendlyError } from "../utils/errors";
import { formatChileanRut, isValidChileanRut } from "../utils/rut";

export function CompleteCustomerProfileScreen({ customer, onComplete, session }: {
  customer: Customer;
  onComplete: (customer: Customer) => void;
  session: Session;
}) {
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [rut, setRut] = useState(customer.rut ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [comuna, setComuna] = useState(customer.comuna ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = phone.trim() && isValidChileanRut(rut);

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await updateCustomerProfile({
        customerId: customer.id,
        accessToken: session.access_token,
        values: {
          phone: phone.trim(),
          rut,
          address: address.trim() || null,
          comuna: comuna.trim() || null,
          city: city.trim() || null
        }
      });
      onComplete(updated);
    } catch (currentError) {
      setError(getFriendlyError(currentError, "No se pudo completar el perfil."));
    } finally {
      setLoading(false);
    }
  }

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BrandLogo size="large" />
      <Text style={styles.title}>Completa tu perfil</Text>
      <Text style={styles.subtitle}>Google ya confirmó tu identidad. Necesitamos estos datos para que puedas reservar servicios.</Text>
      <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Teléfono" style={styles.input} value={phone} />
      <TextInput autoCapitalize="characters" maxLength={12} onChangeText={(value) => setRut(formatChileanRut(value))} placeholder="RUT (12.345.678-5)" style={styles.input} value={rut} />
      {rut ? <Text style={isValidChileanRut(rut) ? styles.valid : styles.error}>{isValidChileanRut(rut) ? "RUT válido" : "Revisa el RUT y su dígito verificador"}</Text> : null}
      <TextInput onChangeText={setAddress} placeholder="Dirección (opcional)" style={styles.input} value={address} />
      <TextInput onChangeText={setComuna} placeholder="Comuna (opcional)" style={styles.input} value={comuna} />
      <TextInput onChangeText={setCity} placeholder="Ciudad (opcional)" style={styles.input} value={city} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={!canSubmit || loading} onPress={() => void submit()} style={[styles.button, (!canSubmit || loading) && styles.disabled]}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Guardar y continuar</Text>}
      </Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FCFAF7", flex: 1 },
  content: { gap: 14, padding: 24, paddingTop: 56 },
  title: { color: "#1D2330", fontSize: 28, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#626D84", fontSize: 14, lineHeight: 20, marginBottom: 8 },
  input: { backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, color: "#1D2330", fontSize: 16, minHeight: 52, paddingHorizontal: 14 },
  valid: { color: "#367D5F", fontSize: 13, fontWeight: "800" },
  error: { color: "#A32D2D", fontSize: 13, fontWeight: "700" },
  button: { alignItems: "center", backgroundColor: "#EE7C2B", borderRadius: 8, justifyContent: "center", minHeight: 52 },
  disabled: { opacity: 0.45 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "800" }
});
