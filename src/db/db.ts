import { buildDb } from './buildDb';
import type { LoremDB } from './LoremDB';

export { LoremDB } from './LoremDB';

export const db = buildDb();

if (import.meta.env.DEV) {
  (window as unknown as { db: LoremDB }).db = db;
}
