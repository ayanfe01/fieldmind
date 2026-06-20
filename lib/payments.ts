// Payment utilities for FieldMind
// Handles Stripe payment intent creation via direct API calls

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_API = 'https://api.stripe.com/v1';

export type PaymentTerms = 'full_after' | 'split_50_50' | 'full_upfront' | 'custom';

export interface PaymentTermsConfig {
  type: PaymentTerms;
  label: string;
  description: string;
  depositPercent: number; // 0 = nothing upfront, 100 = full upfront
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

// Create a Stripe Payment Intent via fetch (works in React Native)
export async function createPaymentIntent(
  amountInCents: number,
  currency: string = 'usd',
  description: string,
  metadata: Record<string, string> = {}
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const params = new URLSearchParams();
  params.append('amount', String(amountInCents));
  params.append('currency', currency);
  params.append('description', description);
  params.append('payment_method_types[]', 'card');
  Object.entries(metadata).forEach(([k, v]) => {
    params.append(`metadata[${k}]`, v);
  });

  const response = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to create payment intent');
  }

  const data = await response.json();
  return {
    clientSecret: data.client_secret,
    paymentIntentId: data.id,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Test card numbers for sandbox testing
export const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Visa — Success' },
  { number: '4000 0000 0000 9995', label: 'Visa — Declined' },
  { number: '4000 0025 0000 3155', label: 'Visa — Requires Auth' },
];
