// True when an error is the user dismissing a browser picker dialog. These are
// expected, not failures, so callers swallow them rather than surfacing an error.
export const isAbort = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';
