import { buildDb } from './buildDb';
import type { LoremDB } from './LoremDB';

export { LoremDB } from './LoremDB';

export const db = buildDb();

// Exposed for debugging in dev and for e2e seeding in the e2e build (which sets
// VITE_E2E). Never exposed in a production build, where neither flag is set.
if (import.meta.env.DEV || import.meta.env.VITE_E2E === '1') {
  (window as unknown as { db: LoremDB }).db = db;
}
