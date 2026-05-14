import { Text } from "react-native";
import { Tabs } from "expo-router";
import { COLORS } from "../../src/lib/theme";

function Icon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecond,
        tabBarStyle: {
          backgroundColor: "#d6f0fb",
          borderTopColor:  "#9fd4ee",
          paddingBottom:   4,
          height:          60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: ({ focused }) => <Icon emoji={focused ? "🏠" : "🏠"} /> }} />
      <Tabs.Screen name="pools"     options={{ title: "Pools",     tabBarIcon: ({ focused }) => <Icon emoji={focused ? "🏊" : "🏊"} /> }} />
      <Tabs.Screen name="routes"    options={{ title: "Routes",    tabBarIcon: ({ focused }) => <Icon emoji={focused ? "🗺️" : "🗺️"} /> }} />
      <Tabs.Screen name="reports"   options={{ title: "Reports",   tabBarIcon: ({ focused }) => <Icon emoji={focused ? "📋" : "📋"} /> }} />
      <Tabs.Screen name="settings"  options={{ title: "Settings",  tabBarIcon: ({ focused }) => <Icon emoji={focused ? "⚙️" : "⚙️"} /> }} />
    </Tabs>
  );
}
