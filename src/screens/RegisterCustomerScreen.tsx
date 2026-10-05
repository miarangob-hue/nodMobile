import { useEffect, useRef, useState } from "react";
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
import { loginWithPassword, registerCustomer } from "../api/auth";
import { BrandLogo } from "../components/BrandLogo";
import { AuthDivider, GoogleAuthButton } from "../components/GoogleAuthButton";
import { formatChileanRut, isValidChileanRut } from "../utils/rut";
import { getFriendlyError } from "../utils/errors";
import { searchChileanAddresses, type AddressSuggestion } from "../api/location";
import { authenticateWithGoogle, isGoogleSignInCancellation } from "../services/googleAuth";
import { saveSession, type Session } from "../storage/session";

const countryCodes = [
  { code: "+56", label: "🇨🇱 Chile" },
  { code: "+54", label: "🇦🇷 Argentina" },
  { code: "+51", label: "🇵🇪 Perú" },
  { code: "+591", label: "🇧🇴 Bolivia" }
];

type Props = {
  onBack: () => void;
  onGoogleAuthenticated: (session: Session) => void;
};

export function RegisterCustomerScreen({ onBack, onGoogleAuthenticated }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+56");
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [rut, setRut] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [comuna, setComuna] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step !== 3 || address.trim().length < 3) {
        setAddressSuggestions([]);
        return;
      }
      void searchChileanAddresses(address).then(setAddressSuggestions).catch(() => setAddressSuggestions([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [address, step]);

  function revealField(y: number) {
    setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), 180);
  }

  function continueAccessStep() {
    const normalizedEmail = email.trim();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Ingresa nombre y apellido para continuar.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Ingresa un email válido.");
      return;
    }
    if (password.length < 8 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password)) {
      setError("La clave debe tener al menos 8 caracteres, una letra y un número.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Las claves no coinciden.");
      return;
    }
    setError(null);
    setStep(2);
    scrollRef.current?.scrollTo({ y: 250, animated: true });
  }

  const canRegister = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) &&
    /\d/.test(password) &&
    password === passwordConfirmation &&
    phone.trim() &&
    isValidChileanRut(rut) &&
    address.trim() &&
    comuna.trim() &&
    city.trim() &&
    !isRegistering
  );

  async function handleRegisterCustomer() {
    if (!canRegister) {
      setError(
        password && password !== passwordConfirmation
          ? "Las claves no coinciden."
          : rut.trim() && !isValidChileanRut(rut)
            ? "Ingresa un RUT chileno válido, con guion y dígito verificador."
            : "Completa nombre, apellido, email, clave, teléfono, RUT, dirección, comuna y ciudad."
      );
      return;
    }

    setError(null);
    setIsRegistering(true);

    try {
      const response = await registerCustomer({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: normalizeInternationalPhone(countryCode, phone),
        rut,
        address: address.trim(),
        city: city.trim() || undefined,
        comuna: comuna.trim() || undefined
      });
      const session = await loginWithPassword(response.email, password, "customer");
      await saveSession(session);
      onGoogleAuthenticated(session);
    } catch (currentError) {
      setError(getFriendlyError(currentError, "No se pudo crear la cuenta cliente."));
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleGoogleRegister() {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const session = await authenticateWithGoogle("customer");
      if (!session) return;
      await saveSession(session);
      onGoogleAuthenticated(session);
    } catch (currentError) {
      if (!isGoogleSignInCancellation(currentError)) {
        setError(getFriendlyError(currentError, "No se pudo registrar con Google."));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <BrandLogo size="large" />
        <Text style={styles.title}>Crear cuenta cliente</Text>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Paso {step} de 3</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${step * 33.333}%` }]} /></View>
        </View>

        <View style={styles.form}>
          <GoogleAuthButton
            disabled={isRegistering}
            label="Registrarse con Google"
            loading={isGoogleLoading}
            onPress={() => void handleGoogleRegister()}
          />
          <AuthDivider />
          {step === 1 ? <>
          <Text style={styles.sectionTitle}>Datos de acceso</Text>
          <View style={styles.nameRow}>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
              onChangeText={setFirstName}
              onFocus={() => revealField(300)}
              onSubmitEditing={() => lastNameRef.current?.focus()}
              placeholder="Nombre"
              returnKeyType="next"
              showSoftInputOnFocus
              style={[styles.input, styles.nameInput]}
              value={firstName}
            />
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
              onChangeText={setLastName}
              onFocus={() => revealField(300)}
              onSubmitEditing={() => emailRef.current?.focus()}
              placeholder="Apellido"
              ref={lastNameRef}
              returnKeyType="next"
              showSoftInputOnFocus
              style={[styles.input, styles.nameInput]}
              value={lastName}
            />
          </View>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "email-address"}
            onChangeText={setEmail}
            onFocus={() => revealField(390)}
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="Email"
            ref={emailRef}
            returnKeyType="next"
            showSoftInputOnFocus
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setPassword}
            onFocus={() => revealField(470)}
            onSubmitEditing={() => confirmationRef.current?.focus()}
            placeholder="Clave"
            ref={passwordRef}
            returnKeyType="next"
            secureTextEntry
            showSoftInputOnFocus
            style={styles.input}
            textContentType="newPassword"
            value={password}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setPasswordConfirmation}
            onFocus={() => revealField(550)}
            onSubmitEditing={continueAccessStep}
            placeholder="Repetir clave"
            ref={confirmationRef}
            returnKeyType="done"
            secureTextEntry
            showSoftInputOnFocus
            style={styles.input}
            textContentType="newPassword"
            value={passwordConfirmation}
          />
          <Text style={styles.stepHelp}>Usa al menos 8 caracteres, incluyendo una letra y un número. Ambas claves deben coincidir.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={continueAccessStep} style={styles.primaryButton}><Text style={styles.primaryText}>Continuar</Text></Pressable>
          </> : null}

          {step === 2 ? <>
          <Text style={styles.sectionTitle}>Identificación</Text>
          <Text style={styles.stepHelp}>El RUT se valida automáticamente con módulo 11.</Text>
          <View style={styles.phoneRow}>
            <Pressable onPress={() => setShowCountryCodes((current) => !current)} style={styles.countryButton}>
              <Text style={styles.countryButtonText}>{countryCodes.find((item) => item.code === countryCode)?.label} {countryCode} ▾</Text>
            </Pressable>
            <TextInput autoCorrect={false} keyboardType="phone-pad" onChangeText={setPhone} onFocus={() => revealField(330)} placeholder="9 1234 5678" showSoftInputOnFocus style={[styles.input, styles.phoneInput]} textContentType="telephoneNumber" value={phone} />
          </View>
          {showCountryCodes ? <View style={styles.dropdown}>{countryCodes.map((item) => <Pressable key={item.code} onPress={() => { setCountryCode(item.code); setShowCountryCodes(false); }} style={styles.dropdownItem}><Text style={styles.dropdownText}>{item.label} · {item.code}</Text></Pressable>)}</View> : null}
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            maxLength={12}
            onChangeText={(value) => setRut(formatChileanRut(value))}
            onFocus={() => revealField(410)}
            placeholder="RUT (12.345.678-5)"
            showSoftInputOnFocus
            style={styles.input}
            value={rut}
          />
          {rut ? <Text style={isValidChileanRut(rut) ? styles.validText : styles.fieldError}>{isValidChileanRut(rut) ? "RUT válido" : "Revisa el guion y el dígito verificador"}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.stepActions}>
            <Pressable onPress={() => setStep(1)} style={styles.backStepButton}><Text style={styles.backStepText}>Atrás</Text></Pressable>
            <Pressable disabled={!firstName.trim() || !lastName.trim() || !phone.trim() || !isValidChileanRut(rut)} onPress={() => { setError(null); setStep(3); }} style={[styles.primaryButton, styles.stepPrimary, (!firstName.trim() || !lastName.trim() || !phone.trim() || !isValidChileanRut(rut)) && styles.buttonDisabled]}><Text style={styles.primaryText}>Continuar</Text></Pressable>
          </View>
          </> : null}

          {step === 3 ? <>
          <Text style={styles.sectionTitle}>¿Dónde necesitas servicios?</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setAddress}
            onFocus={() => revealField(330)}
            placeholder="Direccion"
            showSoftInputOnFocus
            style={styles.input}
            textContentType="fullStreetAddress"
            value={address}
          />
          {addressSuggestions.length ? <View style={styles.suggestions}>{addressSuggestions.map((suggestion) => <Pressable key={suggestion.id} onPress={() => { setAddress(suggestion.address); setComuna(suggestion.comuna); setCity(suggestion.city); setAddressSuggestions([]); }} style={styles.suggestionItem}><Text style={styles.suggestionText}>{suggestion.label}</Text></Pressable>)}</View> : null}
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onFocus={() => revealField(410)}
            placeholder="Comuna"
            showSoftInputOnFocus
            style={styles.input}
            value={comuna}
            onChangeText={setComuna}
          />
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            onChangeText={setCity}
            onFocus={() => revealField(490)}
            placeholder="Ciudad"
            showSoftInputOnFocus
            style={styles.input}
            value={city}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={isRegistering}
            onPress={handleRegisterCustomer}
            style={[styles.primaryButton, isRegistering && styles.buttonDisabled]}
          >
            {isRegistering ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>Crear cuenta y entrar</Text>}
          </Pressable>
          <Pressable onPress={() => setStep(2)} style={styles.backStepButton}><Text style={styles.backStepText}>Atrás</Text></Pressable>
          </> : null}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function normalizeInternationalPhone(countryCode: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  const countryDigits = countryCode.replace(/\D/g, "");
  return digits.startsWith(countryDigits) ? `+${digits}` : `${countryCode}${digits}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FCFAF7",
    flex: 1
  },
  content: {
    padding: 24,
    paddingBottom: 340,
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
    fontSize: 30,
    fontWeight: "900",
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
  nameRow: {
    flexDirection: "row",
    gap: 10
  },
  nameInput: {
    flex: 1
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
  stepActions: {
    flexDirection: "row",
    gap: 10
  },
  stepPrimary: {
    flex: 1
  },
  backStepButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18
  },
  backStepText: {
    color: "#EE7C2B",
    fontSize: 15,
    fontWeight: "800"
  },
  infoPanel: {
    backgroundColor: "#FAEEDA",
    borderColor: "#FAEEDA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  infoText: {
    color: "#854F0B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
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
  phoneRow: { flexDirection: "row", gap: 8 },
  countryButton: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 10 },
  countryButtonText: { color: "#1D2330", fontSize: 12, fontWeight: "800" },
  phoneInput: { flex: 1 },
  dropdown: { backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  dropdownItem: { borderBottomColor: "#F1EFE8", borderBottomWidth: 1, padding: 13 },
  dropdownText: { color: "#1D2330", fontSize: 14, fontWeight: "700" },
  suggestions: { backgroundColor: "#ffffff", borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, marginTop: -8, overflow: "hidden" },
  suggestionItem: { borderBottomColor: "#F1EFE8", borderBottomWidth: 1, padding: 12 },
  suggestionText: { color: "#1D2330", fontSize: 13, lineHeight: 18 },
  error: {
    color: "#A32D2D",
    fontSize: 14
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 52
  },
  buttonDisabled: {
    opacity: 0.45
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  divider: {
    backgroundColor: "#E7E0DA",
    height: 1,
    marginVertical: 10
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48
  },
  secondaryActionText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  customerRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  customerAvatar: {
    alignItems: "center",
    backgroundColor: "#FBE5DA",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  customerAvatarText: {
    color: "#EE7C2B",
    fontSize: 13,
    fontWeight: "900"
  },
  customerCopy: {
    flex: 1
  },
  customerName: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "900"
  },
  customerMeta: {
    color: "#626D84",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  }
});
