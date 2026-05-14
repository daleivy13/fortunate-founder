import { Redirect } from "expo-router";
import { useStore } from "../src/lib/store";
import { View, ActivityIndicator } from "react-native";
import { COLORS } from "../src/lib/theme";

export default function Index() {
  const { user, company, isInitializing } = useStore();

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (user === null) return <Redirect href="/(auth)/login" />;
  if (!company)      return <Redirect href="/onboarding" />;
  return              <Redirect href="/(tabs)/dashboard" />;
}
