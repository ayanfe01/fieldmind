export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function getPasswordIssues(password: string) {
  return PASSWORD_RULES.filter(rule => !rule.test(password)).map(rule => rule.label);
}

export function isStrongPassword(password: string) {
  return getPasswordIssues(password).length === 0;
}

export function passwordRequirementsMessage(password: string) {
  const issues = getPasswordIssues(password);
  if (!issues.length) return '';
  return `Password needs: ${issues.join(', ')}.`;
}
