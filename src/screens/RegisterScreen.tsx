import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { loginWithPassword, registerProvider } from "../api/auth";
import { assertRuntimeConfig } from "../config/env";
import { saveSession, type Session } from "../storage/session";
import type { RegisterProviderPayload } from "../types/api";
import { BrandLogo } from "../components/BrandLogo";
import { formatChileanRut, isValidChileanRut } from "../utils/rut";
import { getFriendlyError } from "../utils/errors";

type Props = {
  onBack: () => void;
  onRegistered: (session: Session) => void;
};

export function RegisterScreen({ onBack, onRegistered }: Props) {
  const [rut, setRut] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [phone, setPhone] = useState("");
  const [legalEntityType, setLegalEntityType] =
    useState<NonNullable<RegisterProviderPayload["legal_entity_type"]>>("natural");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const canSubmit =
    isValidChileanRut(rut) &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) &&
    /\d/.test(password) &&
    password === passwordConfirmation &&
    phone.trim();

  async function handleRegister() {
    setError(null);
    setIsLoading(true);

    try {
      if (password.length < 8 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password)) {
        setError("La clave debe tener al menos 8 caracteres, una letra y un número.");
        return;
      }

      if (password !== passwordConfirmation) {
        setError("Las passwords no coinciden.");
        return;
      }

      if (!isValidChileanRut(rut)) {
        setError("Ingresa un RUT chileno válido, con guion y dígito verificador.");
        return;
      }

      assertRuntimeConfig();
      const response = await registerProvider({
        rut,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        legal_entity_type: legalEntityType
      });
      const session = await loginWithPassword(response.email, password);
      await saveSession(session);
      onRegistered(session);
    } catch (currentError) {
      setError(getFriendlyError(currentError, "No se pudo crear la cuenta."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <BrandLogo size="large" />
        <Text style={styles.title}>Registro proveedor</Text>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Paso {step} de 2</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: step === 1 ? "50%" : "100%" }]} /></View>
        </View>

        <View style={styles.form}>
          {step === 1 ? <>
          <Text style={styles.sectionTitle}>Identificación</Text>
          <Text style={styles.stepHelp}>Validaremos el RUT chileno con módulo 11.</Text>
          <TextInput
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            maxLength={12}
            onChangeText={(value) => setRut(formatChileanRut(value))}
            placeholder="RUT (12.345.678-5)"
            showSoftInputOnFocus
            style={styles.input}
            value={rut}
          />
          {rut ? <Text style={isValidChileanRut(rut) ? styles.validText : styles.fieldError}>{isValidChileanRut(rut) ? "RUT válido" : "Revisa el guion y el dígito verificador"}</Text> : null}
          <TextInput
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setFirstName}
            placeholder="Nombre"
            showSoftInputOnFocus
            style={styles.input}
            value={firstName}
          />
          <TextInput
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setLastName}
            placeholder="Apellido"
            showSoftInputOnFocus
            style={styles.input}
            value={lastName}
          />
          <Pressable disabled={!isValidChileanRut(rut) || !firstName.trim() || !lastName.trim()} onPress={() => { setError(null); setStep(2); }} style={[styles.primaryButton, (!isValidChileanRut(rut) || !firstName.trim() || !lastName.trim()) && styles.buttonDisabled]}><Text style={styles.primaryText}>Continuar</Text></Pressable>
          </> : null}

          {step === 2 ? <>
          <Text style={styles.sectionTitle}>Acceso y contacto</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={Platform.OS === "ios" ? "email-address" : "visible-password"}
            onChangeText={setEmail}
            placeholder="Email"
            showSoftInputOnFocus
            style={styles.input}
            value={email}
          />
          <TextInput
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setPassword}
            placeholder="Clave (8+ caracteres, letra y número)"
            secureTextEntry
            showSoftInputOnFocus
            style={styles.input}
            value={password}
          />
          <TextInput
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setPasswordConfirmation}
            placeholder="Confirmar password"
            secureTextEntry
            showSoftInputOnFocus
            style={styles.input}
            value={passwordConfirmation}
          />
          <TextInput
            autoCorrect={false}
            keyboardType={Platform.OS === "ios" ? "phone-pad" : "visible-password"}
            onChangeText={setPhone}
            placeholder="Telefono"
            showSoftInputOnFocus
            style={styles.input}
            value={phone}
          />

          <View style={styles.segmented}>
            <Pressable
              onPress={() => setLegalEntityType("natural")}
              style={[
                styles.segment,
                legalEntityType === "natural" && styles.segmentSelected
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  legalEntityType === "natural" && styles.segmentTextSelected
                ]}
              >
                Persona natural
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLegalEntityType("juridica")}
              style={[
                styles.segment,
                legalEntityType === "juridica" && styles.segmentSelected
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  legalEntityType === "juridica" && styles.segmentTextSelected
                ]}
              >
                Empresa
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isLoading || !canSubmit}
          onPress={handleRegister}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isLoading) && styles.buttonPressed,
            !canSubmit && styles.buttonDisabled
          ]}
        >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={[styles.primaryText, !canSubmit && styles.primaryTextDisabled]}>Crear cuenta</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setStep(1)} style={styles.backStepButton}><Text style={styles.backStepText}>Atrás</Text></Pressable>
          </> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFAF7"
  },
  content: {
    padding: 24,
    paddingTop: 56
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20
  },
  backText: {
    color: "#EE7C2B",
    fontSize: 16,
    fontWeight: "700"
  },
  title: {
    color: "#1D2330",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24
  },
  logo: {
    height: 92,
    marginBottom: 12,
    width: 64
  },
  form: {
    gap: 14
  },
  sectionTitle: {
    color: "#1D2330",
    fontSize: 16,
    fontWeight: "900"
  },
  progressHeader: {
    gap: 8,
    marginBottom: 22
  },
  progressText: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "800"
  },
  progressTrack: {
    backgroundColor: "#E7E0DA",
    borderRadius: 4,
    height: 6,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: "#EE7C2B",
    height: 6
  },
  stepHelp: {
    color: "#626D84",
    fontSize: 13,
    lineHeight: 18
  },
  validText: {
    color: "#367D5F",
    fontSize: 13,
    fontWeight: "800"
  },
  fieldError: {
    color: "#A32D2D",
    fontSize: 13,
    fontWeight: "700"
  },
  backStepButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  backStepText: {
    color: "#EE7C2B",
    fontSize: 15,
    fontWeight: "800"
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1D2330",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14
  },
  segmented: {
    backgroundColor: "#E7E0DA",
    borderRadius: 8,
    flexDirection: "row",
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  segmentSelected: {
    backgroundColor: "#ffffff"
  },
  segmentText: {
    color: "#626D84",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center"
  },
  segmentTextSelected: {
    color: "#EE7C2B"
  },
  error: {
    color: "#A32D2D",
    fontSize: 14
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    minHeight: 52,
    justifyContent: "center"
  },
  buttonPressed: {
    opacity: 0.9
  },
  buttonDisabled: {
    backgroundColor: "#E7E0DA"
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  primaryTextDisabled: {
    color: "#626D84"
  }
});
