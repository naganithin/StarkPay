import { useCreateWallet } from "@chipi-stack/chipi-expo";
// import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { useAuth,useSignIn } from "@clerk/clerk-react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { log } from "console";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// import { AddressPurpose, BitcoinNetworkType, request, RpcErrorCode } from "sats-connect";
import { request, AddressPurpose, BitcoinNetworkType, RpcErrorCode } from "sats-connect";


export default function ConnectScreen({ navigation }: any) {
  const {
    createWalletAsync,
    isLoading,
    error,
  } = useCreateWallet();
  const { isSignedIn, getToken } = useAuth();
  const { signIn, setActive } = useSignIn();
  const [pin, setPin] = useState("1234");



  const handleConnect = async () => {
    try {
      const response = await request("wallet_connect", {
        addresses: [AddressPurpose.Payment, AddressPurpose.Starknet, AddressPurpose.Ordinals, AddressPurpose.Spark],
        message: "Connect BitStark to your Xverse Wallet",
        network: BitcoinNetworkType.Testnet,
      });

      if (!isSignedIn) {
        console.log("Not signed in");
      }

      if (response.status === "success") {
        const btcAddress = response.result.addresses.find(
          (a) => a.purpose === AddressPurpose.Payment
        )?.address;

        if (!btcAddress) {
          Alert.alert("Error", "No valid BTC address found.");
          return;
        }

        await AsyncStorage.setItem("btcAddress", btcAddress);

        Alert.alert("Connected", `BTC Address: ${btcAddress}`);
        console.log(`BTC Address: ${btcAddress}`);

        const token = await getToken();

        console.log("token = ", token);

        if (!token) {
          Alert.alert("Error", "Authentication token is missing. Please sign in again.");
          return;
        }

        // Create StarkNet wallet
        const wallet = await createWalletAsync({
          params: {
            encryptKey: pin,
            externalUserId: btcAddress,
          },
          bearerToken: token,
        });
        console.log("Wallet", wallet.walletPublicKey);
        console.log("JSON wallet = ",JSON.stringify(wallet));

        // Save individual wallet fields
        await AsyncStorage.setItem("wallet", wallet.walletPublicKey);
        await AsyncStorage.setItem("wallet_txHash", wallet.txHash);
        await AsyncStorage.setItem("wallet_encryptedPrivateKey", wallet.wallet.encryptedPrivateKey);

        // Save the full generated wallet
        await AsyncStorage.setItem("generatedWallet", JSON.stringify(wallet));

        navigation.replace("Home");
      } else {
        if (response.error.code === RpcErrorCode.USER_REJECTION) {
          Alert.alert("Cancelled", "User rejected the connection");
        } else {
          Alert.alert("Error", response.error.message);
        }
      }
    } catch (err: any) {
      console.error("Error details:", err);
      Alert.alert("Connection Error", err.message || String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/images/icon.png")} style={styles.logo} />
      <Text style={styles.title}>BitStark</Text>

      <TouchableOpacity
        style={[styles.button, isLoading && { backgroundColor: "#64748b" }]}
        onPress={handleConnect}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Connect Wallet</Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={{ color: "red", marginTop: 10 }}>Error: {error.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  logo: { width: 100, height: 100, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "white", marginBottom: 40 },
  button: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
});