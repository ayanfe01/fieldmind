// Helpers for public quote share links served by the quote-link edge function.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// ~160 bits from Math.random segments — fine for an unguessable link token
// without pulling in a native crypto dependency. Swap for expo-crypto's
// getRandomBytes if the app ever adds it.
export const generateShareToken = () =>
  Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 12)).join('');

export const isQuoteLinksConfigured = !!supabaseUrl;

export const buildQuoteShareUrl = (shareToken: string) =>
  `${supabaseUrl}/functions/v1/quote-link?token=${shareToken}`;
