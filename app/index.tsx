import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../lib/constants';
import { defaultRouteForRole } from '../lib/routes';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const authInitialized = useAppStore(s => s.authInitialized);
  const role = useAppStore(s => s.user?.role);

  if (!authInitialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? defaultRouteForRole(role) : '/(auth)/welcome'} />;
}
