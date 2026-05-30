/**
 * Normalize an unknown thrown/rejected value to a human-readable string.
 * JavaScript allows throwing any value (not just `Error`), so callers that
 * surface a caught error to the UI funnel it through here.
 */
export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);
