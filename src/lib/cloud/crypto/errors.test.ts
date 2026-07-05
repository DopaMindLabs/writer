import { describe, it, expect } from 'vitest';
import { EnvelopeIntegrityError } from './envelope';
import { CloudKeyMismatchError, isCloudKeyError } from './errors';

describe('isCloudKeyError', () => {
  it('recognises an EnvelopeIntegrityError', () => {
    expect(isCloudKeyError(new EnvelopeIntegrityError())).toBe(true);
  });

  it('recognises a CloudKeyMismatchError', () => {
    expect(isCloudKeyError(new CloudKeyMismatchError())).toBe(true);
  });

  it('rejects an ordinary error and non-error values', () => {
    expect(isCloudKeyError(new Error('boom'))).toBe(false);
    expect(isCloudKeyError('nope')).toBe(false);
    expect(isCloudKeyError(null)).toBe(false);
    expect(isCloudKeyError(undefined)).toBe(false);
  });

  it('gives CloudKeyMismatchError a stable name for logging', () => {
    expect(new CloudKeyMismatchError().name).toBe('CloudKeyMismatchError');
  });
});
