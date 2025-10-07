// PayScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
export default function PayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Send payments easily 💸</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e293b" },
  text: { color: "white", fontSize: 18 },
});
