import { invariant } from '@/lib/invariant';
import { db } from '@/db/db';

const DEFAULT_TRUSTED_DOMAINS = [
  'arxiv.org',
  'github.com',
  'raw.githubusercontent.com',
  'openreview.net',
  'semanticscholar.org',
] as const;

export const getDefaultTrustedDomains = (): string[] => [
  ...DEFAULT_TRUSTED_DOMAINS,
];

export const domainFromUrl = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const normalizeDomain = (input: string): string => {
  invariant(typeof input === 'string', 'normalizeDomain: input must be a string');
  const trimmed = input.trim().toLowerCase();
  invariant(trimmed.length > 0, 'normalizeDomain: domain required');
  const host = trimmed.includes('://')
    ? domainFromUrl(trimmed)
    : (trimmed.split('/')[0] ?? '');
  invariant(
    host !== null && host.length > 0 && host.includes('.'),
    'normalizeDomain: invalid domain',
  );
  return host;
};

export const getTrustedDomains = async (): Promise<string[]> => {
  const rows = await db.trustedDomains.orderBy('domain').toArray();
  return rows.map((row) => row.domain);
};

export const isDomainAllowed = async (url: string): Promise<boolean> => {
  const host = domainFromUrl(url);
  if (host === null) return false;
  const trusted = await getTrustedDomains();
  return trusted.some((d) => host === d || host.endsWith(`.${d}`));
};

export const addTrustedDomain = async (domain: string): Promise<void> => {
  const normalized = normalizeDomain(domain);
  await db.trustedDomains.put({ domain: normalized, addedAt: Date.now() });
};

export const removeTrustedDomain = async (domain: string): Promise<void> => {
  const normalized = normalizeDomain(domain);
  await db.trustedDomains.delete(normalized);
};

export const initializeTrustedDomains = async (): Promise<void> => {
  const count = await db.trustedDomains.count();
  if (count > 0) return;
  const now = Date.now();
  await db.trustedDomains.bulkPut(
    getDefaultTrustedDomains().map((domain) => ({ domain, addedAt: now })),
  );
};
