import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export function GoogleAuthButton({
  disabled = false,
  label,
  loading = false,
  onPress
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled || loading) && styles.buttonMuted]}
    >
      {loading ? <ActivityIndicator color="#4285F4" /> : <>
        <View style={styles.icon}><Text style={styles.iconText}>G</Text></View>
        <Text style={styles.label}>{label}</Text>
      </>}
    </Pressable>
  );
}

export function AuthDivider() {
  return <View style={styles.dividerRow}><View style={styles.line} /><Text style={styles.or}>o</Text><View style={styles.line} /></View>;
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#D5D9E2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16
  },
  buttonMuted: { opacity: 0.6 },
  icon: { alignItems: "center", height: 24, justifyContent: "center", width: 24 },
  iconText: { color: "#4285F4", fontSize: 20, fontWeight: "900" },
  label: { color: "#1D2330", fontSize: 15, fontWeight: "800" },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: 12, marginVertical: 2 },
  line: { backgroundColor: "#E7E0DA", flex: 1, height: 1 },
  or: { color: "#7B8498", fontSize: 13, fontWeight: "700" }
});
