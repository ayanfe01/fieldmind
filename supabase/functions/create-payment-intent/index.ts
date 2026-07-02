import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_API = 'https://api.stripe.com/v1/payment_intents';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!stripeSecretKey) {
    return jsonResponse({ error: 'Stripe is not configured' }, 500);
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase is not configured' }, 500);
  }

  try {
    const authHeader = request.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    const body = await request.json();
    const amountInCents = Number(body.amountInCents);
    const currency = String(body.currency || 'usd').toLowerCase();
    const description = String(body.description || 'FieldMind payment');
    const metadata = typeof body.metadata === 'object' && body.metadata ? body.metadata : {};

    if (!Number.isInteger(amountInCents) || amountInCents < 50) {
      return jsonResponse({ error: 'Invalid payment amount' }, 400);
    }

    const params = new URLSearchParams();
    params.append('amount', String(amountInCents));
    params.append('currency', currency);
    params.append('description', description);
    params.append('automatic_payment_methods[enabled]', 'true');

    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params.append(`metadata[${key}]`, value);
      }
    });
    params.append('metadata[user_id]', userData.user.id);

    const stripeResponse = await fetch(STRIPE_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const stripeData = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return jsonResponse({ error: stripeData.error?.message || 'Stripe payment intent failed' }, stripeResponse.status);
    }

    return jsonResponse({
      clientSecret: stripeData.client_secret,
      paymentIntentId: stripeData.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment service failed';
    return jsonResponse({ error: message }, 500);
  }
});
