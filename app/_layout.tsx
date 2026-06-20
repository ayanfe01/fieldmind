import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { COLORS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function RootLayout() {
  const initializeAuth = useAppStore(s => s.initializeAuth);
  const syncAuthUser = useAppStore(s => s.syncAuthUser);

  useEffect(() => {
    void initializeAuth();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthUser(session?.user || null);
    });
    return () => data.subscription.unsubscribe();
  }, [initializeAuth, syncAuthUser]);

  return (
    <StripeProvider
      publishableKey={STRIPE_KEY}
      merchantIdentifier="merchant.com.fieldmind.app"
    >
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </StripeProvider>
  );
}
