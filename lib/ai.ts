import { supabase } from './supabase';
import { TradeType, LineItem } from './types';

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
  const { data, error } = await supabase.functions.invoke('generate-quote', {
    body: { transcript, trade, hourlyRate },
  });

  if (error) {
    return buildFallbackQuote(transcript, hourlyRate);
  }

  if (!data?.jobDescription || !Array.isArray(data.lineItems)) {
    return buildFallbackQuote(transcript, hourlyRate);
  }

  return data as QuoteGenerationResult;
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
