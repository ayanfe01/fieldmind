import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { notifyIncomingMessage, prepareLocalNotifications } from '../lib/notifications';
import { useAppStore } from '../store/useAppStore';
import { ThemedAlertProvider } from '../components/ui/ThemedAlertProvider';

export default function RootLayout() {
  const initializeAuth = useAppStore(s => s.initializeAuth);
  const syncAuthUser = useAppStore(s => s.syncAuthUser);
  const refreshCloudData = useAppStore(s => s.refreshCloudData);
  const user = useAppStore(s => s.user);

  useEffect(() => {
    void initializeAuth();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthUser(session?.user || null);
    });
    return () => data.subscription.unsubscribe();
  }, [initializeAuth, syncAuthUser]);

  useEffect(() => {
    void prepareLocalNotifications();
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as any);
      }
    });

    return () => responseSubscription.remove();
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`fieldmind-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          const row = payload.new as {
            conversation_id?: string;
            sender_id?: string;
            sender_name?: string;
            text?: string;
            media_uri?: string | null;
            action_type?: string | null;
          };
          void refreshCloudData();
          if (row.sender_id && row.sender_id !== user.id && row.conversation_id) {
            const body = row.text || (row.media_uri ? 'Sent a photo' : row.action_type ? 'Sent an update' : 'New message');
            void notifyIncomingMessage({
              title: row.sender_name || 'New FieldMind message',
              body,
              conversationId: row.conversation_id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          void refreshCloudData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshCloudData, user?.id]);

  return (
    <ThemedAlertProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </ThemedAlertProvider>
  );
}
