// SwapScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function SwapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Swap your tokens here 🚀</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e293b" },
  text: { color: "white", fontSize: 18 },
});
