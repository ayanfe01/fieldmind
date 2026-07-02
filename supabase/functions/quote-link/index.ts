// Public quote page: GET renders a mobile-friendly HTML quote the client can
// accept with an e-signature — no app install, no account. Uses the service
// role because clients are anonymous; access is gated by the unguessable
// share_token. Deploy with verify_jwt disabled (see config.toml).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

type QuoteRow = {
  id: string;
  owner_id: string;
  client_id: string;
  job_description: string;
  line_items: { description: string; quantity: number; unitPrice: number; total?: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  valid_until: string;
  payment_terms: string | null;
  deposit_percent: number | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  signed_name: string | null;
  created_at: string;
};

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  if (!token) return htmlResponse(errorPage('This quote link is invalid.'), 404);

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('share_token', token)
    .maybeSingle<QuoteRow>();
  if (error || !quote) {
    return htmlResponse(errorPage('Quote not found. It may have been removed — please contact your service pro.'), 404);
  }

  const [{ data: owner }, { data: client }] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, business_name, trade, phone, email')
      .eq('id', quote.owner_id)
      .maybeSingle(),
    supabase
      .from('clients')
      .select('name')
      .eq('id', quote.client_id)
      .maybeSingle(),
  ]);

  if (request.method === 'POST') {
    const form = await request.formData();
    const action = String(form.get('action') || '');
    if (action === 'accept') {
      const signedName = String(form.get('signed_name') || '').trim().slice(0, 120);
      if (signedName && quote.status !== 'accepted' && quote.status !== 'declined') {
        await supabase.from('quotes').update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          signed_name: signedName,
        }).eq('id', quote.id);
      }
    } else if (action === 'decline') {
      if (quote.status !== 'accepted' && quote.status !== 'declined') {
        await supabase.from('quotes').update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        }).eq('id', quote.id);
      }
    }
    // Redirect back to GET so refreshing doesn't resubmit the form
    return new Response(null, { status: 303, headers: { Location: `${url.pathname}?token=${token}` } });
  }

  if (!quote.viewed_at && quote.status === 'sent') {
    await supabase.from('quotes').update({ viewed_at: new Date().toISOString() }).eq('id', quote.id);
  }

  return htmlResponse(quotePage(quote, owner || {}, client?.name || '', token, url.pathname));
});

const money = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function depositInfo(quote: QuoteRow): { percent: number; amount: number } | null {
  let percent: number | null = null;
  if (quote.payment_terms === 'custom') percent = quote.deposit_percent ?? 30;
  else if (quote.payment_terms === 'split_50_50') percent = 50;
  else if (quote.payment_terms === 'full_upfront') percent = 100;
  else if (quote.payment_terms === 'full_after') percent = 0;
  else if (quote.deposit_percent != null) percent = quote.deposit_percent;
  if (!percent) return null;
  return { percent, amount: Math.round(quote.total * percent) / 100 };
}

