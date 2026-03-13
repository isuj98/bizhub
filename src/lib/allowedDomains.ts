export const ALLOWED_EMAIL_DOMAINS = ['gamemybiz.com', 'johnnytsunami.com'] as const;

export function isEmailDomainAllowed(email: string): boolean {
  const normalized = String(email).trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at === -1) return false;
  const domain = normalized.slice(at + 1);
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export const DOMAIN_ERROR_MESSAGE =
  'Signup and login are only allowed for emails from: gamemybiz.com, johnnytsunami.com';
