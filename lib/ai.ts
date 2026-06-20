import { TradeType, LineItem } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

type AnthropicTextContent = {
  type: 'text';
  text: string;
};

type AnthropicMessagesResponse = {
  content: AnthropicTextContent[];
};

export interface QuoteGenerationResult {
  jobDescription: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  estimatedHours: number;
}

export async function generateQuoteFromVoice(
  transcript: string,
  trade: TradeType,
  hourlyRate: number
): Promise<QuoteGenerationResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildFallbackQuote(transcript, hourlyRate);
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
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Anthropic request failed with ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as AnthropicMessagesResponse;
  const text = data.content.find(part => part.type === 'text')?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  return JSON.parse(jsonMatch[0]) as QuoteGenerationResult;
}

function buildFallbackQuote(transcript: string, hourlyRate: number): QuoteGenerationResult {
  const estimatedHours = 2;
  const laborTotal = Math.round(hourlyRate * estimatedHours);
  const materialsTotal = 75;
  const subtotal = laborTotal + materialsTotal;
  const tax = Math.round(subtotal * 0.09 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    jobDescription: transcript.trim().slice(0, 180) || 'Service request',
    estimatedHours,
    lineItems: [
      { id: '1', description: 'Labor estimate', quantity: estimatedHours, unitPrice: hourlyRate, total: laborTotal },
      { id: '2', description: 'Materials and supplies allowance', quantity: 1, unitPrice: materialsTotal, total: materialsTotal },
    ],
    subtotal,
    tax,
    total,
    notes: 'Draft estimate generated from the job description. Review pricing, materials, and scope before sending.',
  };
}
