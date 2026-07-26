import { describe, expect, it } from 'vitest';
import {
  NonCanonicalJsonError,
  canonicalJson,
  parseCanonicalJson,
} from './canonicalJson';

/**
 * Driven by the committed vectors in
 * `packages/writer-sync/docs/pairing-test-vectors.md`. Those values were computed
 * from the specification before any implementation existed, so a disagreement
 * here means the code is wrong, not the vector.
 */

const ESC = String.fromCharCode(0x01);

describe('canonicalJson', () => {
  it('sorts keys by code point, so upper case precedes lower (vector 1.1)', () => {
    expect(canonicalJson({ v: 1, kind: 'offer', a: 'z', B: 'y' })).toBe(
      '{"B":"y","a":"z","kind":"offer","v":1}',
    );
  });

  it('emits no insignificant whitespace and preserves array order (vector 1.2)', () => {
    expect(canonicalJson({ one: 1, two: [1, 2, 3] })).toBe('{"one":1,"two":[1,2,3]}');
  });

  it('escapes minimally: short forms, lower-case \\u for controls, no \\/ (vector 1.3)', () => {
    expect(canonicalJson({ s: `a"b\\c\td${ESC}e/f` })).toBe(
      '{"s":"a\\"b\\\\c\\td\\u0001e/f"}',
    );
  });

  it('renders integers without sign, leading zero or exponent (vector 1.4)', () => {
    expect(canonicalJson({ zero: 0, big: Number.MAX_SAFE_INTEGER })).toBe(
      '{"big":9007199254740991,"zero":0}',
    );
  });

  it('canonicalises nested objects and embedded JWKs at every depth (vector 1.5)', () => {
    expect(
      canonicalJson({ outer: { inner: { kty: 'EC', crv: 'P-256', y: 'AQAC', x: 'AQAB' } } }),
    ).toBe('{"outer":{"inner":{"crv":"P-256","kty":"EC","x":"AQAB","y":"AQAC"}}}');
  });

  it('passes non-BMP characters through as UTF-8 and never sorts arrays (vector 1.6)', () => {
    expect(canonicalJson({ emoji: '\u{1F5DD}', order: ['b', 'a'] })).toBe(
      '{"emoji":"\u{1F5DD}","order":["b","a"]}',
    );
  });

  it('treats two key orderings as the same value', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it('treats two array orderings as different values', () => {
    expect(canonicalJson({ order: ['a', 'b'] })).not.toBe(canonicalJson({ order: ['b', 'a'] }));
  });

  it('rejects a non-integer number rather than rounding it', () => {
    expect(() => canonicalJson({ n: 1.5 })).toThrow(NonCanonicalJsonError);
  });

  it('rejects a negative number — the protocol carries none', () => {
    expect(() => canonicalJson({ n: -1 })).toThrow(NonCanonicalJsonError);
  });

  it('rejects a number beyond the safe integer range', () => {
    expect(() => canonicalJson({ n: Number.MAX_SAFE_INTEGER + 2 })).toThrow(
      NonCanonicalJsonError,
    );
  });

  it('rejects undefined and functions rather than dropping them silently', () => {
    expect(() => canonicalJson({ a: undefined })).toThrow(NonCanonicalJsonError);
    expect(() => canonicalJson({ a: () => 1 })).toThrow(NonCanonicalJsonError);
  });
});

describe('parseCanonicalJson', () => {
  it('accepts bytes that re-encode to exactly what was received', () => {
    expect(parseCanonicalJson('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
  });

  const rejections: readonly (readonly [string, string])[] = [
    ['whitespace after a comma', '{"a":1, "b":2}'],
    ['keys not in code-point order', '{"b":2,"a":1}'],
    ['an unnecessarily escaped solidus', '{"s":"a\\/b"}'],
    ['a character written as an escape', '{"s":"\\u0041"}'],
    ['a non-integer rendering', '{"n":1.0}'],
    ['a leading zero', '{"n":01}'],
    ['a duplicate key', '{"a":1,"a":2}'],
  ];

  for (const [reason, received] of rejections) {
    it(`rejects ${reason}`, () => {
      expect(() => parseCanonicalJson(received)).toThrow(NonCanonicalJsonError);
    });
  }

  it('rejects text that is not JSON at all', () => {
    expect(() => parseCanonicalJson('{"n":+1}')).toThrow(NonCanonicalJsonError);
  });

  it('round-trips every canonical encoding it produces', () => {
    const value = { a: [1, 2], b: { c: 'x' }, d: 0 };
    expect(parseCanonicalJson(canonicalJson(value))).toEqual(value);
  });
});
