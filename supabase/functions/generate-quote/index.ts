import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

type AnthropicTextContent = {
  type: 'text';
  text: string;
};

type AnthropicMessagesResponse = {
  content: AnthropicTextContent[];
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anthropicApiKey) {
    return jsonResponse({ error: 'AI quote service is not configured' }, 500);
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
    const transcript = String(body.transcript || '').trim();
    const trade = String(body.trade || 'general');
    const hourlyRate = Number(body.hourlyRate || 85);

    if (transcript.length < 8) {
      return jsonResponse({ error: 'Job description is too short' }, 400);
    }

    const prompt = `You are an expert ${trade} service quote assistant. Based on this request description, generate a professional quote.

Request Description: "${transcript}"
Reference Rate: $${hourlyRate}/hr

Generate a detailed quote with line items. Return ONLY valid JSON in this exact format:
{
  "jobDescription": "clean professional description of the job",
  "lineItems": [
    { "id": "1", "description": "item description", "quantity": 1, "unitPrice": 150, "total": 150 }
  ],
  "subtotal": 450,
  "tax": 40.50,
  "total": 490.50,
  "notes": "professional notes or warranty info",
  "estimatedHours": 3
}

Make the pricing realistic for a ${trade} in the US. Include labor, supplies, materials, travel, or permits only when relevant. Tax rate is 9%.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      return jsonResponse({ error: message || 'AI quote generation failed' }, response.status);
    }

    const data = (await response.json()) as AnthropicMessagesResponse;
    const text = data.content.find((part) => part.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return jsonResponse({ error: 'AI response could not be parsed' }, 502);
    }

    return jsonResponse(JSON.parse(jsonMatch[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI quote service failed';
    return jsonResponse({ error: message }, 500);
  }
});
