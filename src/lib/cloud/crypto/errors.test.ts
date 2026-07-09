import { describe, it, expect } from 'vitest';
import { EnvelopeIntegrityError } from './envelope';
import {
  CloudKeyMismatchError,
  CloudKeylessWriteError,
  EscrowMissingError,
  isCloudKeyError,
} from './errors';

describe('isCloudKeyError', () => {
  it('recognises an EnvelopeIntegrityError', () => {
    expect(isCloudKeyError(new EnvelopeIntegrityError())).toBe(true);
  });

  it('recognises a CloudKeyMismatchError', () => {
    expect(isCloudKeyError(new CloudKeyMismatchError())).toBe(true);
  });

  it('recognises a CloudKeylessWriteError (a recoverable write lock)', () => {
    expect(isCloudKeyError(new CloudKeylessWriteError())).toBe(true);
  });

  it('does NOT treat EscrowMissingError as a cloud key error (a flow condition)', () => {
    expect(isCloudKeyError(new EscrowMissingError())).toBe(false);
  });

  it('rejects an ordinary error and non-error values', () => {
    expect(isCloudKeyError(new Error('boom'))).toBe(false);
    expect(isCloudKeyError('nope')).toBe(false);
    expect(isCloudKeyError(null)).toBe(false);
    expect(isCloudKeyError(undefined)).toBe(false);
  });

  it('gives the error classes stable names for logging', () => {
    expect(new CloudKeyMismatchError().name).toBe('CloudKeyMismatchError');
    expect(new CloudKeylessWriteError().name).toBe('CloudKeylessWriteError');
    expect(new EscrowMissingError().name).toBe('EscrowMissingError');
  });
});
