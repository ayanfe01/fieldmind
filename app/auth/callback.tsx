import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { COLORS, SPACING } from '../../lib/constants';
import { defaultRouteForRole } from '../../lib/routes';
import { useAppStore } from '../../store/useAppStore';

export default function AuthCallbackScreen() {
  const authInitialized = useAppStore(s => s.authInitialized);
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const role = useAppStore(s => s.user?.role);

  if (authInitialized && isAuthenticated) {
    return <Redirect href={defaultRouteForRole(role)} />;
  }

  if (authInitialized && !isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.text}>Finishing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
  },
  text: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
});
