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
import { loginWithPassword } from "../api/auth";
import { ApiError } from "../api/client";
import { listCustomers } from "../api/customer";
import { assertRuntimeConfig } from "../config/env";
import { loadLoginMode, saveLoginMode, saveSession, type Session } from "../storage/session";
import type { Customer } from "../types/api";
import { getFriendlyError } from "../utils/errors";

type Props = {
  onCustomerLogin: (customer: Customer) => void;
  onLogin: (session: Session) => void;
  onRegisterCustomer: () => void;
  onRegister: () => void;
};

type LoginMode = "customer" | "provider";

export function LoginScreen({ onCustomerLogin, onLogin, onRegister, onRegisterCustomer }: Props) {
  const [mode, setMode] = useState<LoginMode>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    void loadLoginMode().then((savedMode) => savedMode && setMode(savedMode));
  }, []);

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError(null);
    void saveLoginMode(nextMode);
  }

  async function handleLogin() {
    setError(null);
    setIsLoading(true);

    try {
      assertRuntimeConfig();
      if (mode === "customer") {
        const customer = await loginCustomer(email.trim(), password);
        onCustomerLogin(customer);
      } else {
        const session = await loginWithPassword(email.trim(), password, "provider");
        await saveSession(session);
        onLogin(session);
      }
    } catch (currentError) {
      setError(getFriendlyError(currentError, "No se pudo iniciar sesión."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <BrandLogo size="large" />
        <Text style={styles.title}>Acceso {mode === "customer" ? "cliente" : "proveedor"}</Text>
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
        </View>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "email-address"}
          onChangeText={setEmail}
          placeholder="Email"
          returnKeyType="next"
          showSoftInputOnFocus
          style={styles.input}
          value={email}
        />
        <View style={styles.passwordField}>
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
        </View>

        <Pressable onPress={() => Alert.alert("Recuperar contraseña", "Te enviaremos instrucciones cuando la recuperación esté habilitada en el servidor.")} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
        </Pressable>

        {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text><Pressable disabled={isLoading} onPress={() => void handleLogin()}><Text style={styles.retryText}>Reintentar</Text></Pressable></View> : null}

        <Pressable
          disabled={isLoading || !email || !password}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isLoading) && styles.buttonPressed,
            (!email || !password) && styles.buttonDisabled
          ]}
        >
          {isLoading ? <ActivityIndicator color="#ffffff" /> : (
            <Text style={[styles.primaryText, (!email || !password) && styles.primaryTextDisabled]}>
              Entrar como {mode === "customer" ? "cliente" : "proveedor"}
            </Text>
          )}
        </Pressable>

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

async function loginCustomer(email: string, password: string) {
  try {
    const session = await loginWithPassword(email, password, "customer", false);
    if (session.customer) {
      return session.customer;
    }
  } catch (currentError) {
    if (!(currentError instanceof ApiError) || ![404, 405].includes(currentError.status)) {
      throw currentError;
    }
  }

  const response = await listCustomers({ search: email });
  const customer = response.customers.find((current) => current.email?.toLowerCase() === email.toLowerCase())
    ?? response.customers[0];

  if (!customer) {
    throw new Error("No encontramos un cliente con ese email.");
  }

  return customer;
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
    minHeight: 48,
    justifyContent: "center"
  },
  secondaryText: {
    color: "#EE7C2B",
    fontSize: 15,
    fontWeight: "700"
  }
});
