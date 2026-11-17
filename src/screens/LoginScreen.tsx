import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandLogo } from "../components/BrandLogo";
import { AuthDivider, GoogleAuthButton } from "../components/GoogleAuthButton";
import { loginWithPassword, requestAbaiLoginCode, verifyAbaiLoginCode } from "../api/auth";
import { assertRuntimeConfig } from "../config/env";
import { loadLoginMode, saveLoginMode, saveSession, type Session } from "../storage/session";
import { getFriendlyError } from "../utils/errors";
import { authenticateWithGoogle, isGoogleSignInCancellation } from "../services/googleAuth";

type Props = {
  onLogin: (session: Session) => void;
  onRegisterCustomer: () => void;
  onRegister: () => void;
};

type LoginMode = "customer" | "provider" | "abai";

export function LoginScreen({ onLogin, onRegister, onRegisterCustomer }: Props) {
  const [mode, setMode] = useState<LoginMode>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [abaiCode, setAbaiCode] = useState("");
  const [abaiChallengeId, setAbaiChallengeId] = useState<string | undefined>();
  const [abaiCodeRequested, setAbaiCodeRequested] = useState(false);

  useEffect(() => {
    void loadLoginMode().then((savedMode) => savedMode && setMode(savedMode));
  }, []);

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError(null);
    void saveLoginMode(nextMode);
    setAbaiCodeRequested(false);
    setAbaiCode("");
    setAbaiChallengeId(undefined);
  }

  async function handleLogin() {
    setError(null);
    setIsLoading(true);

    try {
      assertRuntimeConfig(mode);
      const session = mode === "abai"
        ? await verifyAbaiLoginCode(email.trim(), abaiCode.trim(), abaiChallengeId)
        : await loginWithPassword(email.trim(), password, mode);
      await saveSession(session);
      onLogin(session);
    } catch (currentError) {
      setError(getFriendlyError(currentError, "No se pudo iniciar sesión."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAbaiCodeRequest() {
    setError(null);
    setIsLoading(true);
    try {
      assertRuntimeConfig("abai");
      const response = await requestAbaiLoginCode(email.trim());
      setAbaiChallengeId(response.challenge_id);
      setAbaiCodeRequested(true);
      Alert.alert("Código enviado", response.masked_destination
        ? `Enviamos un código a ${response.masked_destination}.`
        : "Enviamos un código al número registrado en ABAI.");
    } catch (currentError) {
      setError(getFriendlyError(currentError, "No pudimos validar tu teléfono como cliente ABAI."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setIsGoogleLoading(true);

    try {
      assertRuntimeConfig(mode);
      const session = await authenticateWithGoogle(mode === "provider" ? "provider" : "customer");
      if (!session) return;
      await saveSession(session);
      onLogin(session);
    } catch (currentError) {
      if (!isGoogleSignInCancellation(currentError)) {
        setError(getFriendlyError(currentError, "No se pudo continuar con Google."));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <BrandLogo size="large" />
        <Text style={styles.title}>{mode === "abai" ? "Cliente ABAI" : `Acceso ${mode === "customer" ? "cliente" : "proveedor"}`}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.segmented}>
          <Pressable
            onPress={() => changeMode("customer")}
            style={[styles.segment, mode === "customer" && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, mode === "customer" && styles.segmentTextSelected]}>Cliente</Text>
          </Pressable>
          <Pressable
            onPress={() => changeMode("provider")}
            style={[styles.segment, mode === "provider" && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, mode === "provider" && styles.segmentTextSelected]}>Proveedor</Text>
          </Pressable>
          <Pressable onPress={() => changeMode("abai")} style={[styles.segment, mode === "abai" && styles.segmentSelected]}>
            <Text style={[styles.segmentText, mode === "abai" && styles.segmentTextSelected]}>ABAI</Text>
          </Pressable>
        </View>

        <TextInput
          autoCapitalize="none"
          autoComplete={mode === "abai" ? "tel" : "email"}
          autoCorrect={false}
          keyboardType={mode === "abai" ? "phone-pad" : Platform.OS === "android" ? "visible-password" : "email-address"}
          onChangeText={setEmail}
          placeholder={mode === "abai" ? "+56 9 1234 5678" : "Email"}
          returnKeyType="next"
          showSoftInputOnFocus
          style={styles.input}
          value={email}
        />
        {mode !== "abai" ? <View style={styles.passwordField}>
          <TextInput
            autoCapitalize="none"
            keyboardType="default"
            onChangeText={setPassword}
            placeholder="Contraseña"
            secureTextEntry={!showPassword}
            showSoftInputOnFocus
            style={styles.passwordInput}
            value={password}
          />
          <Pressable accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
            <Feather color="#626D84" name={showPassword ? "eye-off" : "eye"} size={20} />
          </Pressable>
        </View> : null}

        {mode === "abai" ? <>
          <Text style={styles.abaiHint}>Ingresa el teléfono registrado en ABAI para recibir un código de acceso.</Text>
          {abaiCodeRequested ? <TextInput keyboardType="number-pad" onChangeText={setAbaiCode} placeholder="Código de 6 dígitos" style={styles.input} value={abaiCode} /> : null}
        </> : null}

        {mode !== "abai" ? <Pressable onPress={() => Alert.alert("Recuperar contraseña", "Te enviaremos instrucciones cuando la recuperación esté habilitada en el servidor.")} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
        </Pressable> : null}

        {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text><Pressable disabled={isLoading} onPress={() => void handleLogin()}><Text style={styles.retryText}>Reintentar</Text></Pressable></View> : null}

        <Pressable
          disabled={isLoading || !email || (mode === "abai" ? !abaiCodeRequested || !abaiCode : !password)}
          onPress={mode === "abai" && !abaiCodeRequested ? () => void handleAbaiCodeRequest() : () => void handleLogin()}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isLoading) && styles.buttonPressed,
            (!email || (mode === "abai" ? !abaiCodeRequested || !abaiCode : !password)) && styles.buttonDisabled
          ]}
        >
          {isLoading ? <ActivityIndicator color="#ffffff" /> : (
            <Text style={[styles.primaryText, (!email || (mode === "abai" ? !abaiCodeRequested || !abaiCode : !password)) && styles.primaryTextDisabled]}>
              {mode === "abai" ? (abaiCodeRequested ? "Validar código ABAI" : "Enviar código ABAI") : `Entrar como ${mode === "customer" ? "cliente" : "proveedor"}`}
            </Text>
          )}
        </Pressable>

        {mode !== "abai" ? <><AuthDivider />
        <GoogleAuthButton
          disabled={isLoading}
          label={`Continuar con Google como ${mode === "customer" ? "cliente" : "proveedor"}`}
          loading={isGoogleLoading}
          onPress={() => void handleGoogleLogin()}
        /></> : null}

        {mode === "provider" ? <Pressable onPress={onRegister} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Crear cuenta de proveedor</Text>
        </Pressable> : null}

        {mode === "customer" ? <Pressable onPress={onRegisterCustomer} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Crear cuenta de cliente</Text>
        </Pressable> : null}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FCFAF7",
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: "#FCFAF7"
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24
  },
  header: {
    marginBottom: 32
  },
  logo: {
    height: 116,
    marginBottom: 10,
    width: 80
  },
  title: {
    color: "#1D2330",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8
  },
  form: {
    gap: 14
  },
  segmented: {
    backgroundColor: "#E7E0DA",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    padding: 6
  },
  segment: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    minHeight: 46,
    justifyContent: "center"
  },
  segmentSelected: {
    backgroundColor: "#ffffff"
  },
  segmentText: {
    color: "#626D84",
    fontSize: 15,
    fontWeight: "800"
  },
  segmentTextSelected: {
    color: "#EE7C2B"
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
  abaiHint: {
    color: "#626D84",
    fontSize: 14,
    lineHeight: 20
  },
  passwordField: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52
  },
  passwordInput: {
    color: "#1D2330",
    flex: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14
  },
  eyeButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48
  },
  forgotButton: {
    alignSelf: "flex-end",
    minHeight: 32,
    justifyContent: "center"
  },
  forgotText: {
    color: "#EE7C2B",
    fontSize: 13,
    fontWeight: "700"
  },
  errorBox: {
    backgroundColor: "#FCE8E6",
    borderRadius: 8,
    gap: 6,
    padding: 12
  },
  error: {
    color: "#A32D2D",
    fontSize: 14
  },
  retryText: {
    color: "#A32D2D",
    fontSize: 13,
    fontWeight: "900"
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
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center"
  },
  secondaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  }
});
