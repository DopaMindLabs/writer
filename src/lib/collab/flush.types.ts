/**
 * The result of flushing an editor's pending autosave. Cloud reconciliation needs
 * to know not just *whether* unsaved local edits were written but *which* body was
 * persisted, so it can preserve the just-pulled remote body as a safety revision
 * before the local flush replaces it — the fix for a remote pull silently
 * overwriting local content (or vice versa).
 */
export type FlushResult =
  | { persisted: false }
  | { persisted: true; body: string };

/** The result of a flush that had nothing to persist. */
export const NO_FLUSH: FlushResult = { persisted: false };
