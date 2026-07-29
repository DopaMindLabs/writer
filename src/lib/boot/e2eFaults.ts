/**
 * Build-time fault switches for E2E, set only by the `build:e2e` build (gated on
 * `VITE_E2E`). They let a headless Playwright run reach the failure-only surfaces
 * — the CRDT mount-error banner and the cloud key-error/reset screens — that a
 * real failure cannot be provoked for in the browser. In every other build
 * (`VITE_E2E` unset) each reader returns a falsy value, so the checks fold away
 * and nothing here has any effect on production.
 *
 * They target specific ids so the rest of the E2E suite is unaffected: only a doc
 * a fault spec deliberately creates with the configured id trips the fault.
 */

const e2e = import.meta.env.VITE_E2E === '1';

/** A non-empty build-time env string, or `null` — read only in the E2E build. */
const envDocId = (value: unknown): string | null =>
  e2e && typeof value === 'string' && value.length > 0 ? value : null;

/** Doc id whose pre-mount reconciliation is forced to fail (editor stays closed). */
export const crdtMountFailDocId = (): string | null =>
  envDocId(import.meta.env.VITE_E2E_CRDT_FAIL_DOC);

/** Doc id whose route throws a cloud key error, showing the recovery screen. */
export const keyErrorDocId = (): string | null =>
  envDocId(import.meta.env.VITE_E2E_KEY_ERROR_DOC);

/** Whether the device reset is forced to fail (surfacing its retryable error). */
export const resetShouldFail = (): boolean =>
  e2e && import.meta.env.VITE_E2E_RESET_FAIL === '1';
