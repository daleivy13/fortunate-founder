import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { onAuth, getIdToken } from "../src/lib/auth";
import { setAuthToken } from "../src/lib/api";
import { useStore } from "../src/lib/store";
import { api } from "../src/lib/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

function AuthListener() {
  const { setUser, setCompany, setIdToken, setInitializing, clear } = useStore();

  useEffect(() => {
    const unsub = onAuth(async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthToken(null);
        clear();
        setInitializing(false);
        return;
      }

      const token = await getIdToken();
      setAuthToken(token);
      setIdToken(token);

      setUser({
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL:    firebaseUser.photoURL,
      });

      try {
        const data = await api.get<{ company: any }>(`/api/companies?ownerId=${firebaseUser.uid}`);
        if (data.company) setCompany(data.company);
      } catch {}

      setInitializing(false);
    });
    return unsub;
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="chemistry"     options={{ presentation: "card" }} />
        <Stack.Screen name="invoices"      options={{ presentation: "card" }} />
        <Stack.Screen name="service-flow"  options={{ presentation: "card" }} />
        <Stack.Screen name="equipment"     options={{ presentation: "card" }} />
        <Stack.Screen name="compliance"    options={{ presentation: "card" }} />
        <Stack.Screen name="work-orders"   options={{ presentation: "card" }} />
        <Stack.Screen name="diagnostic"    options={{ presentation: "card" }} />
        <Stack.Screen name="voice"         options={{ presentation: "card" }} />
        <Stack.Screen name="evidence"      options={{ presentation: "card" }} />
        <Stack.Screen name="pool-detail"   options={{ presentation: "card" }} />
      </Stack>
    </QueryClientProvider>
  );
}
