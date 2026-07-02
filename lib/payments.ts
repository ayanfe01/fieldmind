import { supabase } from './supabase';

export type PaymentTerms = 'full_after' | 'split_50_50' | 'full_upfront' | 'custom';

export interface PaymentTermsConfig {
  type: PaymentTerms;
  label: string;
  description: string;
  depositPercent: number;
}

export const PAYMENT_TERMS: PaymentTermsConfig[] = [
  {
    type: 'split_50_50',
    label: '50% Deposit + 50% on Completion',
    description: 'Client pays half upfront, half when job is done',
    depositPercent: 50,
  },
  {
    type: 'full_after',
    label: 'Pay in Full After Completion',
    description: 'Client pays the full amount when job is done',
    depositPercent: 0,
  },
  {
    type: 'full_upfront',
    label: '100% Upfront',
    description: 'Client pays the full amount before work begins',
    depositPercent: 100,
  },
  {
    type: 'custom',
    label: 'Custom Split',
    description: 'Set your own deposit percentage',
    depositPercent: 30,
  },
];

export interface PaymentSplit {
  depositAmount: number;
  finalAmount: number;
  totalAmount: number;
  depositPercent: number;
}

export function calculatePaymentSplit(
  totalAmount: number,
  terms: PaymentTermsConfig,
  customPercent?: number
): PaymentSplit {
  const percent = terms.type === 'custom' ? (customPercent || 30) : terms.depositPercent;
  const depositAmount = Math.round((totalAmount * percent) / 100 * 100) / 100;
  const finalAmount = Math.round((totalAmount - depositAmount) * 100) / 100;
  return {
    depositAmount,
    finalAmount,
    totalAmount,
    depositPercent: percent,
  };
}

// Detect the device's currency from its locale region.
// Falls back to USD if detection is unavailable.
const REGION_TO_CURRENCY: Record<string, string> = {
  CA: 'CAD', US: 'USD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', PT: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR',
  GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
  JP: 'JPY', CN: 'CNY', IN: 'INR', SG: 'SGD', HK: 'HKD',
  KR: 'KRW', TH: 'THB', MY: 'MYR', PH: 'PHP', ID: 'IDR',
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  ZA: 'ZAR', NG: 'NGN', GH: 'GHS', KE: 'KES', TZ: 'TZS',
  EG: 'EGP', MA: 'MAD', AE: 'AED', SA: 'SAR', TR: 'TRY',
  IL: 'ILS', RU: 'RUB', UA: 'UAH',
};

export function getDeviceCurrency(): string {
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale || '';
    const parts = locale.split('-');
    // Locale can be 'en-CA', 'fr-CA', 'zh-Hant-HK' etc.
    const region = parts[parts.length - 1].toUpperCase();
    return REGION_TO_CURRENCY[region] || 'USD';
  } catch {
    return 'USD';
  }
}

export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  description: string,
  metadata: Record<string, string> = {}
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { amountInCents, currency: currency.toLowerCase(), description, metadata },
  });

  if (error) {
    throw new Error(error.message || 'Failed to create payment intent');
  }

  if (!data?.clientSecret || !data?.paymentIntentId) {
    throw new Error('Payment service returned an invalid response');
  }

  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
  };
}

export function formatCurrency(amount: number, currency?: string): string {
  const curr = currency || getDeviceCurrency();
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Visa - Success' },
  { number: '4000 0000 0000 9995', label: 'Visa - Declined' },
  { number: '4000 0025 0000 3155', label: 'Visa - Requires Auth' },
];
