import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WalletData {
  accountAddress: string;
  txHash: string;
}

export default function HomeScreen({ route, navigation }: any) {
  const [wallet, setWallet] = useState<WalletData | null>(
    route.params?.wallet || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const accountAddress = await AsyncStorage.getItem("wallet");
        const txHash = await AsyncStorage.getItem("wallet_txHash");

        if (accountAddress && txHash) {
          setWallet({ accountAddress, txHash });
        } else {
          setWallet(null);
        }
      } catch (err) {
        console.error("Failed to load wallet:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#22c55e" size="large" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No wallet found</Text>
        <Text style={styles.subText}>
          Please reconnect your wallet from the Connect screen.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your BitStark Wallet</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Account Address:</Text>
        <Text style={styles.value}>{wallet.accountAddress}</Text>

      </View>

      {/* --- New Buttons --- */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
          onPress={() => navigation.navigate("SwapScreen")}
        >
          <Text style={styles.buttonText}>Swap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#9444efff" }]}
          onPress={() => navigation.navigate("PayScreen")}
        >
          <Text style={styles.buttonText}>Pay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: "#f1f5f9",
    fontFamily: "monospace",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  text: { color: "white", fontSize: 18, fontWeight: "600" },
  subText: { color: "#94a3b8", fontSize: 14, marginTop: 8 },
  loadingText: { color: "white", marginTop: 10, fontSize: 16 },

  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 25,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
