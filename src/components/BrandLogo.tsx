import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  compact?: boolean;
  size?: "small" | "medium" | "large";
};

export function BrandLogo({ compact = false, size = "medium" }: Props) {
  const iconSize = size === "large" ? 42 : size === "small" ? 25 : 32;
  const fontSize = size === "large" ? 24 : size === "small" ? 16 : 20;

  return (
    <View accessibilityLabel="NOD" style={[styles.container, size === "large" && styles.large]}>
      <Svg fill="none" height={iconSize} stroke="#EE7C2B" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={iconSize}>
        <Circle cx="11" cy="4" r="2" />
        <Circle cx="18" cy="8" r="2" />
        <Circle cx="20" cy="16" r="2" />
        <Path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
      </Svg>
      {!compact ? (
        <Text style={[styles.wordmark, { fontSize }]}>N<Text style={styles.primary}>O</Text>D</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  large: {
    marginBottom: 12
  },
  wordmark: {
    color: "#1D2330",
    fontWeight: "900",
    letterSpacing: -0.5
  },
  primary: {
    color: "#EE7C2B"
  }
});
