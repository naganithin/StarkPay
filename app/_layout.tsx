import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import ConnectScreen from "./ConnectScreen";
import HomeScreen from "./homeScreen";
import PayScreen from "./PayScreen";
import { ChipiProvider } from "@chipi-stack/chipi-expo";
// import { ClerkProvider } from "@clerk/clerk-expo";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ClerkProvider } from '@clerk/clerk-react'


const CHIPI_API_KEY = "pk_dev_abcb14b0e896cee77f3a33e2ed9e71ce";
const CLERK_PUBLISHABLE_KEY = "pk_test_c3BsZW5kaWQtcmhpbm8tOTYuY2xlcmsuYWNjb3VudHMuZGV2JA";
console.log("CHIPI_API_KEY",CHIPI_API_KEY);


if (!CHIPI_API_KEY) throw new Error("EXPO_PUBLIC_CHIPI_API_KEY is not set");
if (!CLERK_PUBLISHABLE_KEY) throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");

const Stack = createStackNavigator();

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} >
      <ChipiProvider
        config={{
          apiPublicKey: CHIPI_API_KEY!, 
        }}
      >
          <Stack.Navigator initialRouteName="Entry">
            <Stack.Screen
              name="Entry"
              component={ConnectScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "BitStark Home" }}
            />
        <Stack.Screen name="PayScreen" component={PayScreen} />
          </Stack.Navigator>
      </ChipiProvider>
    </ClerkProvider>
  );
}