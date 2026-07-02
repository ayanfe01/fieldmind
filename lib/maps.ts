import { Linking, Platform } from 'react-native';

const openFirstAvailableUrl = async (urls: string[]) => {
  let lastError: unknown;

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No maps app could open this address.');
};

export const openDirections = async (address: string) => {
  const destination = address.trim();
  if (!destination) {
    throw new Error('No address is available for this job.');
  }

  const encoded = encodeURIComponent(destination);

  if (Platform.OS === 'ios') {
    return openFirstAvailableUrl([
      `http://maps.apple.com/?daddr=${encoded}&q=${encoded}`,
      `comgooglemaps://?daddr=${encoded}&directionsmode=driving`,
      `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    ]);
  }

  if (Platform.OS === 'android') {
    return openFirstAvailableUrl([
      `google.navigation:q=${encoded}`,
      `geo:0,0?q=${encoded}`,
      `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    ]);
  }

  return openFirstAvailableUrl([
    `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
  ]);
};