function htmlResponse(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// FieldMind brand: teal #25B7A0 / #168874 on dark navy #0B1016 (lib/constants.ts)
const PAGE_STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background: #eef1f4; color: #17202b; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 660px; margin: 0 auto; padding: 0 16px 72px; }
  .masthead { background: #0B1016; margin: 0 -16px; padding: 26px 24px 58px; }
  .masthead-inner { max-width: 628px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
  .biz-logo { width: 50px; height: 50px; border-radius: 13px; background: linear-gradient(135deg, #25B7A0, #168874); color: #fff; display: grid; place-items: center; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; flex-shrink: 0; }
  .biz h2 { margin: 0; font-size: 19px; color: #F5F7FA; letter-spacing: -0.2px; }
  .biz p { margin: 3px 0 0; font-size: 13px; color: #94a1b0; }
  .card { background: #fff; border: 1px solid #e3e6eb; border-radius: 16px; padding: 30px 28px; box-shadow: 0 4px 18px rgba(11, 16, 22, 0.08); margin-top: -34px; }
  .eyebrow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
  .eyebrow-label { font-size: 12px; font-weight: 800; letter-spacing: 2.2px; color: #168874; }
  .eyebrow-ref { font-size: 12px; color: #8a93a1; font-variant-numeric: tabular-nums; }
  h1 { font-size: 22px; margin: 0 0 6px; letter-spacing: -0.35px; line-height: 1.3; }
  .meta { color: #5b6472; font-size: 13.5px; margin: 0 0 22px; }
  .item { display: flex; justify-content: space-between; gap: 14px; padding: 13px 0; border-bottom: 1px solid #edeff2; font-size: 14.5px; }
  .item:first-of-type { border-top: 1px solid #e3e6eb; }
  .item-qty { color: #8a93a1; font-size: 12.5px; margin-top: 3px; }
  .totals { margin-top: 16px; display: grid; gap: 8px; }
  .trow { display: flex; justify-content: space-between; font-size: 14px; color: #5b6472; }
  .trow.grand { font-size: 19px; font-weight: 800; color: #17202b; border-top: 2px solid #17202b; padding-top: 11px; margin-top: 4px; }
  .trow.deposit { color: #168874; font-weight: 700; }
  .notes { margin-top: 22px; font-size: 14px; color: #5b6472; line-height: 1.6; white-space: pre-wrap; background: #f7f9fa; border-radius: 10px; padding: 14px 16px; }
  .banner { border-radius: 12px; padding: 15px 18px; font-weight: 600; font-size: 14px; line-height: 1.5; margin: 18px 0 0; }
  .banner.ok { background: #e6f6f2; border: 1px solid #9adcce; color: #0e6b5c; }
  .banner.no { background: #f2f4f7; border: 1px solid #dfe3e8; color: #5b6472; }
  .accept { position: sticky; bottom: 12px; margin-top: 20px; background: #fff; border: 1px solid #e3e6eb; border-radius: 16px; padding: 18px 20px; box-shadow: 0 12px 30px rgba(11, 16, 22, 0.16); }
  label { display: block; font-size: 13px; font-weight: 600; color: #5b6472; margin-bottom: 7px; }
  input { width: 100%; padding: 12px 14px; border: 1px solid #d6dae1; border-radius: 10px; font-size: 16px; margin-bottom: 12px; }
  input:focus { outline: none; border-color: #25B7A0; box-shadow: 0 0 0 3px rgba(37, 183, 160, 0.18); }
  button { width: 100%; border: none; border-radius: 11px; padding: 14px; font-size: 15.5px; font-weight: 700; cursor: pointer; }
  .btn-accept { background: #168874; color: #fff; }
  .btn-accept:hover { background: #0e6b5c; }
  .btn-decline { background: none; color: #8a93a1; font-size: 13px; font-weight: 500; margin-top: 6px; }
  .fine { font-size: 12px; color: #8a93a1; text-align: center; margin: 10px 0 0; line-height: 1.5; }
  .footer { text-align: center; font-size: 12px; color: #8a93a1; margin-top: 28px; }
  .footer strong { color: #168874; }
  @media print {
    body { background: #fff; }
    .masthead { background: #fff; padding-bottom: 10px; }
    .biz h2 { color: #17202b; } .biz p { color: #5b6472; }
    .card { box-shadow: none; border: none; margin-top: 0; padding: 10px 0; }
    .accept, .footer { display: none; }
  }
`;

function errorPage(message: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quote</title><style>${PAGE_STYLE}</style></head>
  <body><div class="wrap"><div class="card" style="text-align:center;margin-top:28px"><h1>Hmm.</h1><p class="meta">${escapeHtml(message)}</p></div></div></body></html>`;
}

function quotePage(quote: QuoteRow, owner: Record<string, string | null>, clientName: string, token: string, path: string) {
  const bizName = owner.business_name || owner.name || 'Your service pro';
  const initials = bizName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const trade = owner.trade ? owner.trade.charAt(0).toUpperCase() + owner.trade.slice(1).replace(/_/g, ' ') : '';
  const contact = [trade, owner.phone, owner.email].filter(Boolean).join('  ·  ');
  const deposit = depositInfo(quote);
  const isAccepted = quote.status === 'accepted';
  const isDeclined = quote.status === 'declined';
  const quoteRef = `Quote #${quote.id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`;
  const validUntil = new Date(quote.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const items = (quote.line_items || []).map(it => `
    <div class="item">
      <div>
        <div>${escapeHtml(it.description || '')}</div>
        <div class="item-qty">${Number(it.quantity) || 1} × ${money(it.unitPrice)}</div>
      </div>
      <strong>${money((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))}</strong>
    </div>`).join('');

  const banner = isAccepted
    ? `<div class="banner ok">✅ Quote accepted${quote.signed_name ? ` — signed by ${escapeHtml(quote.signed_name)}` : ''}. ${escapeHtml(bizName)} will contact you to schedule the work${deposit ? ` and collect the ${money(deposit.amount)} deposit` : ''}.</div>`
    : isDeclined
      ? `<div class="banner no">This quote was declined. Contact ${escapeHtml(bizName)} if you'd like a revised quote.</div>`
      : '';

  const acceptForm = (!isAccepted && !isDeclined) ? `
    <form class="accept" method="post" action="${path}?token=${token}">
      <label for="signed_name">Type your full name to accept this quote</label>
      <input id="signed_name" name="signed_name" required placeholder="Your full name" autocomplete="name">
      <button class="btn-accept" type="submit" name="action" value="accept">Accept quote · ${money(quote.total)}</button>
      <p class="fine">Typing your name acts as your electronic signature and accepts the scope and price above.</p>
      <button class="btn-decline" type="submit" name="action" value="decline" formnovalidate>Decline this quote</button>
    </form>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0B1016">
  <title>Quote from ${escapeHtml(bizName)}</title><style>${PAGE_STYLE}</style></head>
  <body>
  <div class="masthead"><div class="masthead-inner biz">
    <div class="biz-logo">${escapeHtml(initials)}</div>
    <div><h2>${escapeHtml(bizName)}</h2><p>${escapeHtml(contact)}</p></div>
  </div></div>
  <div class="wrap">
    <div class="card">
      <div class="eyebrow"><span class="eyebrow-label">QUOTE</span><span class="eyebrow-ref">${escapeHtml(quoteRef)}</span></div>
      <h1>${escapeHtml(quote.job_description)}</h1>
      <p class="meta">${clientName ? `Prepared for ${escapeHtml(clientName)} · ` : ''}Valid until ${validUntil}</p>
      ${items}
      <div class="totals">
        <div class="trow"><span>Subtotal</span><span>${money(quote.subtotal)}</span></div>
        ${Number(quote.tax) > 0 ? `<div class="trow"><span>Tax</span><span>${money(quote.tax)}</span></div>` : ''}
        <div class="trow grand"><span>Total</span><span>${money(quote.total)}</span></div>
        ${deposit ? `<div class="trow deposit"><span>Deposit to book (${deposit.percent}%)</span><span>${money(deposit.amount)}</span></div>` : ''}
      </div>
      ${quote.notes ? `<div class="notes">${escapeHtml(quote.notes)}</div>` : ''}
    </div>
    ${banner}
    ${acceptForm}
    <p class="footer">Powered by <strong>FieldMind</strong> — quotes, jobs & payments for the trades</p>
  </div></body></html>`;
}
