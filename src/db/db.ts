import { buildDb } from './buildDb';
import type { LoremDB } from './LoremDB';

export { LoremDB } from './LoremDB';

export const db = buildDb();

// Exposed for debugging and for the e2e suite, which reads rows back to assert what
// actually persisted. Gated exactly like the dev/e2e boot affordances, so an
// ordinary production build never carries it.
if (import.meta.env.DEV || import.meta.env.VITE_E2E === '1') {
  (window as unknown as { db: LoremDB }).db = db;
}
