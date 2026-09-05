import { describe, expect, it } from 'vitest';
import { toBase64Url } from './base64url';
import { pairingTranscript, verificationCode } from './pairingTranscript';

/**
 * The expected values come from `docs/pairing-test-vectors.md` §3 and §4, which
 * were computed from the specification before this module existed.
 */

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

const VECTORS = [
  { name: 'empty payloads', offer: '', answer: '', transcript: 'Mu-NQiwBCcXotiIrnYd-0n9215eK-5_kZM0PoEB_VTU', code: '237966' },
  { name: 'minimal payloads', offer: '{"kind":"offer"}', answer: '{"kind":"answer"}', transcript: 'g5N3LTe13EKZOs7WBICM2amyDNZoQPlTkDODd6wcnYE', code: '473809' },
  { name: 'swapped halves', offer: '{"kind":"answer"}', answer: '{"kind":"offer"}', transcript: 'PARTDFlGE2OICpdMa21zAfolT9SJkw6BBrj8gW2_tc0', code: '027941' },
] as const;

describe('pairingTranscript', () => {
  for (const vector of VECTORS) {
    it(`matches the committed vector for ${vector.name}`, async () => {
      const digest = await pairingTranscript(bytes(vector.offer), bytes(vector.answer));
      expect(toBase64Url(digest)).toBe(vector.transcript);
    });
  }

  it('distinguishes the two halves — swapping them changes the digest', async () => {
    const [forward, backward] = await Promise.all([
      pairingTranscript(bytes('{"kind":"offer"}'), bytes('{"kind":"answer"}')),
      pairingTranscript(bytes('{"kind":"answer"}'), bytes('{"kind":"offer"}')),
    ]);
    expect(toBase64Url(forward)).not.toBe(toBase64Url(backward));
  });

  it('cannot be confused by moving bytes across the separator', async () => {
    // Without the domain separators, "ab" + "c" and "a" + "bc" would collide.
    const [left, right] = await Promise.all([
      pairingTranscript(bytes('ab'), bytes('c')),
      pairingTranscript(bytes('a'), bytes('bc')),
    ]);
    expect(toBase64Url(left)).not.toBe(toBase64Url(right));
  });
});

describe('verificationCode', () => {
  for (const vector of VECTORS) {
    it(`matches the committed vector for ${vector.name}`, async () => {
      const digest = await pairingTranscript(bytes(vector.offer), bytes(vector.answer));
      expect(await verificationCode(digest)).toBe(vector.code);
    });
  }

  it('always renders six digits, zero-padded', async () => {
    // The swapped-halves vector is the zero-padded case: 27941 -> "027941".
    const digest = await pairingTranscript(bytes('{"kind":"answer"}'), bytes('{"kind":"offer"}'));
    const code = await verificationCode(digest);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
    expect(code.startsWith('0')).toBe(true);
  });

  it('gives two devices with different transcripts different codes', async () => {
    const [a, b] = await Promise.all([
      pairingTranscript(bytes('offer-a'), bytes('answer-a')),
      pairingTranscript(bytes('offer-a'), bytes('answer-b')),
    ]);
    expect(await verificationCode(a)).not.toBe(await verificationCode(b));
  });
});
