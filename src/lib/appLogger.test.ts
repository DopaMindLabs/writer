import { afterEach, describe, expect, it, vi } from 'vitest';
import { appLogger } from './appLogger';

describe('appLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates info to console.info with the same arguments', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    appLogger.info('sync started', { attempt: 1 });
    expect(spy).toHaveBeenCalledWith('sync started', { attempt: 1 });
  });

  it('delegates warn to console.warn with the same arguments', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    appLogger.warn('key mismatch', { docId: 'doc-1' });
    expect(spy).toHaveBeenCalledWith('key mismatch', { docId: 'doc-1' });
  });

  it('delegates error to console.error with the same arguments', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cause = new Error('boom');
    appLogger.error('reconcile failed', cause);
    expect(spy).toHaveBeenCalledWith('reconcile failed', cause);
  });

  it('is spyable per method so tests can assert without console leakage', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loggerSpy = vi.spyOn(appLogger, 'warn').mockImplementation(() => {});
    appLogger.warn('silenced diagnostic');
    expect(loggerSpy).toHaveBeenCalledWith('silenced diagnostic');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
