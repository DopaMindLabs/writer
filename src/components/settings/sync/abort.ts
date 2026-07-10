export const isAbort = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';
