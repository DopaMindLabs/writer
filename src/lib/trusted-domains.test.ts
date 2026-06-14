import { db } from '@/db/db';
import {
  addTrustedDomain,
  domainFromUrl,
  getDefaultTrustedDomains,
  getTrustedDomains,
  initializeTrustedDomains,
  isDomainAllowed,
  normalizeDomain,
  removeTrustedDomain,
} from './trusted-domains';
import { InvariantError } from '@/lib/invariant';

describe('getDefaultTrustedDomains', () => {
  it('returns the seed allow-list', () => {
    expect(getDefaultTrustedDomains()).toEqual([
      'arxiv.org',
      'github.com',
      'raw.githubusercontent.com',
      'openreview.net',
      'semanticscholar.org',
    ]);
  });

  it('returns a fresh array each call (no shared mutation)', () => {
    const a = getDefaultTrustedDomains();
    a.push('evil.com');
    expect(getDefaultTrustedDomains()).not.toContain('evil.com');
  });
});

describe('domainFromUrl', () => {
  it('extracts a lower-cased hostname', () => {
    expect(domainFromUrl('https://ARXIV.org/pdf/1.pdf')).toBe('arxiv.org');
  });

  it('returns null for an unparseable url', () => {
    expect(domainFromUrl('not a url')).toBeNull();
  });
});

describe('normalizeDomain', () => {
  it('lower-cases and trims a bare host', () => {
    expect(normalizeDomain('  ARXIV.org ')).toBe('arxiv.org');
  });

  it('extracts the host from a full url', () => {
    expect(normalizeDomain('https://arxiv.org/pdf/1.pdf')).toBe('arxiv.org');
  });

  it('strips a trailing path from a bare host', () => {
    expect(normalizeDomain('arxiv.org/pdf')).toBe('arxiv.org');
  });

  it('throws on an empty or dotless value', () => {
    expect(() => normalizeDomain('   ')).toThrow(InvariantError);
    expect(() => normalizeDomain('localhost')).toThrow(InvariantError);
  });
});

describe('initializeTrustedDomains', () => {
  it('seeds the defaults when the table is empty', async () => {
    await initializeTrustedDomains();
    expect(await getTrustedDomains()).toEqual(getDefaultTrustedDomains().sort());
  });

  it('does not reseed or overwrite when entries already exist', async () => {
    await addTrustedDomain('example.com');
    await initializeTrustedDomains();
    expect(await getTrustedDomains()).toEqual(['example.com']);
  });
});

describe('addTrustedDomain / removeTrustedDomain', () => {
  it('adds a normalised domain and is idempotent', async () => {
    await addTrustedDomain('https://Example.com/x');
    await addTrustedDomain('example.com');
    expect(await db.trustedDomains.count()).toBe(1);
    expect(await getTrustedDomains()).toEqual(['example.com']);
  });

  it('removes a domain regardless of input form', async () => {
    await addTrustedDomain('example.com');
    await removeTrustedDomain('https://example.com/');
    expect(await getTrustedDomains()).toEqual([]);
  });
});

describe('isDomainAllowed', () => {
  it('allows an exact trusted host', async () => {
    await addTrustedDomain('arxiv.org');
    expect(await isDomainAllowed('https://arxiv.org/pdf/1.pdf')).toBe(true);
  });

  it('allows a subdomain of a trusted host', async () => {
    await addTrustedDomain('example.com');
    expect(await isDomainAllowed('https://a.example.com/x.pdf')).toBe(true);
  });

  it('rejects an untrusted host', async () => {
    await addTrustedDomain('arxiv.org');
    expect(await isDomainAllowed('https://evil.com/x.pdf')).toBe(false);
  });

  it('rejects a host that merely contains a trusted name as a suffix string', async () => {
    await addTrustedDomain('example.com');
    expect(await isDomainAllowed('https://notexample.com/x.pdf')).toBe(false);
  });

  it('rejects an unparseable url', async () => {
    await addTrustedDomain('arxiv.org');
    expect(await isDomainAllowed('not a url')).toBe(false);
  });
});
