const COMMON_DOMAIN_FIXES: Record<string, string> = {
  'gmail.comc': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cmo': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.co.ukc': 'gmail.co.uk',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'googlemail.comc': 'googlemail.com',
  'yahoo.comc': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'outlook.comc': 'outlook.com',
  'outlook.con': 'outlook.com',
  'hotmail.comc': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'icloud.comc': 'icloud.com',
  'icloud.con': 'icloud.com',
};

const COMMON_TLD_FIXES: Record<string, string> = {
  '.comc': '.com',
  '.comm': '.com',
  '.cmo': '.com',
  '.con': '.com',
  '.coom': '.com',
  '.netc': '.net',
  '.orgc': '.org',
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEmailValidationMessage(email: string) {
  const normalized = normalizeEmail(email);

  if (!normalized) return 'Enter your email address.';
  if (/\s/.test(normalized)) return 'Email addresses cannot contain spaces.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Enter a valid email address.';
  }

  const [, domain = ''] = normalized.split('@');
  const domainSuggestion = COMMON_DOMAIN_FIXES[domain];
  if (domainSuggestion) {
    return `Did you mean ${normalized.replace(domain, domainSuggestion)}?`;
  }

  const tldTypo = Object.keys(COMMON_TLD_FIXES).find(suffix => domain.endsWith(suffix));
  if (tldTypo) {
    return `Did you mean ${normalized.slice(0, -tldTypo.length)}${COMMON_TLD_FIXES[tldTypo]}?`;
  }

  return '';
}
