import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const prepareLocalNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#2EC4B6',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
};

export const notifyIncomingMessage = async (input: {
  title: string;
  body: string;
  conversationId: string;
}) => {
  const allowed = await prepareLocalNotifications();
  if (!allowed) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: {
        url: `/chat/${input.conversationId}`,
        conversationId: input.conversationId,
      },
    },
    trigger: null,
  });
};
