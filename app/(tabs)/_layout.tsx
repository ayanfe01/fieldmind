import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../lib/constants';
import { useAppStore } from '../../store/useAppStore';

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <MaterialCommunityIcons name={name} size={21} color={focused ? COLORS.primary : COLORS.textMuted} />
    </View>
  );
}

export default function TabLayout() {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const authInitialized = useAppStore(s => s.authInitialized);
  const role = useAppStore(s => s.user?.role);

  if (!authInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (role === 'admin') {
    return <Redirect href="/admin" />;
  }

  if (role === 'customer') {
    return <Redirect href="/customer-home" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="view-dashboard-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused }) => <TabIcon name="briefcase-search-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: 'Quotes',
          tabBarIcon: ({ focused }) => <TabIcon name="file-document-edit-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon name="message-text-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused }) => <TabIcon name="receipt-text-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar-month-outline" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 82,
    paddingBottom: 18,
    paddingTop: 9,
  },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  tabIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabIconActive: { backgroundColor: COLORS.primary + '16' },
});
