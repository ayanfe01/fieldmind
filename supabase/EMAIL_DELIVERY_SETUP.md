# FieldMind Auth Email Delivery

Supabase's default email sender is only suitable for testing. It can be rate-limited heavily and may refuse to send to addresses that are not members of the Supabase project team. For FieldMind, configure custom SMTP before relying on signup confirmation or password reset emails.

## Recommended Setup

Use a transactional email provider such as Resend, Postmark, SendGrid, Brevo, or AWS SES. Resend is the simplest starting point.

1. Create or verify a sending domain with the provider.
2. Configure SPF, DKIM, and DMARC records in DNS.
3. In Supabase, open `Authentication > Emails > SMTP Settings`.
4. Enable custom SMTP.
5. Use settings like:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: your provider API key
   - Sender name: `FieldMind`
   - Sender email: `no-reply@your-domain.com`
6. In `Authentication > URL Configuration`, keep these redirect URLs:
   - `fieldmind://auth/callback`
   - `fieldmind://auth/reset-password`
   - `exp://*/--/auth/callback`
   - `exp://*/--/auth/reset-password`
   - `https://vjvenitcediuyffshbzx.supabase.co/auth/v1/callback`
7. In `Authentication > Logs`, test a manual signup and confirm the message is accepted by the SMTP provider.

## Link vs Code

Keep confirmation links for now. A code-based email still uses the same email delivery path, so it will not fix missing emails by itself. Once SMTP delivery is reliable, a code flow can be added later if product testing shows users prefer it.
