import { describe, expect, it } from 'vitest';
import { parseSafeVectorDocument } from '../src/core/index';

const valid = {
  version: 1,
  width: 1200,
  height: 1600,
  paths: [
    { d: 'M 1 2 C 3 4 5 6 7 8 Z', fill: '#000000' },
    { d: 'M10.5 20.25 L30 40', fill: '#fff' },
  ],
};

describe('safe vector validation', () => {
  it('accepts the bounded path-only document', () => {
    expect(parseSafeVectorDocument(valid)).toEqual(valid);
  });

  it.each([
    ['wrong version', { ...valid, version: 2 }],
    ['non-finite width', { ...valid, width: Number.POSITIVE_INFINITY }],
    ['script-like path', { ...valid, paths: [{ d: 'M0 0" onload=alert(1)', fill: '#000' }] }],
    ['external paint', { ...valid, paths: [{ d: 'M0 0 L1 1', fill: 'url(https://bad.test/x)' }] }],
    ['unknown path field', { ...valid, paths: [{ d: 'M0 0', fill: '#000', onclick: 'x' }] }],
  ])('rejects %s', (_label, input) => {
    expect(() => parseSafeVectorDocument(input)).toThrow();
  });

  it('enforces configured path and byte ceilings', () => {
    expect(() => parseSafeVectorDocument(valid, { maxPaths: 1, maxBytes: 1_000 })).toThrow(
      'path count',
    );
    expect(() => parseSafeVectorDocument(valid, { maxPaths: 10, maxBytes: 20 })).toThrow(
      'byte limit',
    );
  });
});
